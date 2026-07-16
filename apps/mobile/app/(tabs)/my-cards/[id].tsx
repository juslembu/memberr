import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
  Share,
  Platform,
  KeyboardAvoidingView,
  Animated,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { api, ApiError } from '../../../lib/api'
import { getServerUrl } from '../../../lib/serverUrl'
import { copyText } from '../../../lib/copy'
import { BarcodeDisplay } from '../../../components/BarcodeDisplay'
import { BarcodeScanModal } from '../../../components/BarcodeScanModal'
import { useTheme } from '../../../lib/ThemeContext'
import type { Theme } from '../../../lib/theme'
import type { Card, CardShare, Invitation, PublicShare, BarcodeType } from '@memberr/shared'

type ConfirmModal = {
  title: string
  message: string
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => Promise<void>
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorBanner: { backgroundColor: t.errorBg, padding: 14, borderBottomWidth: 1, borderBottomColor: t.border },
    errorText: { color: t.errorText, fontSize: 14, textAlign: 'center' },
    cardHero: { padding: 24, paddingTop: 32, paddingBottom: 16 },
    heroHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
    heroStore: { flex: 1, fontSize: 28, fontWeight: '800', color: '#fff' },
    heroLogo: { width: 64, height: 64, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
    heroNumber: { fontSize: 18, color: 'rgba(255,255,255,0.85)', letterSpacing: 2, marginTop: 12 },
    heroNumberCopied: { color: 'rgba(255,255,255,0.55)' },
    expiryRow: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      marginTop: 8, backgroundColor: 'rgba(0,0,0,0.15)',
      alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    },
    expiryRowWarn: { backgroundColor: 'rgba(249,115,22,0.7)' },
    expiryRowExpired: { backgroundColor: 'rgba(239,68,68,0.7)' },
    expiryLabel: { fontSize: 12, color: '#fff', fontWeight: '600' },
    heroActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
    heroBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 7,
    },
    heroBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    barcodeSection: { backgroundColor: '#fff', padding: 24, alignItems: 'center', gap: 8 },
    barcodeLabel: { fontSize: 12, color: t.textSubtle, textTransform: 'uppercase', letterSpacing: 1 },
    section: { backgroundColor: t.surface, padding: 20, marginTop: 12 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: t.text, marginBottom: 12 },
    notes: { fontSize: 15, color: t.textMuted, lineHeight: 22 },
    cardImage: { width: '100%', height: 200, borderRadius: 10, backgroundColor: t.bg, marginTop: 8 },
    fullImageOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
    fullImage: { width: '100%', height: '80%' },
    fullImageClose: {
      position: 'absolute', top: 48, right: 20,
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
    },
    emptyShares: { fontSize: 14, color: t.textSubtle, textAlign: 'center', paddingVertical: 12 },
    shareRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
    shareAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.accentBg, justifyContent: 'center', alignItems: 'center' },
    shareAvatarText: { fontSize: 16, fontWeight: '700', color: t.accent },
    shareInfo: { flex: 1 },
    shareName: { fontSize: 15, fontWeight: '600', color: t.text },
    shareEmail: { fontSize: 13, color: t.textMuted },
    barcodeScanHint: { fontSize: 11, color: t.textSubtle, marginTop: 2 },
    pendingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
    pendingIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' },
    pendingActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    linkBtn: { padding: 4 },
    addLinkBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      borderWidth: 1, borderColor: t.border, borderRadius: 8,
      paddingHorizontal: 8, paddingVertical: 4,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
    },
    addLinkBtnText: { fontSize: 12, color: t.accent, fontWeight: '600' },
    publicLinkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
    publicLinkIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.accentBg, justifyContent: 'center', alignItems: 'center' },
    publicSuccessCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#BBF7D0',
    },
    publicInfoBox: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 8,
      backgroundColor: t.accentBg, borderRadius: 10, padding: 12, marginBottom: 14,
    },
    publicInfoText: { flex: 1, fontSize: 13, color: t.accent, lineHeight: 18 },
    deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20, marginTop: 12, marginBottom: 40 },
    deleteText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    confirmOverlay: { justifyContent: 'center' },
    modalContent: { backgroundColor: t.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
    confirmContent: { marginHorizontal: 24, borderRadius: 16, width: '100%', maxWidth: 400, alignSelf: 'center' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginBottom: 16 },
    confirmMessage: { fontSize: 14, color: t.textMuted, marginBottom: 8, lineHeight: 20 },
    modalButton: { backgroundColor: t.accent, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
    destructiveButton: { backgroundColor: '#ef4444' },
    buttonDisabled: { opacity: 0.6 },
    modalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    modalCancel: { paddingVertical: 14, alignItems: 'center' },
    modalCancelText: { color: t.textMuted, fontSize: 15 },
    shareModalOuter: { flex: 1, justifyContent: 'flex-end' },
    shareModalScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
    shareModalSheet: {
      backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
      shadowColor: '#0F172A', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: -4 }, elevation: 20,
      width: '100%', maxWidth: 480, alignSelf: 'center',
    },
    shareHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: t.border, alignSelf: 'center', marginBottom: 20 },
    shareHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    shareIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: t.accentBg, justifyContent: 'center', alignItems: 'center' },
    shareTitle: { fontSize: 16, fontWeight: '700', color: t.text },
    shareSubtitle: { fontSize: 13, color: t.textMuted, marginTop: 1 },
    shareCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' },
    shareSuccessCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#BBF7D0',
    },
    shareSuccessTitle: { fontSize: 14, fontWeight: '700', color: '#15803D' },
    shareSuccessMsg: { fontSize: 12, color: '#16A34A', marginTop: 2 },
    shareSuccessSub: { fontSize: 11, color: '#15803D', marginTop: 2, opacity: 0.8 },
    copyLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: t.accentBg, borderRadius: 8 },
    copyLinkText: { fontSize: 12, color: t.accent, fontWeight: '600' },
    shareInputRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: t.bg,
      borderRadius: 14, borderWidth: 1.5, borderColor: t.border,
      paddingHorizontal: 14, paddingVertical: 12, gap: 4, marginBottom: 6,
    },
    shareInputRowError: { borderColor: '#FCA5A5', backgroundColor: '#FFF5F5' },
    shareInput: {
      flex: 1, fontSize: 15, color: t.text,
      ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    shareErrorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 14, paddingHorizontal: 2 },
    shareErrorMsg: { flex: 1, fontSize: 13, color: '#DC2626', lineHeight: 18 },
    durationSection: { marginBottom: 14 },
    durationLabel: { fontSize: 13, fontWeight: '600', color: t.textMuted, marginBottom: 8 },
    durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    durationChip: {
      paddingHorizontal: 12, paddingVertical: 7,
      borderRadius: 20, borderWidth: 1.5, borderColor: t.border,
      backgroundColor: t.bg,
    },
    durationChipActive: { borderColor: t.accent, backgroundColor: t.accentBg },
    durationChipText: { fontSize: 13, fontWeight: '600', color: t.textMuted },
    durationChipTextActive: { color: t.accent },
    shareSendBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: t.accent, borderRadius: 14, paddingVertical: 15, marginTop: 8,
    },
    shareSendBtnDisabled: { opacity: 0.45 },
    shareSendBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  })
}

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const t = useTheme()
  const styles = useMemo(() => makeStyles(t), [t])
  const [card, setCard] = useState<Card | null>(null)
  const [shares, setShares] = useState<CardShare[]>([])
  const [pendingInvites, setPendingInvites] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [archiving, setArchiving] = useState(false)
  const [shareIdentifier, setShareIdentifier] = useState('')
  const [shareDuration, setShareDuration] = useState<string | null>(null)
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState('')
  const [shareSuccess, setShareSuccess] = useState('')
  const [shareSuccessToken, setShareSuccessToken] = useState<string | undefined>()
  const [showShareModal, setShowShareModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null)
  const [confirmRunning, setConfirmRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fullImageVisible, setFullImageVisible] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [publicLinks, setPublicLinks] = useState<PublicShare[]>([])
  const [showPublicModal, setShowPublicModal] = useState(false)
  const [publicDuration, setPublicDuration] = useState('24h')
  const [publicLabel, setPublicLabel] = useState('')
  const [creatingPublic, setCreatingPublic] = useState(false)
  const [publicError, setPublicError] = useState('')
  const [newPublicLink, setNewPublicLink] = useState<PublicShare | null>(null)
  const [justCreatedPublicLink, setJustCreatedPublicLink] = useState(false)
  const [publicLinkCopied, setPublicLinkCopied] = useState<string | null>(null)
  const [cardNumberCopied, setCardNumberCopied] = useState(false)
  const [serverUrl, setServerUrl] = useState('')

  useEffect(() => { getServerUrl().then(setServerUrl) }, [])

  const sheetAnim = useRef(new Animated.Value(400)).current
  useEffect(() => {
    if (showShareModal || showPublicModal) {
      sheetAnim.setValue(400)
      Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }).start()
    }
  }, [showShareModal, showPublicModal])

  useFocusEffect(useCallback(() => {
    activateKeepAwakeAsync()
    load()
    return () => { void deactivateKeepAwake() }
  }, [id]))

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cardData, shareData, pendingData, publicLinksData] = await Promise.all([
        api.cards.get(id),
        api.shares.list(id),
        api.shares.listPending(id),
        api.publicShares.list(id).catch(() => [] as PublicShare[]),
      ])
      setCard(cardData)
      setShares(shareData)
      setPendingInvites(pendingData)
      setPublicLinks(publicLinksData)
    } catch {
      setError('Failed to load card')
    } finally {
      setLoading(false)
    }
  }, [id])

  function openPublicModal() {
    setPublicError('')
    setJustCreatedPublicLink(false)
    setNewPublicLink(publicLinks.length > 0 ? publicLinks[0] : null)
    setShowPublicModal(true)
  }

  async function handlePin() {
    if (!card) return
    try {
      const updated = await api.cards.update(id, { isPinned: !card.isPinned })
      setCard(updated)
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
  }

  async function handleCopyCardNumber() {
    if (!card) return
    await copyText(card.cardNumber)
    setCardNumberCopied(true)
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setTimeout(() => setCardNumberCopied(false), 2000)
  }

  function durationToExpiresAt(duration: string | null): string | undefined {
    if (!duration) return undefined
    const ms: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }
    return ms[duration] ? new Date(Date.now() + ms[duration]).toISOString() : undefined
  }

  async function handleShare() {
    const val = shareIdentifier.trim()
    if (!val) return
    setSharing(true)
    setShareError('')
    setShareSuccess('')
    setShareSuccessToken(undefined)
    try {
      const result = await api.shares.share(id, {
        identifier: val,
        expiresAt: durationToExpiresAt(shareDuration),
      })
      setShareSuccess(`Invitation sent to ${val}`)
      setShareSuccessToken(result.invitation?.token)
      setShareIdentifier('')
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      await load()
    } catch (err) {
      setShareError(err instanceof ApiError ? err.message : 'Failed to send invitation')
    } finally {
      setSharing(false)
    }
  }

  async function copyInviteLink(token: string) {
    const url = `${serverUrl}/invite/${token}`
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(url).catch(() => {})
    } else {
      await Share.share({ url, message: url })
    }
    setLinkCopied(true)
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setTimeout(() => setLinkCopied(false), 3000)
  }

  function handleRevoke(shareId: string, username: string) {
    setConfirmModal({
      title: 'Revoke access',
      message: `Remove ${username}'s access to this card?`,
      confirmLabel: 'Revoke',
      destructive: true,
      onConfirm: async () => {
        await api.shares.revoke(id, shareId).catch(() => {})
        await load()
      },
    })
  }

  async function handleCancelInvite(inviteId: string) {
    await api.invitations.cancel(inviteId).catch(() => {})
    await load()
  }

  async function handleArchive() {
    setArchiving(true)
    try {
      await api.cards.archive(id)
      router.replace('/(tabs)/my-cards')
    } catch {
      // stay on screen so user can retry
    } finally {
      setArchiving(false)
    }
  }

  function handleRestore() {
    setConfirmModal({
      title: 'Restore card',
      message: 'Restore this card to your active cards?',
      confirmLabel: 'Restore',
      onConfirm: async () => {
        setConfirmModal(null)
        await api.cards.unarchive(id).catch(() => {})
        router.replace('/(tabs)/my-cards')
      },
    })
  }

  function publicDurationToExpiresAt(d: string): string {
    const ms: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }
    return new Date(Date.now() + ms[d]).toISOString()
  }

  async function handleCreatePublicLink() {
    setCreatingPublic(true)
    setPublicError('')
    try {
      const share = await api.publicShares.create(id, {
        expiresAt: publicDurationToExpiresAt(publicDuration),
        label: publicLabel.trim() || undefined,
      })
      setNewPublicLink(share)
      setJustCreatedPublicLink(true)
      await load()
    } catch (err) {
      setPublicError(err instanceof ApiError ? err.message : 'Failed to create link')
    } finally {
      setCreatingPublic(false)
    }
  }

  async function handleRevokePublicLink(shareId: string) {
    await api.publicShares.revoke(id, shareId).catch(() => {})
    await load()
  }

  async function copyPublicLink(token: string) {
    const url = `${serverUrl}/public/${token}`
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(url).catch(() => {})
    } else {
      await Share.share({ url, message: url })
    }
    setPublicLinkCopied(token)
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setTimeout(() => setPublicLinkCopied(null), 3000)
  }

  async function runConfirm() {
    if (!confirmModal) return
    setConfirmRunning(true)
    try { await confirmModal.onConfirm() }
    finally { setConfirmRunning(false); setConfirmModal(null) }
  }

  if (loading || !card) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    )
  }

  const expDays = daysUntil(card.expiresAt)
  const isExpiring = expDays !== null && expDays <= 30 && expDays >= 0
  const isExpired = expDays !== null && expDays < 0

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={[styles.cardHero, { backgroundColor: card.color ?? t.accent }]}>
        <View style={styles.heroHeader}>
          <Text style={styles.heroStore}>{card.storeName}</Text>
          {card.logoUrl ? (
            <Image source={{ uri: card.logoUrl }} style={styles.heroLogo} resizeMode="contain" />
          ) : null}
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={handleCopyCardNumber}>
          <Text style={[styles.heroNumber, cardNumberCopied && styles.heroNumberCopied]}>
            {cardNumberCopied ? 'Copied!' : card.cardNumber}
          </Text>
        </TouchableOpacity>

        {card.expiresAt ? (
          <View style={[styles.expiryRow, isExpired && styles.expiryRowExpired, isExpiring && styles.expiryRowWarn]}>
            <Ionicons name={isExpired ? 'alert-circle' : 'calendar-outline'} size={13} color="#fff" />
            <Text style={styles.expiryLabel}>
              {isExpired
                ? 'Expired'
                : isExpiring
                  ? `Expires in ${expDays} day${expDays === 1 ? '' : 's'}`
                  : `Expires ${new Date(card.expiresAt).toLocaleDateString()}`}
            </Text>
          </View>
        ) : null}

        <View style={styles.heroActions}>
          <TouchableOpacity style={styles.heroBtn} onPress={handlePin}>
            <Ionicons name={card.isPinned ? 'bookmark' : 'bookmark-outline'} size={18} color="#fff" />
            <Text style={styles.heroBtnText}>{card.isPinned ? 'Pinned' : 'Pin'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroBtn} onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/(tabs)/my-cards/edit?id=${id}`) }}>
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={styles.heroBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroBtn} onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowShareModal(true) }}>
            <Ionicons name="person-add-outline" size={18} color="#fff" />
            <Text style={styles.heroBtnText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroBtn} onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openPublicModal() }}>
            <Ionicons name="link-outline" size={18} color="#fff" />
            <Text style={styles.heroBtnText}>Public link</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.barcodeSection} activeOpacity={0.85} onPress={() => setShowBarcodeModal(true)}>
        <BarcodeDisplay value={card.cardNumber} type={card.barcodeType as BarcodeType} width={300} height={120} />
        <Text style={styles.barcodeLabel}>{card.barcodeType.replace('_', ' ')}</Text>
        {Platform.OS !== 'web' && <Text style={styles.barcodeScanHint}>Tap to scan</Text>}
      </TouchableOpacity>

      {card.cardImageUrl && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card image</Text>
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

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Shared with ({shares.length})</Text>
        </View>
        {shares.length === 0 && (
          <Text style={styles.emptyShares}>Not shared with anyone yet</Text>
        )}
        {shares.map((share) => (
          <View key={share.id} style={styles.shareRow}>
            <View style={styles.shareAvatar}>
              <Text style={styles.shareAvatarText}>
                {(share.sharedWithUser?.displayName ?? share.sharedWithUser?.username ?? '?')[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.shareInfo}>
              <Text style={styles.shareName}>
                {share.sharedWithUser?.displayName ?? share.sharedWithUser?.username}
              </Text>
              <Text style={styles.shareEmail}>{share.sharedWithUser?.email}</Text>
            </View>
            <TouchableOpacity onPress={() => handleRevoke(share.id, share.sharedWithUser?.username ?? 'user')}>
              <Ionicons name="close-circle-outline" size={22} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {pendingInvites.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending invitations ({pendingInvites.length})</Text>
          {pendingInvites.map((inv) => (
            <View key={inv.id} style={styles.pendingRow}>
              <View style={styles.pendingIcon}>
                <Ionicons name="mail-outline" size={16} color="#f97316" />
              </View>
              <View style={styles.shareInfo}>
                <Text style={styles.shareName}>{inv.inviteeEmail}</Text>
                <Text style={styles.shareEmail}>
                  Invite expires {new Date(inv.expiresAt).toLocaleDateString()}
                </Text>
                {inv.shareExpiresAt ? (
                  <Text style={styles.shareEmail}>
                    Access until {new Date(inv.shareExpiresAt).toLocaleDateString()}
                  </Text>
                ) : null}
              </View>
              <View style={styles.pendingActions}>
                {inv.token ? (
                  <TouchableOpacity style={styles.linkBtn} onPress={() => copyInviteLink(inv.token!)}>
                    <Ionicons name="link-outline" size={16} color={t.accent} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={() => handleCancelInvite(inv.id)}>
                  <Ionicons name="close-circle-outline" size={22} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Public links ({publicLinks.length})</Text>
          <TouchableOpacity style={styles.addLinkBtn} onPress={openPublicModal}>
            <Ionicons name="add" size={14} color={t.accent} />
            <Text style={styles.addLinkBtnText}>New</Text>
          </TouchableOpacity>
        </View>
        {publicLinks.length === 0 ? (
          <Text style={styles.emptyShares}>No active public links</Text>
        ) : null}
        {publicLinks.map((pl) => {
          const diffH = Math.ceil((new Date(pl.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60))
          const expiryStr = diffH < 24 ? `${diffH}h left` : `${Math.ceil(diffH / 24)}d left`
          const copied = publicLinkCopied === pl.token
          return (
            <View key={pl.id} style={styles.publicLinkRow}>
              <View style={styles.publicLinkIcon}>
                <Ionicons name="link" size={16} color={t.accent} />
              </View>
              <View style={styles.shareInfo}>
                <Text style={styles.shareName}>{pl.label ?? 'Public link'}</Text>
                <Text style={styles.shareEmail}>Expires in {expiryStr}</Text>
              </View>
              <TouchableOpacity style={styles.linkBtn} onPress={() => copyPublicLink(pl.token)}>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? '#16A34A' : t.accent} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleRevokePublicLink(pl.id)}>
                <Ionicons name="close-circle-outline" size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )
        })}
      </View>

      {card.isActive ? (
        <TouchableOpacity style={[styles.deleteButton, archiving && styles.buttonDisabled]} onPress={handleArchive} disabled={archiving}>
          {archiving ? <ActivityIndicator size="small" color="#ef4444" style={{ marginRight: 8 }} /> : <Ionicons name="archive-outline" size={18} color="#ef4444" />}
          <Text style={styles.deleteText}>{archiving ? 'Archiving…' : 'Archive card'}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.deleteButton} onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleRestore() }}>
          <Ionicons name="arrow-undo-outline" size={18} color="#16A34A" />
          <Text style={[styles.deleteText, { color: '#16A34A' }]}>Restore card</Text>
        </TouchableOpacity>
      )}

      {/* Public link creation modal */}
      <Modal
        visible={showPublicModal}
        animationType="none"
        transparent
        onRequestClose={() => { setShowPublicModal(false); setNewPublicLink(null); setPublicLabel('') }}
      >
        <KeyboardAvoidingView style={styles.shareModalOuter} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.shareModalScrim} activeOpacity={1} onPress={() => { setShowPublicModal(false); setNewPublicLink(null); setPublicLabel('') }} />
          <Animated.View style={[styles.shareModalSheet, { transform: [{ translateY: sheetAnim }] }]}>
            <View style={styles.shareHandle} />
            <View style={styles.shareHeader}>
              <View style={[styles.shareIconWrap, { backgroundColor: '#F0FFF4' }]}>
                <Ionicons name="link" size={20} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shareTitle}>Create public link</Text>
                <Text style={styles.shareSubtitle}>Anyone with the link can view this card</Text>
              </View>
              <TouchableOpacity style={styles.shareCloseBtn} onPress={() => { setShowPublicModal(false); setNewPublicLink(null); setPublicLabel('') }}>
                <Ionicons name="close" size={18} color={t.textMuted} />
              </TouchableOpacity>
            </View>

            {newPublicLink ? (
              <View style={styles.publicSuccessCard}>
                <Ionicons name="checkmark-circle" size={28} color="#16A34A" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.shareSuccessTitle}>
                    {justCreatedPublicLink ? 'Link created!' : 'Active public link'}
                  </Text>
                  <Text style={styles.shareSuccessMsg} numberOfLines={1}>{`${serverUrl}/public/${newPublicLink.token}`}</Text>
                  {newPublicLink.label ? (
                    <Text style={styles.shareSuccessSub} numberOfLines={1}>{newPublicLink.label}</Text>
                  ) : null}
                  <Text style={styles.shareSuccessSub}>
                    Expires {new Date(newPublicLink.expiresAt).toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.copyLinkBtn}
                  onPress={() => copyPublicLink(newPublicLink.token)}
                >
                  <Ionicons name={publicLinkCopied === newPublicLink.token ? 'checkmark' : 'copy-outline'} size={15} color="#16A34A" />
                  <Text style={[styles.copyLinkText, { color: '#16A34A' }]}>
                    {publicLinkCopied === newPublicLink.token ? 'Copied!' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {!newPublicLink ? (
              <>
                <View style={styles.shareInputRow}>
                  <Ionicons name="pricetag-outline" size={18} color={t.textSubtle} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.shareInput}
                    placeholder="Label (optional, e.g. for family)"
                    placeholderTextColor={t.textSubtle}
                    value={publicLabel}
                    onChangeText={setPublicLabel}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    maxLength={60}
                  />
                  {publicLabel.length > 0 && (
                    <TouchableOpacity onPress={() => setPublicLabel('')}>
                      <Ionicons name="close-circle" size={18} color={t.textSubtle} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.durationSection}>
                  <Text style={styles.durationLabel}>Link expires after</Text>
                  <View style={styles.durationRow}>
                    {[
                      { key: '1h', label: '1 hour' },
                      { key: '24h', label: '24 hours' },
                      { key: '7d', label: '7 days' },
                      { key: '30d', label: '30 days' },
                    ].map(({ key, label }) => (
                      <TouchableOpacity
                        key={key}
                        style={[styles.durationChip, publicDuration === key && styles.durationChipActive]}
                        onPress={() => setPublicDuration(key)}
                      >
                        <Text style={[styles.durationChipText, publicDuration === key && styles.durationChipTextActive]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {publicError ? (
                  <View style={styles.shareErrorRow}>
                    <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                    <Text style={styles.shareErrorMsg}>{publicError}</Text>
                  </View>
                ) : null}

                <View style={styles.publicInfoBox}>
                  <Ionicons name="information-circle-outline" size={15} color={t.accent} />
                  <Text style={styles.publicInfoText}>
                    No account needed to view. Suitable for showing at checkout.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.shareSendBtn, { backgroundColor: '#16A34A' }, creatingPublic && styles.shareSendBtnDisabled]}
                  onPress={handleCreatePublicLink}
                  disabled={creatingPublic}
                >
                  {creatingPublic ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <Ionicons name="link" size={16} color="#fff" />
                      <Text style={styles.shareSendBtnText}>Generate link</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.shareSendBtn, { backgroundColor: t.accent, marginTop: 16 }]}
                onPress={() => { setNewPublicLink(null); setJustCreatedPublicLink(false); setPublicLabel(''); setPublicDuration('24h') }}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.shareSendBtnText}>Create another</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Share modal */}
      <Modal
        visible={showShareModal}
        animationType="none"
        transparent
        onRequestClose={() => { setShowShareModal(false); setShareSuccess(''); setShareError(''); setShareDuration(null) }}
      >
        <KeyboardAvoidingView style={styles.shareModalOuter} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.shareModalScrim} activeOpacity={1} onPress={() => { setShowShareModal(false); setShareSuccess(''); setShareError('') }} />
          <Animated.View style={[styles.shareModalSheet, { transform: [{ translateY: sheetAnim }] }]}>
            <View style={styles.shareHandle} />
            <View style={styles.shareHeader}>
              <View style={styles.shareIconWrap}>
                <Ionicons name="person-add" size={20} color={t.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shareTitle}>Share card</Text>
                <Text style={styles.shareSubtitle}>Invite someone by email or username</Text>
              </View>
              <TouchableOpacity style={styles.shareCloseBtn} onPress={() => { setShowShareModal(false); setShareSuccess(''); setShareError('') }}>
                <Ionicons name="close" size={18} color={t.textMuted} />
              </TouchableOpacity>
            </View>

            {shareSuccess ? (
              <View style={styles.shareSuccessCard}>
                <Ionicons name="checkmark-circle" size={28} color="#16A34A" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.shareSuccessTitle}>Invitation sent!</Text>
                  <Text style={styles.shareSuccessMsg}>{shareSuccess}</Text>
                </View>
                {shareSuccessToken ? (
                  <TouchableOpacity style={styles.copyLinkBtn} onPress={() => copyInviteLink(shareSuccessToken)}>
                    <Ionicons name={linkCopied ? 'checkmark' : 'link-outline'} size={15} color={t.accent} />
                    <Text style={styles.copyLinkText}>{linkCopied ? 'Copied!' : 'Copy link'}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            <View style={[styles.shareInputRow, shareError ? styles.shareInputRowError : null]}>
              <Ionicons name="search-outline" size={18} color={shareError ? '#DC2626' : t.textSubtle} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.shareInput}
                placeholder="Email or username"
                placeholderTextColor={t.textSubtle}
                value={shareIdentifier}
                onChangeText={(v) => { setShareIdentifier(v); setShareError(''); setShareSuccess('') }}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="send"
                onSubmitEditing={handleShare}
              />
              {shareIdentifier.length > 0 && !sharing && (
                <TouchableOpacity onPress={() => { setShareIdentifier(''); setShareError(''); setShareSuccess('') }}>
                  <Ionicons name="close-circle" size={18} color={t.textSubtle} />
                </TouchableOpacity>
              )}
              {sharing && <ActivityIndicator size="small" color={t.accent} />}
            </View>

            {shareError ? (
              <View style={styles.shareErrorRow}>
                <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                <Text style={styles.shareErrorMsg}>{shareError}</Text>
              </View>
            ) : null}

            <View style={styles.durationSection}>
              <Text style={styles.durationLabel}>Access duration</Text>
              <View style={styles.durationRow}>
                {[
                  { key: null, label: 'No expiry' },
                  { key: '1h', label: '1 hour' },
                  { key: '24h', label: '24 hours' },
                  { key: '7d', label: '7 days' },
                  { key: '30d', label: '30 days' },
                ].map(({ key, label }) => (
                  <TouchableOpacity
                    key={String(key)}
                    style={[styles.durationChip, shareDuration === key && styles.durationChipActive]}
                    onPress={() => setShareDuration(key)}
                  >
                    <Text style={[styles.durationChipText, shareDuration === key && styles.durationChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.shareSendBtn, (sharing || !shareIdentifier.trim()) && styles.shareSendBtnDisabled]}
              onPress={handleShare}
              disabled={sharing || !shareIdentifier.trim()}
            >
              {sharing ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={styles.shareSendBtnText}>Send invitation</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>

    {confirmModal && (
      <View style={[StyleSheet.absoluteFillObject, Platform.OS === 'web' ? { position: 'fixed' } : {}, { zIndex: 100, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <View style={[styles.modalContent, styles.confirmContent, { backgroundColor: t.surface }]}>
          <Text style={styles.modalTitle}>{confirmModal.title}</Text>
          <Text style={styles.confirmMessage}>{confirmModal.message}</Text>
          <TouchableOpacity
            style={[styles.modalButton, confirmModal.destructive && styles.destructiveButton, confirmRunning && styles.buttonDisabled]}
            onPress={runConfirm}
            disabled={confirmRunning}
          >
            <Text style={styles.modalButtonText}>{confirmRunning ? 'Please wait…' : confirmModal.confirmLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setConfirmModal(null)} style={styles.modalCancel} disabled={confirmRunning}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}

    {card && (
      <BarcodeScanModal
        visible={showBarcodeModal}
        value={card.cardNumber}
        type={card.barcodeType as BarcodeType}
        storeName={card.storeName}
        onClose={() => setShowBarcodeModal(false)}
      />
    )}
  </View>
  )
}
