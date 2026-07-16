import { describe, it, expect } from 'vitest'
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  createShopSchema,
  createCardSchema,
  updateCardSchema,
  shareCardSchema,
  createPublicShareSchema,
  adminResetPasswordSchema,
  updateProfileSchema,
} from '../index.js'

describe('registerSchema', () => {
  const valid = {
    email: 'test@example.com',
    username: 'alice',
    password: 'securepass123',
  }

  it('accepts valid input', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts optional displayName', () => {
    expect(registerSchema.safeParse({ ...valid, displayName: 'Alice' }).success).toBe(true)
  })

  it('rejects invalid email', () => {
    expect(registerSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false)
  })

  it('rejects short username (<3)', () => {
    expect(registerSchema.safeParse({ ...valid, username: 'ab' }).success).toBe(false)
  })

  it('rejects long username (>30)', () => {
    expect(registerSchema.safeParse({ ...valid, username: 'a'.repeat(31) }).success).toBe(false)
  })

  it('rejects username with special chars', () => {
    expect(registerSchema.safeParse({ ...valid, username: 'alice!' }).success).toBe(false)
  })

  it('allows underscores and hyphens in username', () => {
    expect(registerSchema.safeParse({ ...valid, username: 'alice-bob_123' }).success).toBe(true)
  })

  it('rejects short password (<8)', () => {
    expect(registerSchema.safeParse({ ...valid, password: '1234567' }).success).toBe(false)
  })

  it('rejects missing fields', () => {
    expect(registerSchema.safeParse({}).success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('accepts valid identifier and password', () => {
    expect(loginSchema.safeParse({ identifier: 'alice', password: 'secret123' }).success).toBe(true)
  })

  it('rejects empty identifier', () => {
    expect(loginSchema.safeParse({ identifier: '', password: 'secret123' }).success).toBe(false)
  })

  it('rejects empty password', () => {
    expect(loginSchema.safeParse({ identifier: 'alice', password: '' }).success).toBe(false)
  })

  it('rejects missing fields', () => {
    expect(loginSchema.safeParse({}).success).toBe(false)
  })
})

describe('changePasswordSchema', () => {
  it('accepts valid passwords', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'old12345', newPassword: 'new12345' }).success).toBe(true)
  })

  it('rejects short new password', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'old12345', newPassword: '1234567' }).success).toBe(false)
  })

  it('rejects empty current password', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: '', newPassword: 'new12345' }).success).toBe(false)
  })
})

