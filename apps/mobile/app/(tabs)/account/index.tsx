import { useMemo, useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../hooks/useAuth'
import { api, ApiError, APP_VERSION } from '../../../lib/api'
import { getServerUrl, clearServerUrl } from '../../../lib/serverUrl'
import { isBiometricAvailable, getBiometricEnabled, setBiometricEnabled, authenticateWithBiometric } from '../../../lib/biometric'
import { useTheme } from '../../../lib/ThemeContext'
import { useThemePref, ThemePref } from '../../../lib/ThemeContext'
import type { Theme } from '../../../lib/theme'

const GITHUB_URL = 'https://github.com/juslembu/memberr'

const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    content: { paddingBottom: 48 },

    profileSection: { alignItems: 'center', paddingTop: 40, paddingBottom: 32, paddingHorizontal: 24 },
    avatar: {
      width: 80, height: 80, borderRadius: 40, backgroundColor: t.accent,
      justifyContent: 'center', alignItems: 'center', marginBottom: 16,
      shadowColor: t.accent, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    },
    avatarText: { fontSize: 28, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
    name: { fontSize: 22, fontWeight: '700', color: t.text, letterSpacing: -0.4, marginBottom: 4 },
    email: { fontSize: 14, color: t.textMuted },

    infoSection: { marginHorizontal: 16, backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
    actionsSection: { marginHorizontal: 16, marginTop: 12, backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    actionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
    rowIcon: { marginRight: 14 },
    rowContent: { flex: 1 },
    rowLabel: { fontSize: 11, fontWeight: '600', color: t.textSubtle, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
    rowValue: { fontSize: 15, color: t.text, fontWeight: '500' },
    actionText: { flex: 1, fontSize: 15, fontWeight: '600', color: t.text },
    divider: { height: 1, backgroundColor: t.border, marginLeft: 48 },

    segmented: {
      flexDirection: 'row', borderRadius: 8, borderWidth: 1, borderColor: t.border,
      overflow: 'hidden', backgroundColor: t.bg,
    },
    segBtn: { paddingHorizontal: 11, paddingVertical: 6 },
    segBtnActive: { backgroundColor: t.accent },
    segText: { fontSize: 12, fontWeight: '600', color: t.textMuted },
    segTextActive: { color: '#fff' },

    adminBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12,
      backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border,
      paddingVertical: 16, paddingHorizontal: 20,
    },
    adminBtnText: { fontSize: 16, fontWeight: '600', color: t.text },
    logoutBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12,
      backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: '#FEE2E2',
      paddingVertical: 16, paddingHorizontal: 20,
    },
    logoutText: { fontSize: 16, fontWeight: '600', color: '#DC2626' },

    ossSection: {
      marginHorizontal: 16, marginTop: 28, paddingTop: 24,
      borderTopWidth: 1, borderTopColor: t.border,
      alignItems: 'center', gap: 4,
    },
    ossTitle: { fontSize: 13, fontWeight: '700', color: t.textMuted, letterSpacing: -0.1 },
    ossBody: { fontSize: 12, color: t.textSubtle, textAlign: 'center', marginBottom: 12 },
    versionText: { fontSize: 11, color: t.textSubtle, marginTop: 8 },
    githubBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderWidth: 1, borderColor: t.border, borderRadius: 20,
      paddingVertical: 9, paddingHorizontal: 18,
      backgroundColor: t.surface,
    },
    githubText: { fontSize: 14, fontWeight: '600', color: t.text },
    githubExternal: { marginLeft: 2 },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    dialog: {
      backgroundColor: t.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 400,
      shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12,
    },
    dialogTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginBottom: 16, letterSpacing: -0.3 },
    dialogBody: { fontSize: 14, color: t.textMuted, lineHeight: 20, marginBottom: 20 },
    errorBox: { backgroundColor: t.errorBg, borderRadius: 8, padding: 10, marginBottom: 12 },
    errorText: { color: t.errorText, fontSize: 13, textAlign: 'center' },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: t.textMuted, marginBottom: 6, marginTop: 8 },
    input: {
      borderWidth: 1, borderColor: t.border, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: t.text, backgroundColor: t.bg, marginBottom: 4,
    },
    dialogActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: t.border, alignItems: 'center' },
    cancelText: { fontSize: 15, fontWeight: '600', color: t.text },
    confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: t.accent, alignItems: 'center' },
    confirmBtnRed: { backgroundColor: '#DC2626' },
    btnDisabled: { opacity: 0.6 },
    confirmText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  })
}

