import { Stack } from 'expo-router'
import { useTheme } from '../../../lib/ThemeContext'
import { HeaderTitle } from '../../../components/HeaderTitle'

export default function SharedWithMeLayout() {
  const t = useTheme()
  const headerStyle = {
    headerStyle: { backgroundColor: t.surface },
    headerTintColor: t.text,
    headerTitleStyle: { fontWeight: '700', letterSpacing: -0.3 } as any,
    headerShadowVisible: false,
  }
  return (
    <Stack screenOptions={headerStyle}>
      <Stack.Screen name="index" options={{ headerTitle: () => <HeaderTitle icon="people" title="Shared with Me" /> }} />
      <Stack.Screen name="[shareId]" options={{ title: '' }} />
    </Stack>
  )
}
