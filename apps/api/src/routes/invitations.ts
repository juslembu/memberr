import { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { invitations, cardShares, cards, users } from '../db/schema.js'
import { eq, and, gt } from 'drizzle-orm'

export default async function invitationRoutes(app: FastifyInstance) {
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

    await db.insert(cardShares).values({
      cardId: invitation.cardId,
      sharedWith: request.userId,
      grantedBy: invitation.invitedBy,
    })

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
