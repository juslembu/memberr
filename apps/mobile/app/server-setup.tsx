import { useMemo, useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getBundledDefaultServerUrl, setServerUrl, pingServer, normalizeServerUrl } from '../lib/serverUrl'
import { useTheme } from '../lib/ThemeContext'
import type { Theme } from '../lib/theme'

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.surface },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
    iconWrap: {
      width: 56, height: 56, borderRadius: 16, backgroundColor: t.accentBg,
      justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 20,
    },
    title: { fontSize: 24, fontWeight: '800', color: t.text, textAlign: 'center', marginBottom: 10, letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: t.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
    input: {
      borderWidth: 1, borderColor: t.border, borderRadius: 10,
      paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: t.text, backgroundColor: t.surface,
    },
    errorBox: { backgroundColor: t.errorBg, borderRadius: 10, padding: 12, marginTop: 12, gap: 6 },
    errorText: { color: t.errorText, fontSize: 13, textAlign: 'center' },
    errorLink: { color: t.errorText, fontSize: 13, fontWeight: '700', textAlign: 'center', textDecorationLine: 'underline' },
    button: { backgroundColor: t.accent, borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 16 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  })
}

export default function ServerSetupScreen() {
  const t = useTheme()
  const styles = useMemo(() => makeStyles(t), [t])
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setUrl(getBundledDefaultServerUrl())
  }, [])

  async function handleContinue(skipCheck = false) {
    const trimmed = url.trim()
    if (!trimmed) {
      setError('Enter your Memberr server address')
      return
    }
    setError('')
    setChecking(true)
    try {
      const reachable = skipCheck ? true : await pingServer(trimmed)
      if (!reachable) {
        setError(`Could not reach a Memberr server at ${normalizeServerUrl(trimmed)}`)
        return
      }
      await setServerUrl(trimmed)
      router.replace('/(auth)/login')
    } finally {
      setChecking(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="server-outline" size={28} color={t.accent} />
        </View>
        <Text style={styles.title}>Connect to your server</Text>
        <Text style={styles.subtitle}>
          Memberr can be self-hosted. Enter the web address of the server you'd like to connect to.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="https://memberr.example.com"
          placeholderTextColor={t.textSubtle}
          value={url}
          onChangeText={(v) => { setUrl(v); setError('') }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={() => handleContinue()}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => handleContinue(true)}>
              <Text style={styles.errorLink}>Use this address anyway</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.button, checking && styles.buttonDisabled]}
          onPress={() => handleContinue()}
          disabled={checking}
        >
          {checking
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.buttonText}>Continue</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
