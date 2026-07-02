import { useMemo, useState, useCallback } from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
} from 'react-native'
import { useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { api } from '../../../lib/api'
import { BarcodeDisplay } from '../../../components/BarcodeDisplay'
import { useTheme } from '../../../lib/ThemeContext'
import type { Theme } from '../../../lib/theme'
import type { SharedCard, BarcodeType } from '@memberr/shared'

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    errorText: { color: t.errorText, fontSize: 15, textAlign: 'center' },
    cardHero: { padding: 24, paddingTop: 32, paddingBottom: 16 },
    heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    pinBtn: { padding: 6, marginRight: 4 },
    heroLogoWrap: { flexShrink: 0 },
    heroLogo: { width: 52, height: 52, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
    heroStore: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
    sharedBy: { fontSize: 13, color: 'rgba(255,255,255,0.70)', marginTop: 4 },
    heroNumber: { fontSize: 17, color: 'rgba(255,255,255,0.85)', letterSpacing: 2, marginTop: 14 },
    expiryRow: {
      flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10,
      backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'flex-start',
      borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    },
    expiryRowWarn: { backgroundColor: 'rgba(249,115,22,0.7)' },
    expiryRowExpired: { backgroundColor: 'rgba(239,68,68,0.7)' },
    expiryLabel: { fontSize: 12, color: '#fff', fontWeight: '600' },
    barcodeSection: { backgroundColor: t.surface, padding: 24, alignItems: 'center', gap: 8 },
    barcodeLabel: { fontSize: 11, color: t.textSubtle, textTransform: 'uppercase', letterSpacing: 1 },
    section: { backgroundColor: t.surface, padding: 20, marginTop: 1 },
    sectionTitle: { fontSize: 13, fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
    notes: { fontSize: 15, color: t.text, lineHeight: 22 },
    expiry: { fontSize: 14, color: '#D97706', fontWeight: '600' },
    cardImage: { width: '100%', height: 200, borderRadius: 10, backgroundColor: t.border },
    fullImageOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
    fullImage: { width: '100%', height: '80%' },
    fullImageClose: {
      position: 'absolute', top: 48, right: 20, width: 40, height: 40, borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
    },
  })
}

export default function SharedCardDetailScreen() {
  const t = useTheme()
  const styles = useMemo(() => makeStyles(t), [t])
  const { shareId } = useLocalSearchParams<{ shareId: string }>()
  const [data, setData] = useState<SharedCard | null>(null)
  const [isPinned, setIsPinned] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fullImageVisible, setFullImageVisible] = useState(false)

  useFocusEffect(
    useCallback(() => {
      activateKeepAwakeAsync()
      api.sharedWithMe
        .get(shareId)
        .then((d) => { setData(d); setIsPinned(d.isPinned) })
        .catch(() => setError('Failed to load card'))
        .finally(() => setLoading(false))
      return () => { void deactivateKeepAwake() }
    }, [shareId]),
  )

  async function handlePin() {
    try {
      const result = await api.sharedWithMe.togglePin(shareId)
      setIsPinned(result.isPinned)
    } catch {}
  }

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
  const shareExpDays = data.expiresAt
    ? Math.ceil((new Date(data.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const shareIsExpiring = shareExpDays !== null && shareExpDays <= 7 && shareExpDays >= 0
  const shareIsExpired = shareExpDays !== null && shareExpDays < 0

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.cardHero, { backgroundColor: card.color ?? t.accent }]}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroStore}>{card.storeName}</Text>
            <Text style={styles.sharedBy}>
              Shared by {grantedBy.displayName ?? grantedBy.username}
            </Text>
          </View>
          <TouchableOpacity style={styles.pinBtn} onPress={handlePin}>
            <Ionicons name={isPinned ? 'bookmark' : 'bookmark-outline'} size={20} color="#fff" />
          </TouchableOpacity>
          {card.logoUrl ? (
            <View style={styles.heroLogoWrap}>
              <Image source={{ uri: card.logoUrl }} style={styles.heroLogo} resizeMode="contain" />
            </View>
          ) : null}
        </View>
        <Text style={styles.heroNumber}>{card.cardNumber}</Text>

        {data.expiresAt ? (
          <View style={[styles.expiryRow, shareIsExpired && styles.expiryRowExpired, shareIsExpiring && styles.expiryRowWarn]}>
            <Ionicons name={shareIsExpired ? 'alert-circle' : 'time-outline'} size={13} color="#fff" />
            <Text style={styles.expiryLabel}>
              {shareIsExpired
                ? 'Access has expired'
                : shareIsExpiring
                  ? `Access expires in ${shareExpDays} day${shareExpDays === 1 ? '' : 's'}`
                  : `Access until ${new Date(data.expiresAt).toLocaleDateString()}`}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.barcodeSection}>
        <BarcodeDisplay value={card.cardNumber} type={card.barcodeType as BarcodeType} width={300} height={120} />
        <Text style={styles.barcodeLabel}>{card.barcodeType.replace('_', ' ')}</Text>
      </View>

      {card.cardImageUrl && (
        <View style={styles.section}>
          <TouchableOpacity onPress={() => setFullImageVisible(true)} activeOpacity={0.85}>
            <Image source={{ uri: card.cardImageUrl }} style={styles.cardImage} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={fullImageVisible} transparent animationType="fade" onRequestClose={() => setFullImageVisible(false)}>
        <TouchableOpacity style={styles.fullImageOverlay} activeOpacity={1} onPress={() => setFullImageVisible(false)}>
          <Image source={{ uri: card.cardImageUrl ?? '' }} style={styles.fullImage} resizeMode="contain" />
          <TouchableOpacity style={styles.fullImageClose} onPress={() => setFullImageVisible(false)}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
