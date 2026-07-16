import { describe, it, expect, vi, beforeEach } from 'vitest'
import { jwtVerify } from 'jose'

// Use vi.hoisted so the mock values are available when vi.mock factory runs (vi.mock is hoisted)
const { mockDb, jwtSecret, refreshSecret } = vi.hoisted(() => {
  const jwtSecret = 'test_jwt_secret_at_least_32_chars_long'
  const refreshSecret = 'test_refresh_secret_at_least_32_chars'
  const mockDb = {
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  }
  return { mockDb, jwtSecret, refreshSecret }
})

// Mock the config module before importing auth
vi.mock('../../config.js', () => ({
  config: {
    JWT_SECRET: jwtSecret,
    REFRESH_TOKEN_SECRET: refreshSecret,
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    PORT: 3000,
    NODE_ENV: 'test',
    CORS_ORIGINS: 'http://localhost:8081',
    UPLOAD_DIR: './uploads',
  },
}))

vi.mock('../../db/client.js', () => ({ db: mockDb }))

// Import after mocks are set up
import { signAccessToken, signRefreshToken, hashToken, authRouteHelpers } from '../auth.js'

describe('hashToken', () => {
  it('produces a deterministic SHA-256 hex hash', () => {
    const token = 'my-refresh-token'
    const hash1 = hashToken(token)
    const hash2 = hashToken(token)
    expect(hash1).toBe(hash2)
    expect(hash1).toMatch(/^[a-f0-9]{64}$/)
  })

  it('produces different hashes for different inputs', () => {
    expect(hashToken('token-a')).not.toBe(hashToken('token-b'))
  })

  it('produces different hashes for similar inputs', () => {
    expect(hashToken('token')).not.toBe(hashToken('token1'))
  })
})

describe('signAccessToken', () => {
  it('produces a valid JWT with the correct subject', async () => {
    const token = await signAccessToken('user-123')
    expect(token).toBeTruthy()

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(jwtSecret),
    )
    expect(payload.sub).toBe('user-123')
    expect(payload.exp).toBeDefined()
    expect(payload.iat).toBeDefined()
  })
})

describe('signRefreshToken', () => {
  it('produces a valid JWT with subject and family ID', async () => {
    const token = await signRefreshToken('user-123', 'family-abc')
    expect(token).toBeTruthy()

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(refreshSecret),
    )
    expect(payload.sub).toBe('user-123')
    expect(payload.fid).toBe('family-abc')
    expect(payload.exp).toBeDefined()
  })
})

describe('authRouteHelpers.issueTokens', () => {
  beforeEach(() => {
    mockDb.insert.mockReturnValue({
      values: vi.fn(() => Promise.resolve()),
    })
  })

  it('issues an access token and a refresh token', async () => {
    const result = await authRouteHelpers.issueTokens('user-123', 'Chrome/Mac')

    expect(result.accessToken).toBeTruthy()
    expect(result.refreshToken).toBeTruthy()

    // Verify the access token
    const accessPayload = await jwtVerify(
      result.accessToken,
      new TextEncoder().encode(jwtSecret),
    )
    expect(accessPayload.payload.sub).toBe('user-123')

    // Verify the refresh token
    const refreshPayload = await jwtVerify(
      result.refreshToken,
      new TextEncoder().encode(refreshSecret),
    )
    expect(refreshPayload.payload.sub).toBe('user-123')
    expect(refreshPayload.payload.fid).toBeDefined()
  })

  it('generates a new familyId when none provided', async () => {
    const result = await authRouteHelpers.issueTokens('user-123', 'Chrome/Mac')
    const refreshPayload = await jwtVerify(
      result.refreshToken,
      new TextEncoder().encode(refreshSecret),
    )
    expect(refreshPayload.payload.fid).toBeDefined()
    expect(typeof refreshPayload.payload.fid).toBe('string')
    expect(refreshPayload.payload.fid!.length).toBeGreaterThan(0)
  })

  it('uses provided familyId', async () => {
    const result = await authRouteHelpers.issueTokens('user-123', 'Chrome/Mac', 'my-family-id')
    const refreshPayload = await jwtVerify(
      result.refreshToken,
      new TextEncoder().encode(refreshSecret),
    )
    expect(refreshPayload.payload.fid).toBe('my-family-id')
  })

  it('stores the hashed token in the database', async () => {
    const valuesSpy = vi.fn(() => Promise.resolve())
    mockDb.insert.mockReturnValueOnce({ values: valuesSpy })

    const result = await authRouteHelpers.issueTokens('user-123', 'Chrome/Mac')

    expect(valuesSpy).toHaveBeenCalledTimes(1)
    const insertArgs = valuesSpy.mock.calls[0][0]
    expect(insertArgs.tokenHash).toBe(hashToken(result.refreshToken))
    expect(insertArgs.userId).toBe('user-123')
  })
})

describe('authRouteHelpers.rotateRefreshToken', () => {
  it('returns null for an invalid JWT', async () => {
    const result = await authRouteHelpers.rotateRefreshToken('not-a-jwt')
    expect(result).toBeNull()
  })

  it('returns null and revokes family when stored token is not found (reuse detection)', async () => {
    // First, issue a real token (mock the insert)
    mockDb.insert.mockReturnValueOnce({
      values: vi.fn(() => Promise.resolve()),
    })
    const { refreshToken } = await authRouteHelpers.issueTokens('user-123', 'Chrome/Mac')

    // Mock the select to return empty (token already revoked or not found)
    mockDb.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })
    mockDb.update.mockClear()

    const result = await authRouteHelpers.rotateRefreshToken(refreshToken)

    expect(result).toBeNull()
    // Should revoke the entire family
    expect(mockDb.update).toHaveBeenCalledTimes(1)
  })

  it('rotates successfully when a valid stored token is found', async () => {
    mockDb.insert.mockReturnValueOnce({
      values: vi.fn(() => Promise.resolve()),
    })
    const { refreshToken } = await authRouteHelpers.issueTokens('user-123', 'Chrome/Mac')

    // Mock select to return a stored token
    const storedToken = {
      id: 'rt-id',
      userId: 'user-123',
      deviceLabel: 'Chrome/Mac',
      familyId: 'family-abc',
      tokenHash: hashToken(refreshToken),
    }
    mockDb.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([storedToken])),
        })),
      })),
    })

    // Mock insert for the new token issued during rotation
    mockDb.insert.mockReturnValueOnce({
      values: vi.fn(() => Promise.resolve()),
    })

    const result = await authRouteHelpers.rotateRefreshToken(refreshToken)

    expect(result).not.toBeNull()
    expect(result!.userId).toBe('user-123')
    expect(result!.accessToken).toBeTruthy()
    expect(result!.refreshToken).toBeTruthy()
    expect(result!.refreshToken).not.toBe(refreshToken) // new token
  })
})

describe('authRouteHelpers.revokeRefreshToken', () => {
  it('updates the token hash to revoked', async () => {
    const token = 'some-refresh-token'
    mockDb.update.mockClear()

    await authRouteHelpers.revokeRefreshToken(token)

    expect(mockDb.update).toHaveBeenCalledTimes(1)
    // The update should use hashToken(token) to find the right row
    // We can't easily check the where clause in this mock setup,
    // but we verify it was called
  })
})
