import { View, Text, Image, StyleSheet, Pressable, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Card, BarcodeType } from '@memberr/shared'
import { t } from '../lib/theme'
import { BarcodeDisplay } from './BarcodeDisplay'

interface Props {
  card: Card
  onPress?: () => void
  sharedBy?: string
  shareExpiresAt?: string | null
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function CardThumbnail({ card, onPress, sharedBy, shareExpiresAt }: Props) {
  const bg = card.color ?? '#0EA5E9'
  // For shared cards, show share expiry; for own cards show card expiry
  const expiryDate = shareExpiresAt !== undefined ? shareExpiresAt : card.expiresAt
  const expDays = daysUntil(expiryDate)
  const isExpiring = expDays !== null && expDays <= 7 && expDays >= 0
  const isExpired = expDays !== null && expDays < 0
  const isShareExpiry = shareExpiresAt !== undefined

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: bg }, pressed && styles.pressed]}
    >
      {/* Decorative circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      {/* Top row: store name + logo */}
      <View style={styles.top}>
        <Text style={styles.store} numberOfLines={2}>{card.storeName}</Text>
        <View style={styles.topRight}>
          {card.isPinned ? (
            <View style={styles.pinBadge}>
              <Ionicons name="bookmark" size={11} color="#fff" />
            </View>
          ) : null}
          {card.logoUrl ? (
            <Image source={{ uri: card.logoUrl }} style={styles.logo} resizeMode="contain" />
          ) : null}
        </View>
      </View>

      {sharedBy ? (
        <Text style={styles.sharedBy} numberOfLines={1}>via {sharedBy}</Text>
      ) : null}

      {isExpired ? (
        <View style={styles.expiryBadge}>
          <Ionicons name="alert-circle" size={10} color="#fff" />
          <Text style={styles.expiryText}>{isShareExpiry ? 'Access expired' : 'Expired'}</Text>
        </View>
      ) : isExpiring ? (
        <View style={[styles.expiryBadge, styles.expiryWarn]}>
          <Ionicons name="time-outline" size={10} color="#fff" />
          <Text style={styles.expiryText}>
            {expDays === 0
              ? (isShareExpiry ? 'Access ends today' : 'Expires today')
              : `${isShareExpiry ? 'Access: ' : ''}${expDays}d left`}
          </Text>
        </View>
      ) : null}

      {/* Barcode */}
      <View style={styles.barcodeWrap}>
        <BarcodeDisplay
          value={card.cardNumber}
          type={card.barcodeType as BarcodeType}
          width={150}
          height={36}
        />
      </View>

      {/* Card number */}
      <Text style={styles.number} numberOfLines={1}>{card.cardNumber}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    minHeight: 160,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
  circle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -40,
    right: -30,
  },
  circle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -10,
    right: 50,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 4,
  },
  topRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 4,
    flexShrink: 0,
    minHeight: 36,
  },
  store: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  pinBadge: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ef4444',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  expiryWarn: { backgroundColor: '#f97316' },
  expiryText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  sharedBy: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginBottom: 6,
  },
  barcodeWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 6,
    padding: 4,
    overflow: 'hidden',
  },
  number: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1,
    fontWeight: '500',
    marginTop: 4,
  },
})
