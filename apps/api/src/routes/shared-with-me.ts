import { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { cards, cardShares, users } from '../db/schema.js'
import { eq, and, isNull, or, gt, sql } from 'drizzle-orm'

export default async function sharedWithMeRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const now = new Date()
    return db
      .select({
        shareId: cardShares.id,
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
      .where(
        and(
          eq(cardShares.sharedWith, request.userId),
          isNull(cardShares.revokedAt),
          or(isNull(cardShares.expiresAt), gt(cardShares.expiresAt, now)),
        ),
      )
  })

  app.get('/:shareId', async (request, reply) => {
    const { shareId } = request.params as { shareId: string }
    const now = new Date()

    const [row] = await db
      .select({
        shareId: cardShares.id,
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
}
