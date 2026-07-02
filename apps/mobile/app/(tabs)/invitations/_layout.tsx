import { Stack } from 'expo-router'
import { useTheme } from '../../../lib/ThemeContext'
import { HeaderTitle } from '../../../components/HeaderTitle'

export default function InvitationsLayout() {
  const t = useTheme()
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.surface },
        headerTintColor: t.text,
        headerTitleStyle: { fontWeight: '700', letterSpacing: -0.3 } as any,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerTitle: () => <HeaderTitle icon="mail" title="Invitations" /> }} />
    </Stack>
  )
}
