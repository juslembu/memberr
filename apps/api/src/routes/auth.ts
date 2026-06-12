import { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import * as argon2 from 'argon2'
import { registerSchema, loginSchema } from '@memberr/shared'
import { authRouteHelpers } from '../plugins/auth.js'

const REFRESH_COOKIE = 'memberr_refresh'

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
        .returning({
          id: users.id,
          email: users.email,
          username: users.username,
          displayName: users.displayName,
          createdAt: users.createdAt,
        })

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

      const { email, password } = body.data
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
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
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1)

    return user
  })
}
