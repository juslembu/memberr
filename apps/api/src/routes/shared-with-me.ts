import { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { cards, cardShares, cardSharePins, users } from '../db/schema.js'
import { eq, and, isNull, or, gt, sql } from 'drizzle-orm'

export default async function sharedWithMeRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const now = new Date()
    return db
      .select({
        shareId: cardShares.id,
        isPinned: sql<boolean>`(${cardSharePins.shareId} IS NOT NULL)`,
        sharedAt: cardShares.createdAt,
        expiresAt: cardShares.expiresAt,
        card: {
          id: cards.id,
          ownerId: cards.ownerId,
          storeName: cards.storeName,
          cardNumber: cards.cardNumber,
          barcodeType: cards.barcodeType,
          notes: cards.notes,
          color: cards.color,
          logoUrl: cards.logoUrl,
          cardImageUrl: cards.cardImageUrl,
          isPinned: sql<boolean>`false`,
          expiresAt: cards.expiresAt,
          isActive: cards.isActive,
          createdAt: cards.createdAt,
          updatedAt: cards.updatedAt,
        },
        grantedBy: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(cardShares)
      .innerJoin(cards, and(eq(cardShares.cardId, cards.id), eq(cards.isActive, true)))
      .innerJoin(users, eq(cardShares.grantedBy, users.id))
      .leftJoin(
        cardSharePins,
        and(eq(cardSharePins.shareId, cardShares.id), eq(cardSharePins.userId, request.userId)),
      )
      .where(
        and(
          eq(cardShares.sharedWith, request.userId),
          isNull(cardShares.revokedAt),
          or(isNull(cardShares.expiresAt), gt(cardShares.expiresAt, now)),
        ),
      )
      .orderBy(sql`(${cardSharePins.shareId} IS NOT NULL) DESC`, cardShares.createdAt)
  })

  app.get('/:shareId', async (request, reply) => {
    const { shareId } = request.params as { shareId: string }
    const now = new Date()

    const [row] = await db
      .select({
        shareId: cardShares.id,
        isPinned: sql<boolean>`(${cardSharePins.shareId} IS NOT NULL)`,
        sharedAt: cardShares.createdAt,
        expiresAt: cardShares.expiresAt,
        card: {
          id: cards.id,
          ownerId: cards.ownerId,
          storeName: cards.storeName,
          cardNumber: cards.cardNumber,
          barcodeType: cards.barcodeType,
          notes: cards.notes,
          color: cards.color,
          logoUrl: cards.logoUrl,
          cardImageUrl: cards.cardImageUrl,
          isPinned: sql<boolean>`false`,
          expiresAt: cards.expiresAt,
          isActive: cards.isActive,
          createdAt: cards.createdAt,
          updatedAt: cards.updatedAt,
        },
        grantedBy: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(cardShares)
      .innerJoin(cards, eq(cardShares.cardId, cards.id))
      .innerJoin(users, eq(cardShares.grantedBy, users.id))
      .leftJoin(
        cardSharePins,
        and(eq(cardSharePins.shareId, cardShares.id), eq(cardSharePins.userId, request.userId)),
      )
      .where(
        and(
          eq(cardShares.id, shareId),
          eq(cardShares.sharedWith, request.userId),
          isNull(cardShares.revokedAt),
          or(isNull(cardShares.expiresAt), gt(cardShares.expiresAt, now)),
        ),
      )
      .limit(1)

    if (!row) return reply.code(404).send({ error: 'Not found' })

    return row
  })

  app.post('/:shareId/pin', async (request, reply) => {
    const { shareId } = request.params as { shareId: string }

    const [share] = await db
      .select({ id: cardShares.id })
      .from(cardShares)
      .where(
        and(
          eq(cardShares.id, shareId),
          eq(cardShares.sharedWith, request.userId),
          isNull(cardShares.revokedAt),
        ),
      )
      .limit(1)

    if (!share) return reply.code(404).send({ error: 'Not found' })

    const [existing] = await db
      .select({ shareId: cardSharePins.shareId })
      .from(cardSharePins)
      .where(and(eq(cardSharePins.shareId, shareId), eq(cardSharePins.userId, request.userId)))
      .limit(1)

    if (existing) {
      await db
        .delete(cardSharePins)
        .where(and(eq(cardSharePins.shareId, shareId), eq(cardSharePins.userId, request.userId)))
      return { isPinned: false }
    } else {
      await db.insert(cardSharePins).values({ userId: request.userId, shareId })
      return { isPinned: true }
    }
  })
}
