export type BarcodeType =
  | 'CODE128'
  | 'EAN13'
  | 'EAN8'
  | 'UPC'
  | 'QR_CODE'
  | 'PDF417'
  | 'AZTEC'
  | 'DATA_MATRIX'
  | 'CODABAR'
  | 'CODE39'

export const BARCODE_TYPES: BarcodeType[] = [
  'CODE128',
  'EAN13',
  'EAN8',
  'UPC',
  'QR_CODE',
  'PDF417',
  'AZTEC',
  'DATA_MATRIX',
  'CODABAR',
  'CODE39',
]

export const BARCODE_LABELS: Record<BarcodeType, string> = {
  CODE128: 'Code 128',
  EAN13: 'EAN-13',
  EAN8: 'EAN-8',
  UPC: 'UPC-A',
  QR_CODE: 'QR Code',
  PDF417: 'PDF417',
  AZTEC: 'Aztec',
  DATA_MATRIX: 'Data Matrix',
  CODABAR: 'Codabar',
  CODE39: 'Code 39',
}

export interface User {
  id: string
  email: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  isAdmin: boolean
  mustChangePassword: boolean
  createdAt: string
}

export interface PredefinedShop {
  id: string
  name: string
  color: string
  logoUrl: string | null
  createdAt: string
}

export interface Card {
  id: string
  ownerId: string
  storeName: string
  cardNumber: string
  barcodeType: BarcodeType
  notes: string | null
  color: string | null
  logoUrl: string | null
  cardImageUrl: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CardShare {
  id: string
  cardId: string
  sharedWith: string
  grantedBy: string
  canReshare: boolean
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
  sharedWithUser?: Pick<User, 'id' | 'email' | 'username' | 'displayName' | 'avatarUrl'>
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired'

export interface Invitation {
  id: string
  cardId: string
  invitedBy: string
  inviteeEmail: string
  inviteeUserId: string | null
  status: InvitationStatus
  expiresAt: string
  respondedAt: string | null
  createdAt: string
  card?: Pick<Card, 'id' | 'storeName' | 'barcodeType' | 'color' | 'logoUrl'>
  invitedByUser?: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>
}

export interface SharedCard {
  shareId: string
  card: Card
  grantedBy: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>
  expiresAt: string | null
  sharedAt: string
}
