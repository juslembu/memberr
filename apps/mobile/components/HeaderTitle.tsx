import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { t } from '../lib/theme'

interface Props {
  icon?: keyof typeof Ionicons.glyphMap
  title: string
}

export function HeaderTitle({ icon, title }: Props) {
  if (!title) return null
  return (
    <View style={styles.row}>
      {icon ? <Ionicons name={icon} size={17} color={t.accent} /> : null}
      <Text style={styles.text} numberOfLines={1}>{title}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { fontSize: 17, fontWeight: '700', color: t.text, letterSpacing: -0.3 },
})
