import { useEffect } from 'react'
import { Stack, router } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../lib/ThemeContext'
import { HeaderTitle } from '../../components/HeaderTitle'

export default function AdminLayout() {
  const { user } = useAuth()
  const t = useTheme()

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
      <Stack.Screen name="index" options={{ headerTitle: () => <HeaderTitle icon="shield-checkmark" title="Admin Panel" /> }} />
      <Stack.Screen name="users" options={{ headerTitle: () => <HeaderTitle icon="people" title="Users" /> }} />
      <Stack.Screen name="shops" options={{ headerTitle: () => <HeaderTitle icon="storefront" title="Predefined Shops" /> }} />
    </Stack>
  )
}
