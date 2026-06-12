import { Stack } from 'expo-router'
import { t } from '../../../lib/theme'

const headerStyle = {
  headerStyle: { backgroundColor: t.surface },
  headerTintColor: t.text,
  headerTitleStyle: { fontWeight: '700', letterSpacing: -0.3 } as any,
  headerShadowVisible: false,
}

export default function MyCardsLayout() {
  return (
    <Stack screenOptions={headerStyle}>
      <Stack.Screen name="index" options={{ title: 'My Cards' }} />
      <Stack.Screen name="add" options={{ title: 'Add Card' }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
    </Stack>
  )
}
