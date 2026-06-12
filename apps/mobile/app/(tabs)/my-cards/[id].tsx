import { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, ApiError } from '../../../lib/api'
import { BarcodeDisplay } from '../../../components/BarcodeDisplay'
import type { Card, CardShare, BarcodeType } from '@memberr/shared'

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [card, setCard] = useState<Card | null>(null)
  const [shares, setShares] = useState<CardShare[]>([])
  const [loading, setLoading] = useState(true)
  const [shareEmail, setShareEmail] = useState('')
  const [sharing, setSharing] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cardData, shareData] = await Promise.all([
        api.cards.get(id),
        api.shares.list(id),
      ])
      setCard(cardData)
      setShares(shareData)
    } catch {
      Alert.alert('Error', 'Failed to load card')
    } finally {
      setLoading(false)
    }
  }, [id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleShare() {
    if (!shareEmail.trim()) return
    setSharing(true)
    try {
      await api.shares.share(id, { email: shareEmail.trim() })
      setShareEmail('')
      setShowShareModal(false)
      await load()
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed to share')
    } finally {
      setSharing(false)
    }
  }

  async function handleRevoke(shareId: string, username: string) {
    Alert.alert(`Revoke access`, `Remove ${username}'s access to this card?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          await api.shares.revoke(id, shareId).catch(() => {})
          await load()
        },
      },
    ])
  }

  async function handleDelete() {
    Alert.alert('Delete card', 'This will also remove access for anyone you shared it with.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.cards.remove(id).catch(() => {})
          router.back()
        },
      },
    ])
  }

  if (loading || !card) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.cardHero, { backgroundColor: card.color ?? '#6366f1' }]}>
        <Text style={styles.heroStore}>{card.storeName}</Text>
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

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Shared with ({shares.length})</Text>
          <TouchableOpacity onPress={() => setShowShareModal(true)}>
            <Ionicons name="person-add-outline" size={22} color="#6366f1" />
          </TouchableOpacity>
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
            <TouchableOpacity
              onPress={() => handleRevoke(share.id, share.sharedWithUser?.username ?? 'user')}
            >
              <Ionicons name="close-circle-outline" size={22} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={18} color="#ef4444" />
        <Text style={styles.deleteText}>Delete card</Text>
      </TouchableOpacity>

      <Modal visible={showShareModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Share with someone</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Their email address"
              placeholderTextColor="#9ca3af"
              value={shareEmail}
              onChangeText={setShareEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.modalButton, sharing && styles.buttonDisabled]}
              onPress={handleShare}
              disabled={sharing}
            >
              <Text style={styles.modalButtonText}>{sharing ? 'Sharing…' : 'Send invitation'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowShareModal(false)} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardHero: { padding: 28, paddingTop: 40 },
  heroStore: { fontSize: 28, fontWeight: '800', color: '#fff' },
  heroNumber: { fontSize: 18, color: 'rgba(255,255,255,0.85)', letterSpacing: 2, marginTop: 12 },
  barcodeSection: { backgroundColor: '#fff', padding: 24, alignItems: 'center', gap: 8 },
  barcodeLabel: { fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 },
  section: { backgroundColor: '#fff', padding: 20, marginTop: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  notes: { fontSize: 15, color: '#374151', lineHeight: 22 },
  emptyShares: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingVertical: 12 },
  shareRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  shareAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#ede9fe',
    justifyContent: 'center', alignItems: 'center',
  },
  shareAvatarText: { fontSize: 16, fontWeight: '700', color: '#6366f1' },
  shareInfo: { flex: 1 },
  shareName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  shareEmail: { fontSize: 13, color: '#6b7280' },
  deleteButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 20, marginTop: 12, marginBottom: 40,
  },
  deleteText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  modalInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#111827',
  },
  modalButton: {
    backgroundColor: '#6366f1', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 12,
  },
  buttonDisabled: { opacity: 0.6 },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalCancel: { paddingVertical: 14, alignItems: 'center' },
  modalCancelText: { color: '#6b7280', fontSize: 15 },
})
