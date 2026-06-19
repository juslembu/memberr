import { Stack } from 'expo-router'
import { t } from '../../../lib/theme'
import { HeaderTitle } from '../../../components/HeaderTitle'

const headerStyle = {
  headerStyle: { backgroundColor: t.surface },
  headerTintColor: t.text,
  headerTitleStyle: { fontWeight: '700', letterSpacing: -0.3 } as any,
  headerShadowVisible: false,
}

export default function SharedWithMeLayout() {
  return (
    <Stack screenOptions={headerStyle}>
      <Stack.Screen name="index" options={{ headerTitle: () => <HeaderTitle icon="people" title="Shared with Me" /> }} />
      <Stack.Screen name="[shareId]" options={{ title: '' }} />
    </Stack>
  )
}
