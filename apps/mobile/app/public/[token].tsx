import { useMemo, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { useLocalSearchParams, useFocusEffect } from 'expo-router'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { Ionicons } from '@expo/vector-icons'
import { api, ApiError } from '../../lib/api'
import { BarcodeDisplay } from '../../components/BarcodeDisplay'
import { useTheme } from '../../lib/ThemeContext'
import type { Theme } from '../../lib/theme'
import type { PublicCardView, BarcodeType } from '@memberr/shared'

function formatExpiry(isoString: string): string {
  const diff = new Date(isoString).getTime() - Date.now()
  const hours = Math.ceil(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Expires very soon'
  if (hours < 24) return `Expires in ${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return `Expires in ${days} day${days === 1 ? '' : 's'}`
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    content: { paddingBottom: 48 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorPage: {
      flex: 1, justifyContent: 'center', alignItems: 'center',
      padding: 32, backgroundColor: t.bg,
    },
    errorIconWrap: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: t.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 20,
      borderWidth: 1, borderColor: t.border,
    },
    errorTitle: { fontSize: 20, fontWeight: '700', color: t.text, marginBottom: 8 },
    errorMsg: { fontSize: 15, color: t.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 40 },
    memberrFooterError: { fontSize: 12, color: t.textSubtle },
    hero: { padding: 28, paddingTop: 60, paddingBottom: 28, overflow: 'hidden' },
    circle1: {
      position: 'absolute', width: 200, height: 200, borderRadius: 100,
      backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -60,
    },
    circle2: {
      position: 'absolute', width: 140, height: 140, borderRadius: 70,
      backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, left: -30,
    },
    heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 16 },
    storeName: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -0.5, lineHeight: 36 },
    shareLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
    logo: { width: 64, height: 64, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', flexShrink: 0 },
    cardNumber: { fontSize: 18, color: 'rgba(255,255,255,0.85)', letterSpacing: 2, marginBottom: 14 },
    expiryBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(0,0,0,0.2)', alignSelf: 'flex-start',
      borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    },
    expiryBadgeWarn: { backgroundColor: 'rgba(249,115,22,0.8)' },
    expiryBadgeText: { fontSize: 12, color: '#fff', fontWeight: '600' },
    barcodeSection: { backgroundColor: t.surface, alignItems: 'center', padding: 32, gap: 12 },
    barcodeType: { fontSize: 11, color: t.textSubtle, textTransform: 'uppercase', letterSpacing: 1.5 },
    cardNumberLarge: { fontSize: 20, fontWeight: '700', color: t.text, letterSpacing: 3 },
    instructionSection: { backgroundColor: t.surface, marginTop: 1, padding: 20, gap: 14 },
    instructionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    instructionText: { fontSize: 14, color: t.textMuted, flex: 1 },
    footer: { alignItems: 'center', paddingTop: 40, paddingBottom: 20, gap: 4 },
    footerText: { fontSize: 12, color: t.textSubtle },
    footerBrand: { fontSize: 18, fontWeight: '800', color: t.accent, letterSpacing: -0.3 },
    footerSub: { fontSize: 11, color: t.textSubtle },
  })
}

export default function PublicCardScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const t = useTheme()
  const styles = useMemo(() => makeStyles(t), [t])
  const [data, setData] = useState<PublicCardView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      activateKeepAwakeAsync()
      api.publicShares
        .getPublic(token)
        .then(setData)
        .catch((err) => {
          setError(err instanceof ApiError && err.status === 404
            ? 'This link is invalid or has expired'
            : 'Failed to load card')
        })
        .finally(() => setLoading(false))
      return () => { void deactivateKeepAwake() }
    }, [token]),
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
      <View style={styles.errorPage}>
        <View style={styles.errorIconWrap}>
          <Ionicons name="link-outline" size={40} color={t.textSubtle} />
        </View>
        <Text style={styles.errorTitle}>Link unavailable</Text>
        <Text style={styles.errorMsg}>{error ?? 'This link has expired or been removed.'}</Text>
        <Text style={styles.memberrFooterError}>Memberr — digital membership cards</Text>
      </View>
    )
  }

  const bg = data.color ?? t.accent
  const expiryText = formatExpiry(data.shareExpiresAt)
  const isExpiringSoon = new Date(data.shareExpiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.hero, { backgroundColor: bg }]}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.storeName}>{data.storeName}</Text>
            {data.shareLabel ? (
              <Text style={styles.shareLabel}>{data.shareLabel}</Text>
            ) : null}
          </View>
          {data.logoUrl ? (
            <Image source={{ uri: data.logoUrl }} style={styles.logo} resizeMode="contain" />
          ) : null}
        </View>

        <Text style={styles.cardNumber}>{data.cardNumber}</Text>

        <View style={[styles.expiryBadge, isExpiringSoon && styles.expiryBadgeWarn]}>
          <Ionicons name="time-outline" size={12} color="#fff" />
          <Text style={styles.expiryBadgeText}>{expiryText}</Text>
        </View>
      </View>

      <View style={styles.barcodeSection}>
        <BarcodeDisplay
          value={data.cardNumber}
          type={data.barcodeType as BarcodeType}
          width={300}
          height={130}
        />
        <Text style={styles.barcodeType}>{data.barcodeType.replace('_', ' ')}</Text>
        <Text style={styles.cardNumberLarge}>{data.cardNumber}</Text>
      </View>

      <View style={styles.instructionSection}>
        <View style={styles.instructionRow}>
          <Ionicons name="scan-outline" size={18} color={t.accent} />
          <Text style={styles.instructionText}>Show this barcode at checkout</Text>
        </View>
        <View style={styles.instructionRow}>
          <Ionicons name="sunny-outline" size={18} color={t.accent} />
          <Text style={styles.instructionText}>Increase screen brightness for best scan results</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Shared via</Text>
        <Text style={styles.footerBrand}>Memberr</Text>
        <Text style={styles.footerSub}>Digital membership card manager</Text>
      </View>
    </ScrollView>
  )
}
