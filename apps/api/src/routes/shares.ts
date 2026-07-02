import { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { cards, cardShares, invitations, users } from '../db/schema.js'
import { eq, and, isNull, gt, or } from 'drizzle-orm'
import { shareCardSchema } from '@memberr/shared'
import { z } from 'zod'
import { nanoid } from 'nanoid'

async function sendPushNotification(pushToken: string, title: string, body: string, data?: Record<string, unknown>) {
  try {
    await fetch('https://exp.host/--/exponent-push-notification-handler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ to: pushToken, title, body, data }),
    })
  } catch {
    // non-fatal
  }
}

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

  // Pending invitations for a card (owner only)
  app.get('/:cardId/invitations', async (request, reply) => {
    const { cardId } = request.params as { cardId: string }
    const [card] = await db
      .select({ ownerId: cards.ownerId })
      .from(cards)
      .where(and(eq(cards.id, cardId), eq(cards.isActive, true)))
      .limit(1)

    if (!card) return reply.code(404).send({ error: 'Not found' })
    if (card.ownerId !== request.userId) return reply.code(403).send({ error: 'Forbidden' })

    return db
      .select()
      .from(invitations)
      .where(and(eq(invitations.cardId, cardId), eq(invitations.status, 'pending'), gt(invitations.expiresAt, new Date())))
      .orderBy(invitations.createdAt)
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

    const { identifier, expiresAt: shareExpiresAtStr } = body.data

    const [self] = await db
      .select({ id: users.id, email: users.email, username: users.username, displayName: users.displayName, pushToken: users.pushToken })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1)

    if (self?.email === identifier || self?.username === identifier) {
      return reply.code(400).send({ error: 'Cannot share with yourself' })
    }

    const [inviteeUser] = await db
      .select({ id: users.id, email: users.email, username: users.username, pushToken: users.pushToken })
      .from(users)
      .where(or(eq(users.email, identifier), eq(users.username, identifier)))
      .limit(1)

    if (!inviteeUser) {
      const isEmail = z.string().email().safeParse(identifier).success
      if (!isEmail) {
        return reply.code(404).send({ error: `No user found with username "${identifier}". Enter their email to send an invitation.` })
      }
    }

    const inviteeEmail = inviteeUser ? inviteeUser.email : identifier

    if (inviteeUser) {
      const existingShare = await db
        .select({ id: cardShares.id })
        .from(cardShares)
        .where(and(
          eq(cardShares.cardId, cardId),
          eq(cardShares.sharedWith, inviteeUser.id),
          isNull(cardShares.revokedAt),
        ))
        .limit(1)

      if (existingShare[0]) {
        return reply.code(409).send({ error: 'Already shared with this user' })
      }
    }

    const pendingInvitation = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(and(
        eq(invitations.cardId, cardId),
        eq(invitations.inviteeEmail, inviteeEmail),
        eq(invitations.status, 'pending'),
        gt(invitations.expiresAt, new Date()),
      ))
      .limit(1)

    if (pendingInvitation[0]) {
      return reply.code(409).send({ error: 'Invitation already sent to this user' })
    }

    const token = nanoid(32)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const shareExpiresAt = shareExpiresAtStr ? new Date(shareExpiresAtStr) : null

    const [invitation] = await db
      .insert(invitations)
      .values({
        cardId,
        invitedBy: request.userId,
        inviteeEmail,
        inviteeUserId: inviteeUser?.id ?? null,
        token,
        expiresAt,
        shareExpiresAt,
      })
      .returning()

    // Send push notification to invitee if they have a token
    if (inviteeUser?.pushToken) {
      const senderName = self?.displayName ?? self?.username ?? 'Someone'
      await sendPushNotification(
        inviteeUser.pushToken,
        `${senderName} shared a card with you`,
        `${card.storeName} membership card — tap to accept`,
        { invitationId: invitation.id },
      )
    }

    return reply.code(201).send({ type: 'invitation', invitation })
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
