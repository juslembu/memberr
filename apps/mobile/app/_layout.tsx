import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import * as Notifications from 'expo-notifications'
import { Platform, StyleSheet, View, Text, TouchableOpacity, Linking } from 'react-native'
import { ThemeProvider, DefaultTheme } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { AuthContext, useAuthState } from '../hooks/useAuth'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { useServiceWorker } from '../hooks/useServiceWorker'
import { hasServerUrl } from '../lib/serverUrl'
import { api, APP_VERSION } from '../lib/api'
import { t } from '../lib/theme'

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

const webTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: t.border },
}

function UpdateRequiredScreen({ minVersion }: { minVersion: string }) {
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

export default function RootLayout() {
  const auth = useAuthState()
  useServiceWorker()

  // Native apps are a single distributable binary with no fixed "server" —
  // self-hosters need to point each install at their own backend. Web
  // always has a server (the origin it was loaded from), so this only
  // gates native.
  const [serverConfigured, setServerConfigured] = useState<boolean | null>(null)
  useEffect(() => {
    hasServerUrl().then(setServerConfigured)
  }, [])

  // Web always gets the latest bundle from the server, so version gating
  // only matters for native APKs which can be stale.
  const [versionOk, setVersionOk] = useState<boolean | null>(Platform.OS === 'web' ? true : null)
  const [minVersion, setMinVersion] = useState('1.0.0')
  useEffect(() => {
    if (Platform.OS === 'web' || !serverConfigured) return
    api.version.check()
      .then(({ minAppVersion }) => {
        setMinVersion(minAppVersion)
        setVersionOk(meetsMinVersion(APP_VERSION, minAppVersion))
      })
      .catch(() => setVersionOk(true)) // fail open: don't lock out on network error
  }, [serverConfigured])

  useEffect(() => {
    if (!auth.loading && serverConfigured !== null && versionOk !== null) SplashScreen.hideAsync()
  }, [auth.loading, serverConfigured, versionOk])

  if (auth.loading || serverConfigured === null || versionOk === null) return null

  if (versionOk === false) return <UpdateRequiredScreen minVersion={minVersion} />

  const needsServerSetup = Platform.OS !== 'web' && !serverConfigured

  return (
    <AuthContext.Provider value={auth}>
      {auth.user ? <PushNotificationSetup /> : null}
      <ThemeProvider value={Platform.OS === 'web' ? webTheme : DefaultTheme}>
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
      <StatusBar style="auto" />
    </AuthContext.Provider>
  )
}

const styles = StyleSheet.create({
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
