import { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { users } from '../db/schema.js'
import { eq, or } from 'drizzle-orm'
import * as argon2 from 'argon2'
import { registerSchema, loginSchema, changePasswordSchema } from '@memberr/shared'
import { authRouteHelpers } from '../plugins/auth.js'

const REFRESH_COOKIE = 'memberr_refresh'

const USER_FIELDS = {
  id: users.id,
  email: users.email,
  username: users.username,
  displayName: users.displayName,
  avatarUrl: users.avatarUrl,
  isAdmin: users.isAdmin,
  mustChangePassword: users.mustChangePassword,
  createdAt: users.createdAt,
} as const

export default async function authRoutes(app: FastifyInstance) {
  app.post(
    '/register',
    { config: { public: true } },
    async (request, reply) => {
      const body = registerSchema.safeParse(request.body)
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

      const { email, username, password, displayName } = body.data

      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1)

      if (existing) return reply.code(409).send({ error: 'Email already registered' })

      const [existingUsername] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, username))
        .limit(1)

      if (existingUsername) return reply.code(409).send({ error: 'Username already taken' })

      const passwordHash = await argon2.hash(password)
      const [user] = await db
        .insert(users)
        .values({ email, username, passwordHash, displayName: displayName ?? null })
        .returning(USER_FIELDS)

      const { accessToken, refreshToken } = await authRouteHelpers.issueTokens(
        user.id,
        request.headers['user-agent'],
      )

      reply.setCookie(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
        maxAge: 30 * 24 * 60 * 60,
      })

      return reply.code(201).send({ user, accessToken })
    },
  )

  app.post(
    '/login',
    { config: { public: true } },
    async (request, reply) => {
      const body = loginSchema.safeParse(request.body)
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

      const { identifier, password } = body.data
      const [user] = await db
        .select()
        .from(users)
        .where(or(eq(users.email, identifier), eq(users.username, identifier)))
        .limit(1)

      if (!user || !(await argon2.verify(user.passwordHash, password))) {
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      const { accessToken, refreshToken } = await authRouteHelpers.issueTokens(
        user.id,
        request.headers['user-agent'],
      )

      reply.setCookie(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
        maxAge: 30 * 24 * 60 * 60,
      })

      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          isAdmin: user.isAdmin,
          mustChangePassword: user.mustChangePassword,
          createdAt: user.createdAt,
        },
      }
    },
  )

  app.post(
    '/refresh',
    { config: { public: true } },
    async (request, reply) => {
      const oldToken = request.cookies[REFRESH_COOKIE]
      if (!oldToken) return reply.code(401).send({ error: 'No refresh token' })

      const result = await authRouteHelpers.rotateRefreshToken(oldToken)
      if (!result) {
        reply.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' })
        return reply.code(401).send({ error: 'Invalid or expired refresh token' })
      }

      reply.setCookie(REFRESH_COOKIE, result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
        maxAge: 30 * 24 * 60 * 60,
      })

      return { accessToken: result.accessToken }
    },
  )

  app.post('/logout', async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE]
    if (token) await authRouteHelpers.revokeRefreshToken(token)
    reply.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' })
    return { ok: true }
  })

  app.get('/me', async (request) => {
    const [user] = await db
      .select(USER_FIELDS)
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1)
    return user
  })

  app.post('/change-password', async (request, reply) => {
    const body = changePasswordSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const { currentPassword, newPassword } = body.data

    const [user] = await db.select().from(users).where(eq(users.id, request.userId)).limit(1)
    if (!user || !(await argon2.verify(user.passwordHash, currentPassword))) {
      return reply.code(401).send({ error: 'Current password is incorrect' })
    }

    const passwordHash = await argon2.hash(newPassword)
    await db
      .update(users)
      .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
      .where(eq(users.id, request.userId))

    return { ok: true }
  })
}
