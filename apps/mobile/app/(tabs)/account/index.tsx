import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../hooks/useAuth'
import { t } from '../../../lib/theme'

const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}

export default function AccountScreen() {
  const { user, logout } = useAuth()
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const initials = user
    ? (user.displayName ?? user.username)
        .split(' ')
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase() ?? '')
        .join('')
    : '?'

  const displayName = user?.displayName ?? user?.username ?? '—'

  async function handleLogout() {
    setLoggingOut(true)
    await logout()
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
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
                ? new Date(user.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                  })
                : '—'}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.logoutBtn, webCursor]}
        onPress={() => setConfirmVisible(true)}
      >
        <Ionicons name="log-out-outline" size={18} color="#DC2626" />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>

      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Log out?</Text>
            <Text style={styles.dialogBody}>
              You'll need to sign in again to access your cards.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, webCursor]}
                onPress={() => setConfirmVisible(false)}
                disabled={loggingOut}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, loggingOut && styles.confirmBtnDisabled, webCursor]}
                onPress={handleLogout}
                disabled={loggingOut}
              >
                <Text style={styles.confirmText}>
                  {loggingOut ? 'Logging out…' : 'Log out'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { paddingBottom: 48 },

  profileSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: t.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: t.accent,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: t.text,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  email: { fontSize: 14, color: t.textMuted },

  infoSection: {
    marginHorizontal: 16,
    backgroundColor: t.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowIcon: { marginRight: 14 },
  rowContent: { flex: 1 },
  rowLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: t.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  rowValue: { fontSize: 15, color: t.text, fontWeight: '500' },
  divider: { height: 1, backgroundColor: t.border, marginLeft: 48 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: t.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#DC2626' },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
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
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: t.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  dialogBody: { fontSize: 14, color: t.textMuted, lineHeight: 20, marginBottom: 20 },
  dialogActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.border,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: t.text },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmText: { fontSize: 15, fontWeight: '600', color: '#fff' },
})
