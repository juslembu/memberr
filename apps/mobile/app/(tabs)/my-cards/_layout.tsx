import { View } from 'react-native'
import { Stack } from 'expo-router'
import { t } from '../../../lib/theme'
import { HeaderTitle } from '../../../components/HeaderTitle'
import { CardLogo } from '../../../components/CardLogo'

const headerStyle = {
  headerStyle: { backgroundColor: t.surface },
  headerTintColor: t.text,
  headerTitleStyle: { fontWeight: '700', letterSpacing: -0.3 } as any,
  headerShadowVisible: false,
}

export default function MyCardsLayout() {
  return (
    <Stack screenOptions={headerStyle}>
      <Stack.Screen name="index" options={{ headerTitle: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CardLogo size={22} />
            <HeaderTitle title="My Cards" />
          </View>
        ) }} />
      <Stack.Screen name="add" options={{ headerTitle: () => <HeaderTitle icon="add-circle" title="Add Card" /> }} />
      <Stack.Screen name="edit" options={{ headerTitle: () => <HeaderTitle icon="create" title="Edit Card" /> }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
    </Stack>
  )
}
