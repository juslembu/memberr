import { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, ApiError } from '../../../lib/api'
import type { Invitation } from '@memberr/shared'

export default function InvitationsScreen() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    try {
      const data = await api.invitations.incoming()
      setInvitations(data)
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
      await load()
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed to accept')
    }
  }

  async function handleDecline(invitation: Invitation) {
    try {
      await api.invitations.decline(invitation.id)
      await load()
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed to decline')
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={invitations}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true) }}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="mail-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No pending invitations</Text>
            <Text style={styles.emptySubtext}>
              When someone shares a card with you, it'll appear here
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.cardAccent, { backgroundColor: item.card?.color ?? '#6366f1' }]} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#374151' },
  emptySubtext: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardAccent: { width: 6, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 16 },
  storeName: { fontSize: 17, fontWeight: '700', color: '#111827' },
  from: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  actions: { flexDirection: 'column', gap: 6, paddingRight: 12 },
  acceptBtn: {
    backgroundColor: '#6366f1', borderRadius: 8,
    paddingVertical: 7, paddingHorizontal: 14,
  },
  acceptText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  declineBtn: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8,
    paddingVertical: 7, paddingHorizontal: 14,
  },
  declineText: { color: '#6b7280', fontSize: 13 },
})
