import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, ApiError } from '../../lib/api'
import type { Invitation } from '@memberr/shared'

export default function InviteAcceptScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const router = useRouter()
  const [invite, setInvite] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [done, setDone] = useState<'accepted' | 'declined' | null>(null)
  const [error, setError] = useState('')

  useFocusEffect(useCallback(() => {
    api.invitations.getByToken(token)
      .then(setInvite)
      .catch(() => setError('Invitation not found or has expired.'))
      .finally(() => setLoading(false))
  }, [token]))

  async function accept() {
    setActing(true)
    setError('')
    try {
      await api.invitations.acceptByToken(token)
      setDone('accepted')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to accept invitation')
    } finally {
      setActing(false)
    }
  }

  async function decline() {
    setActing(true)
    setError('')
    try {
      await api.invitations.declineByToken(token)
      setDone('declined')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to decline invitation')
    } finally {
      setActing(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    )
  }

  if (done === 'accepted') {
    return (
      <View style={styles.center}>
        <View style={styles.doneIcon}>
          <Ionicons name="checkmark-circle" size={56} color="#16A34A" />
        </View>
        <Text style={styles.doneTitle}>Card added!</Text>
        <Text style={styles.doneSub}>
          {invite?.card?.storeName} has been added to your cards.
        </Text>
        <TouchableOpacity style={styles.ctaBtn} onPress={() => router.replace('/(tabs)/my-cards')}>
          <Text style={styles.ctaBtnText}>View my cards</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (done === 'declined') {
    return (
      <View style={styles.center}>
        <View style={[styles.doneIcon, styles.doneIconGray]}>
          <Ionicons name="close-circle" size={56} color="#94A3B8" />
        </View>
        <Text style={styles.doneTitle}>Invitation declined</Text>
        <TouchableOpacity style={[styles.ctaBtn, styles.ctaBtnGray]} onPress={() => router.replace('/(tabs)/my-cards')}>
          <Text style={styles.ctaBtnText}>Back to cards</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const card = invite?.card
  const sender = invite?.invitedByUser
  const senderName = sender?.displayName ?? sender?.username ?? 'Someone'
  const cardBg = card?.color ?? '#0EA5E9'

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Card invitation</Text>
        <View style={{ width: 38 }} />
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={32} color="#DC2626" />
          <Text style={styles.errorTitle}>Invitation unavailable</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => router.replace('/(tabs)/my-cards')}>
            <Text style={styles.ctaBtnText}>Go to cards</Text>
          </TouchableOpacity>
        </View>
      ) : invite ? (
        <View style={styles.content}>
          <View style={[styles.cardPreview, { backgroundColor: cardBg }]}>
            <View style={styles.cardPreviewTop}>
              <Text style={styles.cardPreviewName}>{card?.storeName}</Text>
              {card?.logoUrl ? <Image source={{ uri: card.logoUrl }} style={styles.cardPreviewLogo} resizeMode="contain" /> : null}
            </View>
          </View>

          <Text style={styles.inviteMsg}>
            <Text style={styles.inviteSender}>{senderName}</Text>
            {' '}wants to share their{' '}
            <Text style={styles.inviteSender}>{card?.storeName}</Text>
            {' '}membership card with you.
          </Text>

          {invite.status !== 'pending' ? (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>This invitation has already been {invite.status}.</Text>
            </View>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.declineBtn, acting && styles.btnDisabled]}
                onPress={decline}
                disabled={acting}
              >
                {acting ? <ActivityIndicator size="small" color="#64748B" /> : <Text style={styles.declineBtnText}>Decline</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.acceptBtn, acting && styles.btnDisabled]}
                onPress={accept}
                disabled={acting}
              >
                {acting ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.acceptBtnText}>Accept</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 56, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  content: { padding: 24, gap: 20 },
  cardPreview: { borderRadius: 16, padding: 24, minHeight: 120, justifyContent: 'flex-end', overflow: 'hidden' },
  cardPreviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardPreviewName: { fontSize: 22, fontWeight: '800', color: '#fff', flex: 1 },
  cardPreviewLogo: { width: 52, height: 52, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  inviteMsg: { fontSize: 16, color: '#374151', lineHeight: 24, textAlign: 'center' },
  inviteSender: { fontWeight: '700', color: '#0F172A' },
  statusBadge: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 14 },
  statusText: { textAlign: 'center', color: '#64748B', fontSize: 14 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  declineBtn: { flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  declineBtnText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  acceptBtn: {
    flex: 2, flexDirection: 'row', gap: 8,
    backgroundColor: '#0EA5E9', borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  acceptBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  doneIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' },
  doneIconGray: { backgroundColor: '#F1F5F9' },
  doneTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  doneSub: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22 },
  ctaBtn: { backgroundColor: '#0EA5E9', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  ctaBtnGray: { backgroundColor: '#64748B' },
  ctaBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  errorCard: { margin: 24, backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', gap: 12 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  errorMsg: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
})
