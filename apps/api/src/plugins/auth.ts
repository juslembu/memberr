import { FastifyInstance, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { SignJWT, jwtVerify } from 'jose'
import { db } from '../db/client.js'
import { users, refreshTokens } from '../db/schema.js'
import { eq, and, isNull, gt } from 'drizzle-orm'
import { createHash, randomUUID } from 'crypto'
import { config } from '../config.js'

const accessSecret = new TextEncoder().encode(config.JWT_SECRET)
const refreshSecret = new TextEncoder().encode(config.REFRESH_TOKEN_SECRET)

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(accessSecret)
}

export async function signRefreshToken(userId: string, familyId: string): Promise<string> {
  return new SignJWT({ sub: userId, fid: familyId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(refreshSecret)
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

declare module 'fastify' {
  interface FastifyRequest {
    userId: string
  }
}

async function authPlugin(app: FastifyInstance) {
  app.decorateRequest('userId', '')

  app.addHook('onRequest', async (request: FastifyRequest, reply) => {
    const routeConfig = (request.routeOptions?.config ?? {}) as unknown as Record<string, unknown>
    if (routeConfig.public) return

    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    try {
      const token = authHeader.slice(7)
      const { payload } = await jwtVerify(token, accessSecret)
      if (!payload.sub) throw new Error('No subject')
      request.userId = payload.sub
    } catch {
      return reply.code(401).send({ error: 'Invalid or expired token' })
    }
  })
}

export const authRouteHelpers = {
  async issueTokens(
    userId: string,
    deviceLabel: string | undefined,
    familyId?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const fid = familyId ?? randomUUID()
    const accessToken = await signAccessToken(userId)
    const refreshToken = await signRefreshToken(userId, fid)

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await db.insert(refreshTokens).values({
      userId,
      tokenHash: hashToken(refreshToken),
      deviceLabel,
      familyId: fid,
      expiresAt,
    })

    return { accessToken, refreshToken }
  },

  async rotateRefreshToken(
    oldToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; userId: string } | null> {
    const { payload } = await jwtVerify(oldToken, refreshSecret).catch(() => ({ payload: null }))
    if (!payload?.sub || !payload.fid) return null

    const tokenHash = hashToken(oldToken)
    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .limit(1)

    if (!stored) {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.familyId, payload.fid as string))
      return null
    }

    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, stored.id))

    const tokens = await authRouteHelpers.issueTokens(
      stored.userId,
      stored.deviceLabel ?? undefined,
      stored.familyId,
    )
    return { ...tokens, userId: stored.userId }
  },

  async revokeRefreshToken(token: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, hashToken(token)))
  },
}

export default fp(authPlugin)
