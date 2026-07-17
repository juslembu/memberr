import { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { cards } from '../db/schema.js'
import { eq, and, desc } from 'drizzle-orm'
import { createCardSchema, updateCardSchema } from '@memberr/shared'

// Columns returned by list endpoints. Excludes cardImageUrl because it stores
// a base64 JPEG that can be large; the detail endpoint returns the full card.
const CARD_LIST_COLUMNS = {
  id: cards.id,
  ownerId: cards.ownerId,
  storeName: cards.storeName,
  cardNumber: cards.cardNumber,
  barcodeType: cards.barcodeType,
  notes: cards.notes,
  color: cards.color,
  logoUrl: cards.logoUrl,
  isPinned: cards.isPinned,
  expiresAt: cards.expiresAt,
  isActive: cards.isActive,
  createdAt: cards.createdAt,
  updatedAt: cards.updatedAt,
}

export default async function cardRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    return db
      .select(CARD_LIST_COLUMNS)
      .from(cards)
      .where(and(eq(cards.ownerId, request.userId), eq(cards.isActive, true)))
      .orderBy(desc(cards.isPinned), cards.createdAt)
  })

  app.get('/archived', async (request) => {
    return db
      .select(CARD_LIST_COLUMNS)
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
      .where(eq(cards.id, id))
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
