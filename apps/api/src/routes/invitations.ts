import { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { invitations, cardShares, cards, users } from '../db/schema.js'
import { eq, and, gt } from 'drizzle-orm'

async function grantShare(cardId: string, sharedWith: string, grantedBy: string, shareExpiresAt?: Date | null) {
  const [existing] = await db
    .select({ id: cardShares.id, revokedAt: cardShares.revokedAt })
    .from(cardShares)
    .where(and(eq(cardShares.cardId, cardId), eq(cardShares.sharedWith, sharedWith)))
    .limit(1)

  if (!existing) {
    await db.insert(cardShares).values({ cardId, sharedWith, grantedBy, expiresAt: shareExpiresAt ?? null })
  } else if (existing.revokedAt) {
    await db.update(cardShares).set({ revokedAt: null, grantedBy, expiresAt: shareExpiresAt ?? null }).where(eq(cardShares.id, existing.id))
  }
  // already active share — no action needed
}

export default async function invitationRoutes(app: FastifyInstance) {
  // Public endpoint — anyone can view invite details before accepting
  app.get('/token/:token', { config: { public: true } }, async (request, reply) => {
    const { token } = request.params as { token: string }
    const [row] = await db
      .select({
        id: invitations.id,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        inviteeEmail: invitations.inviteeEmail,
        card: {
          id: cards.id,
          storeName: cards.storeName,
          color: cards.color,
          logoUrl: cards.logoUrl,
          barcodeType: cards.barcodeType,
        },
        invitedByUser: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
        },
      })
      .from(invitations)
      .innerJoin(cards, eq(invitations.cardId, cards.id))
      .innerJoin(users, eq(invitations.invitedBy, users.id))
      .where(eq(invitations.token, token))
      .limit(1)

    if (!row) return reply.code(404).send({ error: 'Invitation not found' })
    return row
  })

  app.get('/incoming', async (request) => {
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1)

    return db
      .select({
        id: invitations.id,
        cardId: invitations.cardId,
        invitedBy: invitations.invitedBy,
        inviteeEmail: invitations.inviteeEmail,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
        card: {
          id: cards.id,
          storeName: cards.storeName,
          barcodeType: cards.barcodeType,
          color: cards.color,
          logoUrl: cards.logoUrl,
        },
        invitedByUser: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(invitations)
      .innerJoin(cards, eq(invitations.cardId, cards.id))
      .innerJoin(users, eq(invitations.invitedBy, users.id))
      .where(
        and(
          eq(invitations.inviteeEmail, user.email),
          eq(invitations.status, 'pending'),
          gt(invitations.expiresAt, new Date()),
        ),
      )
  })

  app.get('/outgoing', async (request) => {
    return db
      .select({
        id: invitations.id,
        cardId: invitations.cardId,
        inviteeEmail: invitations.inviteeEmail,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
        card: {
          id: cards.id,
          storeName: cards.storeName,
          color: cards.color,
        },
      })
      .from(invitations)
      .innerJoin(cards, eq(invitations.cardId, cards.id))
      .where(eq(invitations.invitedBy, request.userId))
      .orderBy(invitations.createdAt)
  })

  app.post('/token/:token/accept', async (request, reply) => {
    const { token } = request.params as { token: string }

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.token, token),
          eq(invitations.status, 'pending'),
          gt(invitations.expiresAt, new Date()),
        ),
      )
      .limit(1)

    if (!invitation) return reply.code(404).send({ error: 'Invitation not found or expired' })

    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1)

    if (user.email !== invitation.inviteeEmail) {
      return reply.code(403).send({ error: 'This invitation was sent to a different email address' })
    }

    await grantShare(invitation.cardId, request.userId, invitation.invitedBy, invitation.shareExpiresAt ?? null)

    await db
      .update(invitations)
      .set({ status: 'accepted', inviteeUserId: request.userId, respondedAt: new Date() })
      .where(eq(invitations.id, invitation.id))

    return { ok: true }
  })

  app.post('/token/:token/decline', async (request, reply) => {
    const { token } = request.params as { token: string }

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.token, token), eq(invitations.status, 'pending')))
      .limit(1)

    if (!invitation) return reply.code(404).send({ error: 'Invitation not found' })

    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1)

    if (user.email !== invitation.inviteeEmail) {
      return reply.code(403).send({ error: 'Forbidden' })
    }

    await db
      .update(invitations)
      .set({ status: 'declined', inviteeUserId: request.userId, respondedAt: new Date() })
      .where(eq(invitations.id, invitation.id))

    return { ok: true }
  })

  app.post('/:id/accept', async (request, reply) => {
    const { id } = request.params as { id: string }

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(and(
        eq(invitations.id, id),
        eq(invitations.status, 'pending'),
        gt(invitations.expiresAt, new Date()),
      ))
      .limit(1)

    if (!invitation) return reply.code(404).send({ error: 'Invitation not found or expired' })

    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1)

    if (user.email !== invitation.inviteeEmail) {
      return reply.code(403).send({ error: 'This invitation was sent to a different email address' })
    }

    await grantShare(invitation.cardId, request.userId, invitation.invitedBy, invitation.shareExpiresAt ?? null)

    await db
      .update(invitations)
      .set({ status: 'accepted', inviteeUserId: request.userId, respondedAt: new Date() })
      .where(eq(invitations.id, id))

    return { ok: true }
  })

  app.post('/:id/decline', async (request, reply) => {
    const { id } = request.params as { id: string }

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.id, id), eq(invitations.status, 'pending')))
      .limit(1)

    if (!invitation) return reply.code(404).send({ error: 'Invitation not found' })

    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1)

    if (user.email !== invitation.inviteeEmail) {
      return reply.code(403).send({ error: 'Forbidden' })
    }

    await db
      .update(invitations)
      .set({ status: 'declined', inviteeUserId: request.userId, respondedAt: new Date() })
      .where(eq(invitations.id, id))

    return { ok: true }
  })

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const [invitation] = await db
      .select({ invitedBy: invitations.invitedBy })
      .from(invitations)
      .where(eq(invitations.id, id))
      .limit(1)

    if (!invitation) return reply.code(404).send({ error: 'Not found' })
    if (invitation.invitedBy !== request.userId) return reply.code(403).send({ error: 'Forbidden' })

    await db
      .update(invitations)
      .set({ status: 'expired', respondedAt: new Date() })
      .where(eq(invitations.id, id))

    return reply.code(204).send()
  })
}
