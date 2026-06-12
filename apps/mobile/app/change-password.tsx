import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { api, ApiError } from '../lib/api'
import { t } from '../lib/theme'

const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}

export default function ChangePasswordScreen() {
  const { user, setUser, logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required')
      return
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from current password')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.auth.changePassword({ currentPassword, newPassword })
      if (user) {
        setUser({ ...user, mustChangePassword: false })
      }
      // useAuth setUser triggers re-render; navigate explicitly
      const { router } = await import('expo-router')
      router.replace('/(tabs)/my-cards')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>🔐</Text>
        </View>
        <Text style={styles.title}>Set your password</Text>
        <Text style={styles.subtitle}>
          You're using the default admin password. Set a new one to continue.
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Current password"
        placeholderTextColor={t.textSubtle}
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        autoComplete="current-password"
        returnKeyType="next"
      />
      <TextInput
        style={styles.input}
        placeholder="New password (min 8 characters)"
        placeholderTextColor={t.textSubtle}
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoComplete="new-password"
        returnKeyType="next"
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm new password"
        placeholderTextColor={t.textSubtle}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoComplete="new-password"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />

      <TouchableOpacity
        style={[styles.button, (loading || !currentPassword || !newPassword || !confirmPassword) && styles.buttonDisabled, webCursor]}
        onPress={handleSubmit}
        disabled={loading || !currentPassword || !newPassword || !confirmPassword}
      >
        <Text style={styles.buttonText}>{loading ? 'Saving…' : 'Set new password'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.logoutLink, webCursor]} onPress={logout}>
        <Text style={styles.logoutText}>Log out instead</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.surface },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 48, maxWidth: 420, alignSelf: 'center', width: '100%' },

  header: { alignItems: 'center', marginBottom: 32 },
  iconWrap: { marginBottom: 16 },
  icon: { fontSize: 48 },
  title: { fontSize: 26, fontWeight: '800', color: t.text, letterSpacing: -0.5, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: t.textMuted, textAlign: 'center', lineHeight: 22 },

  errorBox: { backgroundColor: t.errorBg, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: t.errorText, fontSize: 14, textAlign: 'center' },

  input: {
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 10,
    color: t.text,
    backgroundColor: t.bg,
  },
  button: {
    backgroundColor: t.accent,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  logoutLink: { alignItems: 'center', marginTop: 20 },
  logoutText: { color: t.textMuted, fontSize: 14 },
})