export default function AccountScreen() {
  const t = useTheme()
  const styles = useMemo(() => makeStyles(t), [t])
  const { pref, setPref } = useThemePref()
  const { user, setUser, logout } = useAuth()
  const router = useRouter()

  const [logoutVisible, setLogoutVisible] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // Server (native only — web is always on the origin it was loaded from)
  const [serverUrl, setServerUrlState] = useState('')
  const [changeServerVisible, setChangeServerVisible] = useState(false)
  const [changingServer, setChangingServer] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricEnabled, setBiometricEnabledState] = useState(false)

  useEffect(() => {
    if (Platform.OS === 'web') return
    isBiometricAvailable().then(setBiometricAvailable)
    getBiometricEnabled().then(setBiometricEnabledState)
  }, [])

  useEffect(() => {
    if (Platform.OS !== 'web') getServerUrl().then(setServerUrlState)
  }, [])

  async function handleChangeServer() {
    setChangingServer(true)
    await api.auth.logout().catch(() => {})
    await clearServerUrl()
    setUser(null)
    router.replace('/server-setup')
  }

  async function toggleBiometric() {
    const next = !biometricEnabled
    if (next) {
      const success = await authenticateWithBiometric('Confirm to enable biometric lock')
      if (!success) return
    }
    await setBiometricEnabled(next)
    setBiometricEnabledState(next)
  }

  // Edit profile modal
  const [profileVisible, setProfileVisible] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  // Change password modal
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  const initials = user
    ? (user.displayName ?? user.username)
        .split(' ')
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase() ?? '')
        .join('')
    : '?'

  function openProfile() {
    setDisplayName(user?.displayName ?? '')
    setUsername(user?.username ?? '')
    setEmail(user?.email ?? '')
    setProfileError('')
    setProfileVisible(true)
  }

  async function handleSaveProfile() {
    setProfileError('')
    const updates: Record<string, string | null> = {}
    if (displayName.trim() !== (user?.displayName ?? '')) updates.displayName = displayName.trim() || null
    if (username.trim() !== user?.username) updates.username = username.trim()
    if (email.trim() !== user?.email) updates.email = email.trim()
    if (Object.keys(updates).length === 0) { setProfileVisible(false); return }

    setProfileSaving(true)
    try {
      const updated = await api.auth.updateProfile(updates)
      setUser(updated)
      setProfileVisible(false)
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : 'Failed to update profile')
    } finally {
      setProfileSaving(false)
    }
  }

  function openPassword() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
    setPasswordVisible(true)
  }

  async function handleSavePassword() {
    if (!currentPassword || !newPassword) { setPasswordError('All fields are required'); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return }
    if (newPassword.length < 8) { setPasswordError('New password must be at least 8 characters'); return }
    setPasswordError('')
    setPasswordSaving(true)
    try {
      await api.auth.changePassword({ currentPassword, newPassword })
      setPasswordVisible(false)
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Failed to change password')
    } finally {
      setPasswordSaving(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    await logout()
  }

  const displayLabel = user?.displayName ?? user?.username ?? '—'

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{displayLabel}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.row}>
          <Ionicons name="person-outline" size={18} color={t.textMuted} style={styles.rowIcon} />
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>Username</Text>
            <Text style={styles.rowValue}>@{user?.username}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Ionicons name="mail-outline" size={18} color={t.textMuted} style={styles.rowIcon} />
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{user?.email}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={18} color={t.textMuted} style={styles.rowIcon} />
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>Member since</Text>
            <Text style={styles.rowValue}>
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
                : '—'}
            </Text>
          </View>
        </View>
      </View>

      {Platform.OS !== 'web' && (
        <View style={styles.actionsSection}>
          <TouchableOpacity style={[styles.row, webCursor]} onPress={() => setChangeServerVisible(true)}>
            <Ionicons name="server-outline" size={18} color={t.textMuted} style={styles.rowIcon} />
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Server</Text>
              <Text style={styles.rowValue} numberOfLines={1}>{serverUrl}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={t.textSubtle} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.actionsSection}>
        <TouchableOpacity style={[styles.actionRow, webCursor]} onPress={openProfile}>
          <Ionicons name="create-outline" size={18} color={t.textMuted} style={styles.rowIcon} />
          <Text style={styles.actionText}>Edit profile</Text>
          <Ionicons name="chevron-forward" size={16} color={t.textSubtle} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={[styles.actionRow, webCursor]} onPress={openPassword}>
          <Ionicons name="lock-closed-outline" size={18} color={t.textMuted} style={styles.rowIcon} />
          <Text style={styles.actionText}>Change password</Text>
          <Ionicons name="chevron-forward" size={16} color={t.textSubtle} />
        </TouchableOpacity>
        <View style={styles.divider} />
        {biometricAvailable && (
          <TouchableOpacity style={[styles.actionRow, webCursor]} onPress={toggleBiometric}>
            <Ionicons name="finger-print-outline" size={18} color={t.textMuted} style={styles.rowIcon} />
            <Text style={styles.actionText}>Biometric lock</Text>
            <Ionicons name={biometricEnabled ? 'checkbox' : 'square-outline'} size={22} color={biometricEnabled ? t.accent : t.textSubtle} />
          </TouchableOpacity>
        )}
        {biometricAvailable && <View style={styles.divider} />}
        <View style={[styles.actionRow, { justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Ionicons name="contrast-outline" size={18} color={t.textMuted} />
            <Text style={styles.actionText}>Appearance</Text>
          </View>
          <View style={styles.segmented}>
            {(['light', 'system', 'dark'] as ThemePref[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.segBtn, pref === p && styles.segBtnActive, webCursor]}
                onPress={() => setPref(p)}
              >
                <Text style={[styles.segText, pref === p && styles.segTextActive]}>
                  {p === 'light' ? 'Light' : p === 'system' ? 'Auto' : 'Dark'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {user?.isAdmin && (
        <TouchableOpacity style={[styles.adminBtn, webCursor]} onPress={() => router.push('/(admin)')}>
          <Ionicons name="shield-checkmark-outline" size={18} color={t.accent} />
          <Text style={styles.adminBtnText}>Admin Panel</Text>
          <Ionicons name="chevron-forward" size={16} color={t.textSubtle} style={{ marginLeft: 'auto' } as any} />
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.logoutBtn, webCursor]} onPress={() => setLogoutVisible(true)}>
        <Ionicons name="log-out-outline" size={18} color="#DC2626" />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>

      <View style={styles.ossSection}>
        <Text style={styles.ossTitle}>Memberr is open source</Text>
        <Text style={styles.ossBody}>Self-hostable, MIT licensed, built in the open.</Text>
        <TouchableOpacity
          style={[styles.githubBtn, webCursor]}
          onPress={() => Linking.openURL(GITHUB_URL)}
        >
          <Ionicons name="logo-github" size={20} color={t.text} />
          <Text style={styles.githubText}>View on GitHub</Text>
          <Ionicons name="open-outline" size={14} color={t.textSubtle} style={styles.githubExternal} />
        </TouchableOpacity>
        <Text style={styles.versionText}>Version {APP_VERSION}</Text>
      </View>

      {/* Edit profile modal */}
      <Modal visible={profileVisible} transparent animationType="fade" onRequestClose={() => setProfileVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Edit profile</Text>
            {profileError ? <View style={styles.errorBox}><Text style={styles.errorText}>{profileError}</Text></View> : null}
            <Text style={styles.fieldLabel}>Display name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name (optional)"
              placeholderTextColor={t.textSubtle}
              autoCapitalize="words"
            />
            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="username"
              placeholderTextColor={t.textSubtle}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              placeholderTextColor={t.textSubtle}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity style={[styles.cancelBtn, webCursor]} onPress={() => setProfileVisible(false)} disabled={profileSaving}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, profileSaving && styles.btnDisabled, webCursor]} onPress={handleSaveProfile} disabled={profileSaving}>
                {profileSaving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.confirmText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change password modal */}
      <Modal visible={passwordVisible} transparent animationType="fade" onRequestClose={() => setPasswordVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Change password</Text>
            {passwordError ? <View style={styles.errorBox}><Text style={styles.errorText}>{passwordError}</Text></View> : null}
            <Text style={styles.fieldLabel}>Current password</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current password"
              placeholderTextColor={t.textSubtle}
              secureTextEntry
            />
            <Text style={styles.fieldLabel}>New password</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Min 8 characters"
              placeholderTextColor={t.textSubtle}
              secureTextEntry
            />
            <Text style={styles.fieldLabel}>Confirm new password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat new password"
              placeholderTextColor={t.textSubtle}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSavePassword}
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity style={[styles.cancelBtn, webCursor]} onPress={() => setPasswordVisible(false)} disabled={passwordSaving}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, passwordSaving && styles.btnDisabled, webCursor]} onPress={handleSavePassword} disabled={passwordSaving}>
                {passwordSaving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.confirmText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change server confirm modal */}
      <Modal visible={changeServerVisible} transparent animationType="fade" onRequestClose={() => setChangeServerVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Change server?</Text>
            <Text style={styles.dialogBody}>
              You'll be signed out and asked to enter a new server address.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity style={[styles.cancelBtn, webCursor]} onPress={() => setChangeServerVisible(false)} disabled={changingServer}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, changingServer && styles.btnDisabled, webCursor]} onPress={handleChangeServer} disabled={changingServer}>
                {changingServer
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.confirmText}>Continue</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout confirm modal */}
      <Modal visible={logoutVisible} transparent animationType="fade" onRequestClose={() => setLogoutVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Log out?</Text>
            <Text style={styles.dialogBody}>You'll need to sign in again to access your cards.</Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity style={[styles.cancelBtn, webCursor]} onPress={() => setLogoutVisible(false)} disabled={loggingOut}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, styles.confirmBtnRed, loggingOut && styles.btnDisabled, webCursor]} onPress={handleLogout} disabled={loggingOut}>
                <Text style={styles.confirmText}>{loggingOut ? 'Logging out…' : 'Log out'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}
