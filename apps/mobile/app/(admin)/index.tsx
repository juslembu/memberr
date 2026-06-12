import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { t } from '../../lib/theme'

const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}

const ITEMS = [
  {
    href: '/(admin)/users' as const,
    icon: 'people-outline' as const,
    label: 'Users',
    desc: 'View and manage registered users',
  },
  {
    href: '/(admin)/shops' as const,
    icon: 'storefront-outline' as const,
    label: 'Predefined Shops',
    desc: 'Add shop templates for quick card creation',
  },
]

export default function AdminIndexScreen() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      {ITEMS.map((item) => (
        <TouchableOpacity
          key={item.href}
          style={[styles.row, webCursor]}
          onPress={() => router.push(item.href)}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={item.icon} size={22} color={t.accent} />
          </View>
          <View style={styles.text}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.textSubtle} />
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg, padding: 16, paddingTop: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: t.border,
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: t.accentBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: { flex: 1 },
  label: { fontSize: 16, fontWeight: '700', color: t.text, marginBottom: 2 },
  desc: { fontSize: 13, color: t.textMuted, lineHeight: 18 },
})
