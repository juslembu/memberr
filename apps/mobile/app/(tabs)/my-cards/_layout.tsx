import { Stack } from 'expo-router'
import { t } from '../../../lib/theme'
import { HeaderTitle } from '../../../components/HeaderTitle'

const headerStyle = {
  headerStyle: { backgroundColor: t.surface },
  headerTintColor: t.text,
  headerTitleStyle: { fontWeight: '700', letterSpacing: -0.3 } as any,
  headerShadowVisible: false,
}

export default function MyCardsLayout() {
  return (
    <Stack screenOptions={headerStyle}>
      <Stack.Screen name="index" options={{ headerTitle: () => <HeaderTitle icon="card" title="My Cards" /> }} />
      <Stack.Screen name="add" options={{ headerTitle: () => <HeaderTitle icon="add-circle" title="Add Card" /> }} />
      <Stack.Screen name="edit" options={{ headerTitle: () => <HeaderTitle icon="create" title="Edit Card" /> }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
    </Stack>
  )
}
