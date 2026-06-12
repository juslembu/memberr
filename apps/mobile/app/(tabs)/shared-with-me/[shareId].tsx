import { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useFocusEffect } from 'expo-router'
import { api } from '../../../lib/api'
import { BarcodeDisplay } from '../../../components/BarcodeDisplay'
import { t } from '../../../lib/theme'
import type { SharedCard, BarcodeType } from '@memberr/shared'

export default function SharedCardDetailScreen() {
  const { shareId } = useLocalSearchParams<{ shareId: string }>()
  const [data, setData] = useState<SharedCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      api.sharedWithMe
        .get(shareId)
        .then(setData)
        .catch(() => setError('Failed to load card'))
        .finally(() => setLoading(false))
    }, [shareId]),
  )

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    )
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Card not found'}</Text>
      </View>
    )
  }

  const { card, grantedBy } = data

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.cardHero, { backgroundColor: card.color ?? t.accent }]}>
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
  container: { flex: 1, backgroundColor: t.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: t.errorText, fontSize: 15, textAlign: 'center' },
  cardHero: { padding: 28, paddingTop: 40 },
  heroStore: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  sharedBy: { fontSize: 13, color: 'rgba(255,255,255,0.70)', marginTop: 4 },
  heroNumber: { fontSize: 17, color: 'rgba(255,255,255,0.85)', letterSpacing: 2, marginTop: 16 },
  barcodeSection: { backgroundColor: t.surface, padding: 24, alignItems: 'center', gap: 8 },
  barcodeLabel: { fontSize: 11, color: t.textSubtle, textTransform: 'uppercase', letterSpacing: 1 },
  section: { backgroundColor: t.surface, padding: 20, marginTop: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  notes: { fontSize: 15, color: t.text, lineHeight: 22 },
  expiry: { fontSize: 14, color: '#D97706', fontWeight: '600' },
})
