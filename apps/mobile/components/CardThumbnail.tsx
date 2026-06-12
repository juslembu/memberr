import { View, Text, StyleSheet, Pressable, Platform } from 'react-native'
import type { Card } from '@memberr/shared'

interface Props {
  card: Card
  onPress?: () => void
}

export function CardThumbnail({ card, onPress }: Props) {
  const bg = card.color ?? '#0EA5E9'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.touchable,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.card, { backgroundColor: bg }]}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        <View style={styles.inner}>
          <Text style={styles.store} numberOfLines={2}>{card.storeName}</Text>
          <View style={styles.spacer} />
          <View style={styles.footer}>
            <Text style={styles.number} numberOfLines={1}>{card.cardNumber}</Text>
            <Text style={styles.type}>{card.barcodeType.replace(/_/g, ' ')}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  touchable: {
    width: '100%',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
  card: {
    width: '100%',
    aspectRatio: 1.586,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  circle1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -50,
    right: -30,
  },
  circle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: 0,
    right: 60,
  },
  inner: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  store: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  spacer: { flex: 1 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  number: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.80)',
    letterSpacing: 1.5,
    fontWeight: '500',
    marginRight: 8,
  },
  type: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '600',
  },
})
