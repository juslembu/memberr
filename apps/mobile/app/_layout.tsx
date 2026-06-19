import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { Platform, StyleSheet } from 'react-native'
import { ThemeProvider, DefaultTheme } from '@react-navigation/native'
import { AuthContext, useAuthState } from '../hooks/useAuth'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { useServiceWorker } from '../hooks/useServiceWorker'
import { hasServerUrl } from '../lib/serverUrl'
import { t } from '../lib/theme'

SplashScreen.preventAutoHideAsync()

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

  useEffect(() => {
    if (!auth.loading && serverConfigured !== null) SplashScreen.hideAsync()
  }, [auth.loading, serverConfigured])

  if (auth.loading || serverConfigured === null) return null

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
