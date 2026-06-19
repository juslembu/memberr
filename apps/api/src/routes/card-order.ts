import { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { cardOrder } from '../db/schema.js'
import { eq } from 'drizzle-orm'

export default async function cardOrderRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const rows = await db
      .select({ cardId: cardOrder.cardId, sortOrder: cardOrder.sortOrder })
      .from(cardOrder)
      .where(eq(cardOrder.userId, request.userId))

    const map: Record<string, number> = {}
    for (const row of rows) map[row.cardId] = row.sortOrder
    return map
  })

  app.put('/', async (request, reply) => {
    const { cardIds } = request.body as { cardIds?: unknown }
    if (!Array.isArray(cardIds) || !cardIds.every((id) => typeof id === 'string')) {
      return reply.code(400).send({ error: 'cardIds must be an array of strings' })
    }

    await db.transaction(async (tx) => {
      await tx.delete(cardOrder).where(eq(cardOrder.userId, request.userId))
      if (cardIds.length > 0) {
        await tx.insert(cardOrder).values(
          cardIds.map((cardId, index) => ({
            userId: request.userId,
            cardId,
            sortOrder: index,
          })),
        )
      }
    })

    return { ok: true }
  })
}
