import { useMemo, useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import * as Notifications from 'expo-notifications'
import { Platform, StyleSheet, View, Text, TouchableOpacity, Linking, AppState } from 'react-native'
import { ThemeProvider, DefaultTheme, DarkTheme } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { AuthContext, useAuthState } from '../hooks/useAuth'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { useServiceWorker } from '../hooks/useServiceWorker'
import { hasServerUrl } from '../lib/serverUrl'
import { api, APP_VERSION } from '../lib/api'
import { getBiometricEnabled, authenticateWithBiometric } from '../lib/biometric'
import { AppThemeProvider, useTheme, useThemePref } from '../lib/ThemeContext'
import type { Theme } from '../lib/theme'

function meetsMinVersion(appVersion: string, minVersion: string): boolean {
  const parse = (v: string) => v.split('.').map(Number)
  const [aMaj, aMin, aPatch] = parse(appVersion)
  const [mMaj, mMin, mPatch] = parse(minVersion)
  if (aMaj !== mMaj) return aMaj > mMaj
  if (aMin !== mMin) return aMin > mMin
  return aPatch >= mPatch
}

SplashScreen.preventAutoHideAsync()

// Show notifications when app is in foreground
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })
}

function PushNotificationSetup() {
  usePushNotifications()
  return null
}

// On web the app renders as a full-bleed SPA by default, which stretches
// grids (e.g. the card list) into very wide, flat rows. Cap content to a
// phone-like column and let the navigation theme's background show through
// as a backdrop on either side, so the app reads as a centered "app shell"
// instead of a desktop page.
const WEB_MAX_WIDTH = 480

function makeStyles(t: Theme) {
  return StyleSheet.create({
    updateContainer: {
      flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16,
    },
    updateTitle: { fontSize: 22, fontWeight: '800', color: t.text },
    updateBody: { fontSize: 15, color: t.textMuted, textAlign: 'center', lineHeight: 22 },
    updateBtn: {
      marginTop: 8, backgroundColor: t.accent, borderRadius: 12,
      paddingHorizontal: 28, paddingVertical: 14,
    },
    updateBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    webShell: {
      width: '100%',
      maxWidth: WEB_MAX_WIDTH,
      alignSelf: 'center',
      shadowColor: '#0F172A',
      shadowOpacity: 0.1,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 0 },
    },
    // (auth) already implements its own wide-screen split layout, so it opts
    // out of the centered shell and uses the full browser width.
    webAuthShell: {
      flex: 1,
      width: '100%',
    },
  })
}

function UpdateRequiredScreen({ minVersion, styles }: { minVersion: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.updateContainer}>
      <Ionicons name="alert-circle" size={52} color="#E11D48" />
      <Text style={styles.updateTitle}>Update Required</Text>
      <Text style={styles.updateBody}>
        This version of the app ({APP_VERSION}) is no longer compatible with the server (requires {minVersion}+).
        Please download the latest version.
      </Text>
      <TouchableOpacity
        style={styles.updateBtn}
        onPress={() => void Linking.openURL('https://github.com/juslembu/memberr/releases/latest')}
      >
        <Text style={styles.updateBtnText}>Download Update</Text>
      </TouchableOpacity>
    </View>
  )
}

function RootLayoutContent() {
  const t = useTheme()
  const { mode } = useThemePref()
  const styles = useMemo(() => makeStyles(t), [t])
  const auth = useAuthState()
  useServiceWorker()

  const [serverConfigured, setServerConfigured] = useState<boolean | null>(null)
  useEffect(() => {
    hasServerUrl().then(setServerConfigured)
  }, [])

  const [versionOk, setVersionOk] = useState<boolean | null>(Platform.OS === 'web' ? true : null)
  const [minVersion, setMinVersion] = useState('1.0.0')
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricLocked, setBiometricLocked] = useState(false)
  const [biometricChecking, setBiometricChecking] = useState(false)

  useEffect(() => {
    if (Platform.OS === 'web') return
    getBiometricEnabled().then(setBiometricEnabled)
  }, [])

  useEffect(() => {
    if (Platform.OS === 'web' || !biometricEnabled) return
    const handleAppState = (nextAppState: string) => {
      if (nextAppState === 'active') {
        setBiometricLocked(true)
      }
    }
    setBiometricLocked(true)
    const sub = AppState.addEventListener('change', handleAppState)
    return () => sub.remove()
  }, [biometricEnabled])

  async function unlockWithBiometric() {
    setBiometricChecking(true)
    const success = await authenticateWithBiometric()
    if (success) setBiometricLocked(false)
    setBiometricChecking(false)
  }

  useEffect(() => {
    if (Platform.OS === 'web' || serverConfigured === null) return
    if (!serverConfigured) {
      setVersionOk(true)
      return
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    api.version.check(controller.signal)
      .then(({ minAppVersion }) => {
        setMinVersion(minAppVersion)
        setVersionOk(meetsMinVersion(APP_VERSION, minAppVersion))
      })
      .catch(() => setVersionOk(true))
      .finally(() => clearTimeout(timeout))
    return () => { controller.abort(); clearTimeout(timeout) }
  }, [serverConfigured])

  useEffect(() => {
    if (!auth.loading && serverConfigured !== null && versionOk !== null && !biometricChecking) SplashScreen.hideAsync()
  }, [auth.loading, serverConfigured, versionOk, biometricChecking])

  if (auth.loading || serverConfigured === null || versionOk === null) return null

  if (versionOk === false) return <UpdateRequiredScreen minVersion={minVersion} styles={styles} />

  const needsServerSetup = Platform.OS !== 'web' && !serverConfigured

  const navTheme = mode === 'dark'
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: t.bg, card: t.surface, text: t.text, border: t.border, primary: t.accent } }
    : Platform.OS === 'web'
      ? { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: t.border } }
      : DefaultTheme

  return (
    <AuthContext.Provider value={auth}>
      {auth.user ? <PushNotificationSetup /> : null}
      <ThemeProvider value={navTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            ...(Platform.OS === 'web' ? { contentStyle: styles.webShell } : {}),
          }}
        >
          <Stack.Screen name="public" />
          <Stack.Screen name="server-setup" />
          {needsServerSetup ? null : auth.user ? (
            <>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(admin)" />
              <Stack.Screen name="change-password" />
              <Stack.Screen name="invite" />
            </>
          ) : (
            <Stack.Screen
              name="(auth)"
              options={Platform.OS === 'web' ? { contentStyle: styles.webAuthShell } : undefined}
            />
          )}
        </Stack>
      </ThemeProvider>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      {biometricLocked && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="auto">
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 20 }]}>
            <Ionicons name="lock-closed" size={56} color={t.accent} />
            <Text style={{ fontSize: 22, fontWeight: '800', color: t.text }}>Locked</Text>
            <Text style={{ fontSize: 15, color: t.textMuted, textAlign: 'center' }}>Unlock with biometric to continue</Text>
            <TouchableOpacity
              style={{ backgroundColor: t.accent, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 }}
              onPress={unlockWithBiometric}
              disabled={biometricChecking}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                {biometricChecking ? 'Authenticating…' : 'Unlock'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </AuthContext.Provider>
  )
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutContent />
    </AppThemeProvider>
  )
}
