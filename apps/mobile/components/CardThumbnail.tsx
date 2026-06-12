import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import type { Card } from '@memberr/shared'

interface Props {
  card: Card
  onPress?: () => void
}

export function CardThumbnail({ card, onPress }: Props) {
  const bg = card.color ?? '#6366f1'

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.card, { backgroundColor: bg }]}>
        <Text style={styles.store} numberOfLines={1}>
          {card.storeName}
        </Text>
        <Text style={styles.number} numberOfLines={1}>
          {card.cardNumber}
        </Text>
        <Text style={styles.type}>{card.barcodeType.replace('_', ' ')}</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    minHeight: 100,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  store: { fontSize: 20, fontWeight: '700', color: '#fff' },
  number: { fontSize: 14, color: 'rgba(255,255,255,0.85)', letterSpacing: 1.5, marginTop: 8 },
  type: { fontSize: 11, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', marginTop: 4 },
})
