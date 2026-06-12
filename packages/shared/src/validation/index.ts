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
  email: z.string().email(),
  password: z.string().min(1),
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
  logoUrl: z.string().url().optional(),
})

export const updateCardSchema = createCardSchema.partial()

export const shareCardSchema = z.object({
  email: z.string().email(),
  expiresAt: z.string().datetime().optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateCardInput = z.infer<typeof createCardSchema>
export type UpdateCardInput = z.infer<typeof updateCardSchema>
export type ShareCardInput = z.infer<typeof shareCardSchema>
