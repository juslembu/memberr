import { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../lib/ThemeContext'
import type { Theme } from '../lib/theme'

interface Props {
  icon: keyof typeof Ionicons.glyphMap
  title: string
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    text: { fontSize: 17, fontWeight: '700', color: t.text, letterSpacing: -0.3 },
  })
}

export function HeaderTitle({ icon, title }: Props) {
  const t = useTheme()
  const styles = useMemo(() => makeStyles(t), [t])
  if (!title) return null
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={17} color={t.accent} />
      <Text style={styles.text} numberOfLines={1}>{title}</Text>
    </View>
  )
}