describe('createShopSchema', () => {
  it('accepts valid shop with default color', () => {
    const result = createShopSchema.safeParse({ name: 'Coffee Shop' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.color).toBe('#0EA5E9')
  })

  it('accepts custom color', () => {
    expect(createShopSchema.safeParse({ name: 'Cafe', color: '#FF5733' }).success).toBe(true)
  })

  it('rejects invalid color hex', () => {
    expect(createShopSchema.safeParse({ name: 'Cafe', color: 'red' }).success).toBe(false)
  })

  it('rejects short color (5 chars)', () => {
    expect(createShopSchema.safeParse({ name: 'Cafe', color: '#FF57' }).success).toBe(false)
  })

  it('rejects empty name', () => {
    expect(createShopSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('accepts nullable logoUrl', () => {
    expect(createShopSchema.safeParse({ name: 'Cafe', logoUrl: null }).success).toBe(true)
  })
})

describe('createCardSchema', () => {
  const valid = {
    storeName: 'Starbucks',
    cardNumber: '1234567890',
    barcodeType: 'CODE128',
  }

  it('accepts valid card', () => {
    expect(createCardSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts all barcode types', () => {
    const types = ['CODE128', 'EAN13', 'EAN8', 'UPC', 'QR_CODE', 'PDF417', 'AZTEC', 'DATA_MATRIX', 'CODABAR', 'CODE39']
    for (const type of types) {
      expect(createCardSchema.safeParse({ ...valid, barcodeType: type }).success).toBe(true)
    }
  })

  it('rejects invalid barcode type', () => {
    expect(createCardSchema.safeParse({ ...valid, barcodeType: 'INVALID' }).success).toBe(false)
  })

  it('rejects empty storeName', () => {
    expect(createCardSchema.safeParse({ ...valid, storeName: '' }).success).toBe(false)
  })

  it('rejects empty cardNumber', () => {
    expect(createCardSchema.safeParse({ ...valid, cardNumber: '' }).success).toBe(false)
  })

  it('accepts optional color with valid hex', () => {
    expect(createCardSchema.safeParse({ ...valid, color: '#FF5733' }).success).toBe(true)
  })

  it('rejects invalid color hex', () => {
    expect(createCardSchema.safeParse({ ...valid, color: 'blue' }).success).toBe(false)
  })

  it('accepts optional notes under 500 chars', () => {
    expect(createCardSchema.safeParse({ ...valid, notes: 'a'.repeat(500) }).success).toBe(true)
  })

  it('rejects notes over 500 chars', () => {
    expect(createCardSchema.safeParse({ ...valid, notes: 'a'.repeat(501) }).success).toBe(false)
  })

  it('accepts nullable expiresAt', () => {
    expect(createCardSchema.safeParse({ ...valid, expiresAt: null }).success).toBe(true)
  })

  it('accepts optional isPinned boolean', () => {
    expect(createCardSchema.safeParse({ ...valid, isPinned: true }).success).toBe(true)
  })
})

describe('updateCardSchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(updateCardSchema.safeParse({}).success).toBe(true)
  })

  it('accepts partial updates', () => {
    expect(updateCardSchema.safeParse({ storeName: 'New Name' }).success).toBe(true)
  })

  it('still validates barcodeType on update', () => {
    expect(updateCardSchema.safeParse({ barcodeType: 'BAD' }).success).toBe(false)
  })
})

describe('shareCardSchema', () => {
  it('accepts identifier only', () => {
    expect(shareCardSchema.safeParse({ identifier: 'alice@example.com' }).success).toBe(true)
  })

  it('accepts identifier with ISO datetime expiresAt', () => {
    expect(shareCardSchema.safeParse({ identifier: 'alice', expiresAt: '2025-12-31T00:00:00Z' }).success).toBe(true)
  })

  it('rejects empty identifier', () => {
    expect(shareCardSchema.safeParse({ identifier: '' }).success).toBe(false)
  })

  it('rejects invalid datetime expiresAt', () => {
    expect(shareCardSchema.safeParse({ identifier: 'alice', expiresAt: '2025-12-31' }).success).toBe(false)
  })
})

describe('createPublicShareSchema', () => {
  it('accepts valid datetime and optional label', () => {
    expect(createPublicShareSchema.safeParse({ expiresAt: '2025-12-31T00:00:00Z', label: 'Family' }).success).toBe(true)
  })

  it('accepts without label', () => {
    expect(createPublicShareSchema.safeParse({ expiresAt: '2025-12-31T00:00:00Z' }).success).toBe(true)
  })

  it('rejects missing expiresAt', () => {
    expect(createPublicShareSchema.safeParse({}).success).toBe(false)
  })

  it('rejects label over 60 chars', () => {
    expect(createPublicShareSchema.safeParse({ expiresAt: '2025-12-31T00:00:00Z', label: 'a'.repeat(61) }).success).toBe(false)
  })
})

describe('adminResetPasswordSchema', () => {
  it('accepts valid new password', () => {
    expect(adminResetPasswordSchema.safeParse({ newPassword: 'newpass123' }).success).toBe(true)
  })

  it('accepts undefined (optional)', () => {
    expect(adminResetPasswordSchema.safeParse({}).success).toBe(true)
  })

  it('rejects short password', () => {
    expect(adminResetPasswordSchema.safeParse({ newPassword: '1234567' }).success).toBe(false)
  })
})

describe('updateProfileSchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true)
  })

  it('accepts valid username', () => {
    expect(updateProfileSchema.safeParse({ username: 'alice' }).success).toBe(true)
  })

  it('rejects invalid username chars', () => {
    expect(updateProfileSchema.safeParse({ username: 'alice!' }).success).toBe(false)
  })

  it('accepts valid email', () => {
    expect(updateProfileSchema.safeParse({ email: 'test@example.com' }).success).toBe(true)
  })

  it('rejects invalid email', () => {
    expect(updateProfileSchema.safeParse({ email: 'bad' }).success).toBe(false)
  })

  it('accepts nullable displayName', () => {
    expect(updateProfileSchema.safeParse({ displayName: null }).success).toBe(true)
  })
})
