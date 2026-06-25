import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native'
import { Link } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { ApiError } from '../../lib/api'
import { t } from '../../lib/theme'

export default function RegisterScreen() {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { width } = useWindowDimensions()
  const isWide = Platform.OS === 'web' && width >= 700

  async function handleRegister() {
    if (!email || !username || !password) {
      setError('Please fill in all required fields')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setError('')
    setLoading(true)
    try {
      await register({ email, username, password, displayName: displayName || undefined })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const formFields = (
    <>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <TextInput
        style={styles.input}
        placeholder="Display name (optional)"
        placeholderTextColor={t.textSubtle}
        value={displayName}
        onChangeText={setDisplayName}
        autoComplete="name"
        returnKeyType="next"
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor={t.textSubtle}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoComplete="username-new"
        returnKeyType="next"
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={t.textSubtle}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        returnKeyType="next"
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 8 characters)"
        placeholderTextColor={t.textSubtle}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        returnKeyType="next"
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm password"
        placeholderTextColor={t.textSubtle}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoComplete="new-password"
        returnKeyType="done"
        onSubmitEditing={handleRegister}
      />
      <Pressable
        style={({ pressed }) => [styles.button, (loading || pressed) && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Creating account…' : 'Create account'}</Text>
      </Pressable>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Link href="/(auth)/login" style={styles.link}>Sign in</Link>
      </View>
    </>
  )

  if (isWide) {
    return (
      <View style={styles.splitContainer}>
        <View style={styles.leftPanel}>
          <Text style={styles.panelWordmark}>Memberr</Text>
          <Text style={styles.panelTagline}>
            Your cards,{'\n'}shared with{'\n'}the people you trust.
          </Text>
        </View>
        <View style={styles.rightPanel}>
          <View style={styles.formBox}>
            <Text style={styles.formTitle}>Create account</Text>
            {formFields}
          </View>
        </View>
      </View>
    )
  }

  const inner = (
    <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
      <Text style={styles.logo}>Memberr</Text>
      <Text style={styles.subtitle}>Create your account</Text>
      {formFields}
    </ScrollView>
  )

  if (Platform.OS === 'web') return <View style={styles.container}>{inner}</View>

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {inner}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.surface },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },

  logo: {
    fontSize: 42,
    fontWeight: '800',
    color: t.brand,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -1.5,
  },
  subtitle: {
    fontSize: 15,
    color: t.textMuted,
    textAlign: 'center',
    marginBottom: 40,
  },

  splitContainer: { flex: 1, flexDirection: 'row' },
  leftPanel: {
    flex: 1,
    backgroundColor: t.brand,
    padding: 52,
    justifyContent: 'flex-end',
    paddingBottom: 60,
  },
  panelWordmark: {
    fontSize: 64,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -2.5,
    lineHeight: 68,
    marginBottom: 16,
  },
  panelTagline: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 28,
  },
  rightPanel: {
    flex: 1,
    backgroundColor: t.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  formBox: { width: '100%', maxWidth: 360 },
  formTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: t.text,
    letterSpacing: -0.5,
    marginBottom: 28,
  },

  errorBox: { backgroundColor: t.errorBg, borderRadius: 10, padding: 12, marginBottom: 12 },
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
    backgroundColor: t.surface,
  },
  button: {
    backgroundColor: t.accent,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: t.textMuted, fontSize: 15 },
  link: { color: t.accent, fontSize: 15, fontWeight: '600' },
})
