import { z } from 'zod'
import { BARCODE_TYPES } from '../types/index.js'

export const registerSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, underscores, hyphens'),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(60).optional(),
})

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Required'),
  password: z.string().min(1, 'Required'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'At least 8 characters').max(128),
})

export const createShopSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#0EA5E9'),
  logoUrl: z.string().optional().nullable(),
})

export const createCardSchema = z.object({
  storeName: z.string().min(1).max(100),
  cardNumber: z.string().min(1).max(200),
  barcodeType: z.enum(BARCODE_TYPES as [string, ...string[]]),
  notes: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  logoUrl: z.string().optional(),
  cardImageUrl: z.string().optional(),
  isPinned: z.boolean().optional(),
  expiresAt: z.string().nullable().optional(),
})

export const updateCardSchema = createCardSchema.partial()

export const shareCardSchema = z.object({
  identifier: z.string().min(1),
  canReshare: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
})

export const createPublicShareSchema = z.object({
  expiresAt: z.string().datetime(),
  label: z.string().max(60).optional(),
})

export const adminResetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'At least 8 characters').max(128).optional(),
})

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(60).nullable().optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, underscores, hyphens')
    .optional(),
  email: z.string().email().optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type CreateShopInput = z.infer<typeof createShopSchema>
export type CreateCardInput = z.infer<typeof createCardSchema>
export type UpdateCardInput = z.infer<typeof updateCardSchema>
export type ShareCardInput = z.infer<typeof shareCardSchema>
export type CreatePublicShareInput = z.infer<typeof createPublicShareSchema>
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>
