import { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { cards, cardShares, invitations, users } from '../db/schema.js'
import { eq, and, isNull } from 'drizzle-orm'
import { shareCardSchema } from '@memberr/shared'
import { nanoid } from 'nanoid'

export default async function shareRoutes(app: FastifyInstance) {
  app.get('/:cardId/shares', async (request, reply) => {
    const { cardId } = request.params as { cardId: string }
    const [card] = await db
      .select({ ownerId: cards.ownerId })
      .from(cards)
      .where(and(eq(cards.id, cardId), eq(cards.isActive, true)))
      .limit(1)

    if (!card) return reply.code(404).send({ error: 'Not found' })
    if (card.ownerId !== request.userId) return reply.code(403).send({ error: 'Forbidden' })

    return db
      .select({
        id: cardShares.id,
        cardId: cardShares.cardId,
        sharedWith: cardShares.sharedWith,
        grantedBy: cardShares.grantedBy,
        canReshare: cardShares.canReshare,
        expiresAt: cardShares.expiresAt,
        revokedAt: cardShares.revokedAt,
        createdAt: cardShares.createdAt,
        sharedWithUser: {
          id: users.id,
          email: users.email,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(cardShares)
      .innerJoin(users, eq(cardShares.sharedWith, users.id))
      .where(and(eq(cardShares.cardId, cardId), isNull(cardShares.revokedAt)))
  })

  app.post('/:cardId/shares', async (request, reply) => {
    const { cardId } = request.params as { cardId: string }
    const body = shareCardSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const [card] = await db
      .select()
      .from(cards)
      .where(and(eq(cards.id, cardId), eq(cards.isActive, true)))
      .limit(1)

    if (!card) return reply.code(404).send({ error: 'Not found' })
    if (card.ownerId !== request.userId) return reply.code(403).send({ error: 'Forbidden' })

    const [self] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1)

    if (self?.email === body.data.email) {
      return reply.code(400).send({ error: 'Cannot share with yourself' })
    }

    const [inviteeUser] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, body.data.email))
      .limit(1)

    if (inviteeUser) {
      const existing = await db
        .select({ id: cardShares.id, revokedAt: cardShares.revokedAt })
        .from(cardShares)
        .where(and(eq(cardShares.cardId, cardId), eq(cardShares.sharedWith, inviteeUser.id)))
        .limit(1)

      if (existing[0] && !existing[0].revokedAt) {
        return reply.code(409).send({ error: 'Already shared with this user' })
      }

      if (existing[0]?.revokedAt) {
        const expiresAtDate = body.data.expiresAt ? new Date(body.data.expiresAt) : null
        const [share] = await db
          .update(cardShares)
          .set({ revokedAt: null, expiresAt: expiresAtDate })
          .where(eq(cardShares.id, existing[0].id))
          .returning()
        return reply.code(201).send({ type: 'share', share })
      }

      const expiresAtDate = body.data.expiresAt ? new Date(body.data.expiresAt) : null
      const [share] = await db
        .insert(cardShares)
        .values({
          cardId,
          sharedWith: inviteeUser.id,
          grantedBy: request.userId,
          expiresAt: expiresAtDate,
        })
        .returning()

      return reply.code(201).send({ type: 'share', share })
    } else {
      const token = nanoid(32)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      const [invitation] = await db
        .insert(invitations)
        .values({
          cardId,
          invitedBy: request.userId,
          inviteeEmail: body.data.email,
          token,
          expiresAt,
        })
        .returning()

      return reply.code(201).send({ type: 'invitation', invitation })
    }
  })

  app.delete('/:cardId/shares/:shareId', async (request, reply) => {
    const { cardId, shareId } = request.params as { cardId: string; shareId: string }

    const [card] = await db
      .select({ ownerId: cards.ownerId })
      .from(cards)
      .where(and(eq(cards.id, cardId), eq(cards.isActive, true)))
      .limit(1)

    if (!card) return reply.code(404).send({ error: 'Not found' })
    if (card.ownerId !== request.userId) return reply.code(403).send({ error: 'Forbidden' })

    await db
      .update(cardShares)
      .set({ revokedAt: new Date() })
      .where(and(eq(cardShares.id, shareId), eq(cardShares.cardId, cardId)))

    return reply.code(204).send()
  })
}
