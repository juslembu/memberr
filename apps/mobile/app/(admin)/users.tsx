import { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, ApiError } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { t } from '../../lib/theme'
import type { User } from '@memberr/shared'

type AdminUser = Pick<User, 'id' | 'email' | 'username' | 'displayName' | 'isAdmin' | 'createdAt'>

const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}

export default function AdminUsersScreen() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    try {
      const data = await api.admin.listUsers()
      setUsers(data)
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleDelete() {
    if (!confirmId) return
    setDeleting(true)
    try {
      await api.admin.deleteUser(confirmId)
      setConfirmId(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete user')
      setConfirmId(null)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    )
  }

  const confirmUser = users.find((u) => u.id === confirmId)

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true) }}
            tintColor={t.accent}
          />
        }
        renderItem={({ item }) => {
          const initials = (item.displayName ?? item.username)
            .split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
          const isSelf = item.id === me?.id

          return (
            <View style={styles.row}>
              <View style={[styles.avatar, item.isAdmin && styles.avatarAdmin]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.username}>@{item.username}</Text>
                  {item.isAdmin && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>admin</Text>
                    </View>
                  )}
                  {isSelf && (
                    <View style={styles.selfBadge}>
                      <Text style={styles.selfBadgeText}>you</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.email}>{item.email}</Text>
                <Text style={styles.date}>
                  Joined {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              {!isSelf && (
                <TouchableOpacity
                  style={[styles.deleteBtn, webCursor]}
                  onPress={() => setConfirmId(item.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              )}
            </View>
          )
        }}
      />

      <Modal
        visible={!!confirmId}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmId(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Delete user?</Text>
            <Text style={styles.dialogBody}>
              This will permanently delete{' '}
              <Text style={{ fontWeight: '700' }}>@{confirmUser?.username}</Text> and all their cards and shares.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, webCursor]}
                onPress={() => setConfirmId(null)}
                disabled={deleting}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, deleting && styles.btnDisabled, webCursor]}
                onPress={handleDelete}
                disabled={deleting}
              >
                <Text style={styles.confirmText}>{deleting ? 'Deleting…' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  errorBanner: { backgroundColor: t.errorBg, padding: 12, margin: 16, marginBottom: 0, borderRadius: 10 },
  errorText: { color: t.errorText, fontSize: 14, textAlign: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: t.text,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarAdmin: { backgroundColor: t.brand },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 },
  username: { fontSize: 15, fontWeight: '700', color: t.text },
  adminBadge: { backgroundColor: t.brand, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  adminBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  selfBadge: { backgroundColor: t.accentBg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  selfBadgeText: { color: t.accent, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  email: { fontSize: 13, color: t.textMuted },
  date: { fontSize: 11, color: t.textSubtle, marginTop: 2 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialog: {
    backgroundColor: t.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  dialogTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginBottom: 8, letterSpacing: -0.3 },
  dialogBody: { fontSize: 14, color: t.textMuted, lineHeight: 20, marginBottom: 20 },
  dialogActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: t.border, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: t.text },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#DC2626', alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  confirmText: { fontSize: 15, fontWeight: '600', color: '#fff' },
})
