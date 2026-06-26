import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  uniqueIndex,
  index,
  primaryKey,
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
  pushToken: text('push_token'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const predefinedShops = pgTable('predefined_shops', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#0EA5E9'),
  logoUrl: text('logo_url'),
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
  isPinned: boolean('is_pinned').default(false).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
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
    shareExpiresAt: timestamp('share_expires_at', { withTimezone: true }),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('invitations_token_idx').on(t.token)],
)

export const publicShares = pgTable('public_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  cardId: uuid('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').unique().notNull(),
  label: text('label'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Per-recipient pin state for shared cards. Separate from cards.isPinned
// (the owner's pin) so each recipient can organise their own shared-with-me list.
export const cardSharePins = pgTable(
  'card_share_pins',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    shareId: uuid('share_id').notNull().references(() => cardShares.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.shareId] })],
)

// Per-viewer card ordering, since the same card can show up in many users'
// lists (the owner, plus everyone it's shared with) and each person should
// be able to arrange their own view without affecting anyone else's.
export const cardOrder = pgTable(
  'card_order',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('card_order_user_card_idx').on(t.userId, t.cardId)],
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
