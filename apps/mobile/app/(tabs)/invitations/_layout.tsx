import { Stack } from 'expo-router'
import { t } from '../../../lib/theme'

export default function InvitationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.surface },
        headerTintColor: t.text,
        headerTitleStyle: { fontWeight: '700', letterSpacing: -0.3 } as any,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Invitations' }} />
    </Stack>
  )
}
