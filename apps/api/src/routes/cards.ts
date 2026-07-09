import { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { cards } from '../db/schema.js'
import { eq, and, desc } from 'drizzle-orm'
import { createCardSchema, updateCardSchema } from '@memberr/shared'

export default async function cardRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    return db
      .select()
      .from(cards)
      .where(and(eq(cards.ownerId, request.userId), eq(cards.isActive, true)))
      .orderBy(desc(cards.isPinned), cards.createdAt)
  })

  app.get('/archived', async (request) => {
    return db
      .select()
      .from(cards)
      .where(and(eq(cards.ownerId, request.userId), eq(cards.isActive, false)))
      .orderBy(desc(cards.updatedAt))
  })

  app.post('/', async (request, reply) => {
    const body = createCardSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const { expiresAt, ...rest } = body.data
    const [card] = await db
      .insert(cards)
      .values({
        ...rest,
        ownerId: request.userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning()

    return reply.code(201).send(card)
  })

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const [card] = await db
      .select()
      .from(cards)
      .where(and(eq(cards.id, id), eq(cards.isActive, true)))
      .limit(1)

    if (!card) return reply.code(404).send({ error: 'Not found' })
    if (card.ownerId !== request.userId) return reply.code(403).send({ error: 'Forbidden' })

    return card
  })

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = updateCardSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const [card] = await db
      .select({ ownerId: cards.ownerId })
      .from(cards)
      .where(and(eq(cards.id, id), eq(cards.isActive, true)))
      .limit(1)

    if (!card) return reply.code(404).send({ error: 'Not found' })
    if (card.ownerId !== request.userId) return reply.code(403).send({ error: 'Forbidden' })

    const { expiresAt, ...rest } = body.data
    const [updated] = await db
      .update(cards)
      .set({
        ...rest,
        ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(cards.id, id))
      .returning()

    return updated
  })

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const [card] = await db
      .select({ ownerId: cards.ownerId })
      .from(cards)
      .where(and(eq(cards.id, id), eq(cards.isActive, true)))
      .limit(1)

    if (!card) return reply.code(404).send({ error: 'Not found' })
    if (card.ownerId !== request.userId) return reply.code(403).send({ error: 'Forbidden' })

    await db.update(cards).set({ isActive: false, updatedAt: new Date() }).where(eq(cards.id, id))

    return reply.code(204).send()
  })

  app.post('/:id/archive', async (request, reply) => {
    const { id } = request.params as { id: string }

    const [card] = await db
      .select({ ownerId: cards.ownerId, isActive: cards.isActive })
      .from(cards)
      .where(eq(cards.id, id))
      .limit(1)

    if (!card) return reply.code(404).send({ error: 'Not found' })
    if (card.ownerId !== request.userId) return reply.code(403).send({ error: 'Forbidden' })
    if (!card.isActive) return reply.code(400).send({ error: 'Already archived' })

    await db.update(cards).set({ isActive: false, updatedAt: new Date() }).where(eq(cards.id, id))
    return reply.code(204).send()
  })

  app.post('/:id/unarchive', async (request, reply) => {
    const { id } = request.params as { id: string }

    const [card] = await db
      .select({ ownerId: cards.ownerId, isActive: cards.isActive })
      .from(cards)
      .where(eq(cards.id, id))
      .limit(1)

    if (!card) return reply.code(404).send({ error: 'Not found' })
    if (card.ownerId !== request.userId) return reply.code(403).send({ error: 'Forbidden' })
    if (card.isActive) return reply.code(400).send({ error: 'Not archived' })

    await db.update(cards).set({ isActive: true, updatedAt: new Date() }).where(eq(cards.id, id))
    return reply.code(204).send()
  })
}
