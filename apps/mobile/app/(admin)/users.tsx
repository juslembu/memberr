import { useMemo, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, ApiError } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../lib/ThemeContext'
import type { Theme } from '../../lib/theme'
import type { User } from '@memberr/shared'

type AdminUser = Pick<User, 'id' | 'email' | 'username' | 'displayName' | 'isAdmin' | 'createdAt'>

const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16 },
    errorBanner: { backgroundColor: t.errorBg, padding: 12, margin: 16, marginBottom: 0, borderRadius: 10 },
    errorText: { color: t.errorText, fontSize: 14, textAlign: 'center' },

    row: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface,
      borderRadius: 12, padding: 14, marginBottom: 10,
      shadowColor: t.text, shadowOpacity: 0.05, shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    avatar: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: t.accent,
      justifyContent: 'center', alignItems: 'center', marginRight: 12,
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
      width: 36, height: 36, borderRadius: 8, backgroundColor: '#FEF2F2',
      justifyContent: 'center', alignItems: 'center', marginLeft: 8,
    },
    resetBtn: {
      width: 36, height: 36, borderRadius: 8, backgroundColor: t.accentBg,
      justifyContent: 'center', alignItems: 'center', marginLeft: 8,
    },
    passwordInput: {
      borderWidth: 1, borderColor: t.border, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: t.text, marginBottom: 16,
    },
    resetErrorText: { color: t.errorText, fontSize: 13, marginBottom: 12, marginTop: -8 },
    resetSuccessIconWrap: { alignItems: 'center', marginBottom: 8 },
    tempPasswordRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: t.bg,
      borderRadius: 10, borderWidth: 1, borderColor: t.border,
      paddingHorizontal: 14, paddingVertical: 12, marginTop: 4, gap: 10,
    },
    tempPasswordText: { flex: 1, fontSize: 17, fontWeight: '700', color: t.text, letterSpacing: 1 },
    copyBtn: { padding: 4 },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    dialog: {
      backgroundColor: t.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 360,
      shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12,
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
}

export default function AdminUsersScreen() {
  const t = useTheme()
  const styles = useMemo(() => makeStyles(t), [t])
  const { user: me } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [resetId, setResetId] = useState<string | null>(null)
  const [customPassword, setCustomPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetResult, setResetResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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

  function openResetModal(id: string) {
    setResetId(id)
    setCustomPassword('')
    setResetError('')
    setResetResult(null)
    setCopied(false)
  }

  function closeResetModal() {
    setResetId(null)
    setCustomPassword('')
    setResetError('')
    setResetResult(null)
    setCopied(false)
  }

  async function handleResetPassword() {
    if (!resetId) return
    setResetting(true)
    setResetError('')
    try {
      const result = await api.admin.resetPassword(resetId, customPassword.trim() || undefined)
      setResetResult(result.temporaryPassword)
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : 'Failed to reset password')
    } finally {
      setResetting(false)
    }
  }

  async function copyResetPassword() {
    if (!resetResult) return
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(resetResult).catch(() => {})
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    )
  }

  const confirmUser = users.find((u) => u.id === confirmId)
  const resetUser = users.find((u) => u.id === resetId)

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
              <TouchableOpacity
                style={[styles.resetBtn, webCursor]}
                onPress={() => openResetModal(item.id)}
              >
                <Ionicons name="key-outline" size={18} color={t.accent} />
              </TouchableOpacity>
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

      <Modal visible={!!confirmId} transparent animationType="fade" onRequestClose={() => setConfirmId(null)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Delete user?</Text>
            <Text style={styles.dialogBody}>
              This will permanently delete{' '}
              <Text style={{ fontWeight: '700' }}>@{confirmUser?.username}</Text> and all their cards and shares.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity style={[styles.cancelBtn, webCursor]} onPress={() => setConfirmId(null)} disabled={deleting}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, deleting && styles.btnDisabled, webCursor]} onPress={handleDelete} disabled={deleting}>
                <Text style={styles.confirmText}>{deleting ? 'Deleting…' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!resetId} transparent animationType="fade" onRequestClose={closeResetModal}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            {resetResult ? (
              <>
                <View style={styles.resetSuccessIconWrap}>
                  <Ionicons name="checkmark-circle" size={32} color="#16A34A" />
                </View>
                <Text style={styles.dialogTitle}>Password reset</Text>
                <Text style={styles.dialogBody}>
                  Share this temporary password with{' '}
                  <Text style={{ fontWeight: '700' }}>@{resetUser?.username}</Text> yourself —
                  they'll be required to change it on next login.
                </Text>
                <View style={styles.tempPasswordRow}>
                  <Text style={styles.tempPasswordText} selectable>{resetResult}</Text>
                  <TouchableOpacity style={[styles.copyBtn, webCursor]} onPress={copyResetPassword}>
                    <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={t.accent} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={[styles.confirmBtn, webCursor, { marginTop: 16 }]} onPress={closeResetModal}>
                  <Text style={styles.confirmText}>Done</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.dialogTitle}>Reset password</Text>
                <Text style={styles.dialogBody}>
                  Set a new password for <Text style={{ fontWeight: '700' }}>@{resetUser?.username}</Text>,
                  or leave blank to generate a random one. They'll be required to change it on next login.
                </Text>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="New password (optional)"
                  placeholderTextColor={t.textSubtle}
                  value={customPassword}
                  onChangeText={setCustomPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={false}
                />
                {resetError ? <Text style={styles.resetErrorText}>{resetError}</Text> : null}
                <View style={styles.dialogActions}>
                  <TouchableOpacity style={[styles.cancelBtn, webCursor]} onPress={closeResetModal} disabled={resetting}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.confirmBtn, resetting && styles.btnDisabled, webCursor]} onPress={handleResetPassword} disabled={resetting}>
                    <Text style={styles.confirmText}>{resetting ? 'Resetting…' : 'Reset'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}
