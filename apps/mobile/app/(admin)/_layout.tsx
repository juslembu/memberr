import { useEffect } from 'react'
import { Stack, router } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { t } from '../../lib/theme'

export default function AdminLayout() {
  const { user } = useAuth()

  useEffect(() => {
    if (user && !user.isAdmin) {
      router.replace('/(tabs)/my-cards')
    }
  }, [user])

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.surface },
        headerTintColor: t.text,
        headerTitleStyle: { fontWeight: '700', letterSpacing: -0.3 } as any,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Admin Panel' }} />
      <Stack.Screen name="users" options={{ title: 'Users' }} />
      <Stack.Screen name="shops" options={{ title: 'Predefined Shops' }} />
    </Stack>
  )
}
