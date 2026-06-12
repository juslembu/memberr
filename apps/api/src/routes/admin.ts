import { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { users, predefinedShops } from '../db/schema.js'
import { eq, ne, asc } from 'drizzle-orm'
import { createShopSchema } from '@memberr/shared'

export default async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (request, reply) => {
    const [user] = await db
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1)
    if (!user?.isAdmin) return reply.code(403).send({ error: 'Forbidden' })
  })

  // Users
  app.get('/users', async () => {
    return db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.createdAt))
  })

  app.delete('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    if (id === request.userId) {
      return reply.code(400).send({ error: 'Cannot delete your own account' })
    }
    const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1)
    if (!target) return reply.code(404).send({ error: 'User not found' })
    await db.delete(users).where(eq(users.id, id))
    return { ok: true }
  })

  // Shops
  app.get('/shops', async () => {
    return db.select().from(predefinedShops).orderBy(asc(predefinedShops.name))
  })

  app.post('/shops', async (request, reply) => {
    const body = createShopSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })
    const [shop] = await db.insert(predefinedShops).values(body.data).returning()
    return reply.code(201).send(shop)
  })

  app.patch('/shops/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = createShopSchema.partial().safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })
    const [shop] = await db
      .update(predefinedShops)
      .set(body.data)
      .where(eq(predefinedShops.id, id))
      .returning()
    if (!shop) return reply.code(404).send({ error: 'Shop not found' })
    return shop
  })

  app.delete('/shops/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const [shop] = await db
      .delete(predefinedShops)
      .where(eq(predefinedShops.id, id))
      .returning({ id: predefinedShops.id })
    if (!shop) return reply.code(404).send({ error: 'Shop not found' })
    return { ok: true }
  })
}
