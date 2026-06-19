import { FastifyInstance } from 'fastify'
import { randomBytes } from 'crypto'
import { db } from '../db/client.js'
import { cards, publicShares } from '../db/schema.js'
import { eq, and, isNull, gt, desc } from 'drizzle-orm'
import { createPublicShareSchema } from '@memberr/shared'

export default async function publicShareRoutes(app: FastifyInstance) {
  // Public: anyone with the token can view the card (no auth required)
  app.get('/public/token/:token', { config: { public: true } }, async (request, reply) => {
    const { token } = request.params as { token: string }
    const now = new Date()

    const [row] = await db
      .select({
        shareLabel: publicShares.label,
        shareExpiresAt: publicShares.expiresAt,
        storeName: cards.storeName,
        cardNumber: cards.cardNumber,
        barcodeType: cards.barcodeType,
        color: cards.color,
        logoUrl: cards.logoUrl,
      })
      .from(publicShares)
      .innerJoin(cards, and(eq(publicShares.cardId, cards.id), eq(cards.isActive, true)))
      .where(
        and(
          eq(publicShares.token, token),
          isNull(publicShares.revokedAt),
          gt(publicShares.expiresAt, now),
        ),
      )
      .limit(1)

    if (!row) return reply.code(404).send({ error: 'This link is invalid or has expired' })
    return row
  })

  // List active public share links for a card (owner only)
  app.get('/cards/:cardId/public-shares', async (request, reply) => {
    const { cardId } = request.params as { cardId: string }
    const now = new Date()

    const [card] = await db
      .select({ ownerId: cards.ownerId })
      .from(cards)
      .where(eq(cards.id, cardId))
      .limit(1)

    if (!card) return reply.code(404).send({ error: 'Not found' })
    if (card.ownerId !== request.userId) return reply.code(403).send({ error: 'Forbidden' })

    return db
      .select()
      .from(publicShares)
      .where(
        and(
          eq(publicShares.cardId, cardId),
          isNull(publicShares.revokedAt),
          gt(publicShares.expiresAt, now),
        ),
      )
      .orderBy(desc(publicShares.createdAt))
  })

  // Create a public share link (owner only)
  app.post('/cards/:cardId/public-shares', async (request, reply) => {
    const { cardId } = request.params as { cardId: string }

    const [card] = await db
      .select({ ownerId: cards.ownerId })
      .from(cards)
      .where(eq(cards.id, cardId))
      .limit(1)

    if (!card) return reply.code(404).send({ error: 'Not found' })
    if (card.ownerId !== request.userId) return reply.code(403).send({ error: 'Forbidden' })

    const body = createPublicShareSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid input' })

    const token = randomBytes(32).toString('hex')

    const [share] = await db
      .insert(publicShares)
      .values({
        cardId,
        ownerId: request.userId,
        token,
        label: body.data.label ?? null,
        expiresAt: new Date(body.data.expiresAt),
      })
      .returning()

    return reply.code(201).send(share)
  })

  // Revoke a public share link (owner only)
  app.delete('/cards/:cardId/public-shares/:shareId', async (request, reply) => {
    const { shareId } = request.params as { cardId: string; shareId: string }

    const [share] = await db
      .select({ ownerId: publicShares.ownerId })
      .from(publicShares)
      .where(eq(publicShares.id, shareId))
      .limit(1)

    if (!share) return reply.code(404).send({ error: 'Not found' })
    if (share.ownerId !== request.userId) return reply.code(403).send({ error: 'Forbidden' })

    await db.update(publicShares).set({ revokedAt: new Date() }).where(eq(publicShares.id, shareId))
    return reply.code(204).send()
  })
}
