import { FastifyInstance } from 'fastify'
import { randomBytes } from 'crypto'
import * as argon2 from 'argon2'
import { db } from '../db/client.js'
import { users, predefinedShops, serverSettings, cards } from '../db/schema.js'
import { eq, ne, asc, count } from 'drizzle-orm'
import { createShopSchema, adminResetPasswordSchema } from '@memberr/shared'
import { setSetting } from '../lib/settings.js'

const TEMP_PASSWORD_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

function generateTempPassword(length = 12): string {
  const bytes = randomBytes(length)
  return Array.from(bytes, (b) => TEMP_PASSWORD_CHARSET[b % TEMP_PASSWORD_CHARSET.length]).join('')
}

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

  app.post('/users/:id/reset-password', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = adminResetPasswordSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1)
    if (!target) return reply.code(404).send({ error: 'User not found' })

    const newPassword = body.data.newPassword ?? generateTempPassword()
    const passwordHash = await argon2.hash(newPassword)
    await db
      .update(users)
      .set({ passwordHash, mustChangePassword: true, updatedAt: new Date() })
      .where(eq(users.id, id))

    return { ok: true, temporaryPassword: newPassword }
  })

  app.delete('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    if (id === request.userId) {
      return reply.code(400).send({ error: 'Cannot delete your own account' })
    }
    const [target] = await db
      .select({ id: users.id, isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
    if (!target) return reply.code(404).send({ error: 'User not found' })

    if (target.isAdmin) {
      const [{ adminCount }] = await db
        .select({ adminCount: count() })
        .from(users)
        .where(eq(users.isAdmin, true))
      if (adminCount <= 1) {
        return reply.code(400).send({ error: 'Cannot delete the last admin account' })
      }
    }

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

    const [shop] = await db.select({ name: predefinedShops.name }).from(predefinedShops).where(eq(predefinedShops.id, id)).limit(1)
    if (!shop) return reply.code(404).send({ error: 'Shop not found' })

    const [{ value: cardCount }] = await db
      .select({ value: count() })
      .from(cards)
      .where(eq(cards.storeName, shop.name))

    if (cardCount > 0) {
      return reply.code(400).send({
        error: `Cannot delete: ${cardCount} card${cardCount === 1 ? '' : 's'} ${cardCount === 1 ? 'is' : 'are'} using this shop.`,
      })
    }

    await db.delete(predefinedShops).where(eq(predefinedShops.id, id))
    return { ok: true }
  })

  // Server settings
  app.get('/settings', async () => {
    const rows = await db.select().from(serverSettings)
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  })

  app.patch('/settings', async (request) => {
    const body = request.body as Record<string, string>
    for (const [key, value] of Object.entries(body)) {
      await setSetting(key, String(value))
    }
    return { ok: true }
  })
}
