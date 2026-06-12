import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { AuthContext, useAuthState } from '../hooks/useAuth'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const auth = useAuthState()

  useEffect(() => {
    if (!auth.loading) SplashScreen.hideAsync()
  }, [auth.loading])

  if (auth.loading) return null

  return (
    <AuthContext.Provider value={auth}>
      <Stack screenOptions={{ headerShown: false }}>
        {auth.user ? (
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(admin)" />
            <Stack.Screen name="change-password" />
          </>
        ) : (
          <Stack.Screen name="(auth)" />
        )}
      </Stack>
      <StatusBar style="auto" />
    </AuthContext.Provider>
  )
}
