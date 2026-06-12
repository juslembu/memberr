import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  username: text('username').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  isAdmin: boolean('is_admin').default(false).notNull(),
  mustChangePassword: boolean('must_change_password').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const predefinedShops = pgTable('predefined_shops', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#0EA5E9'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  deviceLabel: text('device_label'),
  familyId: uuid('family_id').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const cards = pgTable('cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  storeName: text('store_name').notNull(),
  cardNumber: text('card_number').notNull(),
  barcodeType: text('barcode_type').notNull(),
  notes: text('notes'),
  color: text('color'),
  logoUrl: text('logo_url'),
  cardImageUrl: text('card_image_url'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const cardShares = pgTable(
  'card_shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    sharedWith: uuid('shared_with')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    grantedBy: uuid('granted_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    canReshare: boolean('can_reshare').default(false).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('card_shares_card_user_idx').on(t.cardId, t.sharedWith)],
)

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    inviteeEmail: text('invitee_email').notNull(),
    inviteeUserId: uuid('invitee_user_id').references(() => users.id, { onDelete: 'set null' }),
    token: text('token').unique().notNull(),
    status: text('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('invitations_token_idx').on(t.token)],
)

export const usersRelations = relations(users, ({ many }) => ({
  cards: many(cards),
  sharesReceived: many(cardShares, { relationName: 'sharedWith' }),
  sharesGranted: many(cardShares, { relationName: 'grantedBy' }),
  invitationsSent: many(invitations, { relationName: 'invitedBy' }),
}))

export const cardsRelations = relations(cards, ({ one, many }) => ({
  owner: one(users, { fields: [cards.ownerId], references: [users.id] }),
  shares: many(cardShares),
  invitations: many(invitations),
}))

export const cardSharesRelations = relations(cardShares, ({ one }) => ({
  card: one(cards, { fields: [cardShares.cardId], references: [cards.id] }),
  sharedWithUser: one(users, {
    fields: [cardShares.sharedWith],
    references: [users.id],
    relationName: 'sharedWith',
  }),
  grantedByUser: one(users, {
    fields: [cardShares.grantedBy],
    references: [users.id],
    relationName: 'grantedBy',
  }),
}))

export const invitationsRelations = relations(invitations, ({ one }) => ({
  card: one(cards, { fields: [invitations.cardId], references: [cards.id] }),
  invitedByUser: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
    relationName: 'invitedBy',
  }),
  inviteeUser: one(users, {
    fields: [invitations.inviteeUserId],
    references: [users.id],
  }),
}))
