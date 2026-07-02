import { useMemo, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, ApiError } from '../../../lib/api'
import { useTheme } from '../../../lib/ThemeContext'
import type { Theme } from '../../../lib/theme'
import { triggerBadgeRefresh } from '../../../lib/invitationsBadge'
import type { Invitation } from '@memberr/shared'

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },
    list: { padding: 16 },
    errorBanner: { backgroundColor: t.errorBg, padding: 12, margin: 16, marginBottom: 0, borderRadius: 10 },
    errorText: { color: t.errorText, fontSize: 14, textAlign: 'center' },
    empty: { alignItems: 'center', paddingTop: 72, paddingHorizontal: 32, gap: 10 },
    emptyIconWrap: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
      justifyContent: 'center', alignItems: 'center', marginBottom: 4,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: t.text, letterSpacing: -0.3 },
    emptySub: { fontSize: 14, color: t.textMuted, textAlign: 'center', lineHeight: 20 },
    card: {
      backgroundColor: t.surface, borderRadius: 12, marginBottom: 12, overflow: 'hidden',
      flexDirection: 'row', alignItems: 'center',
      shadowColor: t.text, shadowOpacity: 0.06, shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    cardAccent: { width: 4, alignSelf: 'stretch' },
    cardBody: { flex: 1, padding: 16 },
    storeName: { fontSize: 16, fontWeight: '700', color: t.text, letterSpacing: -0.2 },
    from: { fontSize: 13, color: t.textMuted, marginTop: 2 },
    actions: { flexDirection: 'column', gap: 6, paddingVertical: 14, paddingRight: 16 },
    acceptBtn: { backgroundColor: t.accent, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14 },
    acceptText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    declineBtn: { borderWidth: 1, borderColor: t.border, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14 },
    declineText: { color: t.textMuted, fontSize: 13 },
  })
}

export default function InvitationsScreen() {
  const t = useTheme()
  const styles = useMemo(() => makeStyles(t), [t])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    try {
      const data = await api.invitations.incoming()
      setInvitations(data)
      setError(null)
    } catch {}
    finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleAccept(invitation: Invitation) {
    try {
      await api.invitations.accept(invitation.id)
      triggerBadgeRefresh()
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to accept invitation')
    }
  }

  async function handleDecline(invitation: Invitation) {
    try {
      await api.invitations.decline(invitation.id)
      triggerBadgeRefresh()
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to decline invitation')
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <FlatList
        data={invitations}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true) }}
            tintColor={t.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="mail-outline" size={36} color={t.textSubtle} />
            </View>
            <Text style={styles.emptyTitle}>No pending invitations</Text>
            <Text style={styles.emptySub}>
              When someone shares a card with you, it'll appear here
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.cardAccent, { backgroundColor: item.card?.color ?? t.accent }]} />
            <View style={styles.cardBody}>
              <Text style={styles.storeName}>{item.card?.storeName ?? 'Unknown store'}</Text>
              <Text style={styles.from}>
                from {item.invitedByUser?.displayName ?? item.invitedByUser?.username ?? 'someone'}
              </Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item)}>
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(item)}>
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  )
}
