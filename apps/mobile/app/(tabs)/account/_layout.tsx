import { Stack } from 'expo-router'
import { t } from '../../../lib/theme'
import { HeaderTitle } from '../../../components/HeaderTitle'

export default function AccountLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.surface },
        headerTintColor: t.text,
        headerTitleStyle: { fontWeight: '700', letterSpacing: -0.3 } as any,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerTitle: () => <HeaderTitle icon="person-circle" title="Account" /> }} />
    </Stack>
  )
}
