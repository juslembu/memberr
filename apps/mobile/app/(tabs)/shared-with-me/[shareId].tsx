import { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useLocalSearchParams, useFocusEffect } from 'expo-router'
import { api } from '../../../lib/api'
import { BarcodeDisplay } from '../../../components/BarcodeDisplay'
import type { SharedCard, BarcodeType } from '@memberr/shared'

export default function SharedCardDetailScreen() {
  const { shareId } = useLocalSearchParams<{ shareId: string }>()
  const [data, setData] = useState<SharedCard | null>(null)
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      api.sharedWithMe
        .get(shareId)
        .then(setData)
        .catch(() => Alert.alert('Error', 'Failed to load card'))
        .finally(() => setLoading(false))
    }, [shareId]),
  )

  if (loading || !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  const { card, grantedBy } = data

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.cardHero, { backgroundColor: card.color ?? '#6366f1' }]}>
        <Text style={styles.heroStore}>{card.storeName}</Text>
        <Text style={styles.sharedBy}>
          Shared by {grantedBy.displayName ?? grantedBy.username}
        </Text>
        <Text style={styles.heroNumber}>{card.cardNumber}</Text>
      </View>

      <View style={styles.barcodeSection}>
        <BarcodeDisplay value={card.cardNumber} type={card.barcodeType as BarcodeType} width={300} height={120} />
        <Text style={styles.barcodeLabel}>{card.barcodeType.replace('_', ' ')}</Text>
      </View>

      {card.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notes}>{card.notes}</Text>
        </View>
      )}

      {data.expiresAt && (
        <View style={styles.section}>
          <Text style={styles.expiry}>
            Access expires {new Date(data.expiresAt).toLocaleDateString()}
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardHero: { padding: 28, paddingTop: 40 },
  heroStore: { fontSize: 28, fontWeight: '800', color: '#fff' },
  sharedBy: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  heroNumber: { fontSize: 18, color: 'rgba(255,255,255,0.85)', letterSpacing: 2, marginTop: 16 },
  barcodeSection: { backgroundColor: '#fff', padding: 24, alignItems: 'center', gap: 8 },
  barcodeLabel: { fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 },
  section: { backgroundColor: '#fff', padding: 20, marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  notes: { fontSize: 15, color: '#374151', lineHeight: 22 },
  expiry: { fontSize: 14, color: '#f59e0b', fontWeight: '600' },
})
