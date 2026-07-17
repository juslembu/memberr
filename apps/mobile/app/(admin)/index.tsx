import { useMemo, useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../lib/api'
import { useTheme } from '../../lib/ThemeContext'
import type { Theme } from '../../lib/theme'

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

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg, padding: 16, paddingTop: 24 },
    row: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface,
      borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: t.border, gap: 14,
    },
    iconWrap: {
      width: 44, height: 44, borderRadius: 12, backgroundColor: t.accentBg,
      justifyContent: 'center', alignItems: 'center',
    },
    text: { flex: 1 },
    label: { fontSize: 16, fontWeight: '700', color: t.text, marginBottom: 2 },
    desc: { fontSize: 13, color: t.textMuted, lineHeight: 18 },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: t.textSubtle, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 4, paddingHorizontal: 4 },
  })
}

export default function AdminIndexScreen() {
  const t = useTheme()
  const styles = useMemo(() => makeStyles(t), [t])
  const router = useRouter()
  const [registrationOpen, setRegistrationOpen] = useState(true)

  useEffect(() => {
    api.admin.getSettings().then(s => {
      setRegistrationOpen(s['registration_open'] !== 'false')
    }).catch((err) => {
      console.error('Failed to load admin settings', err)
    })
  }, [])

  async function toggleRegistration(value: boolean) {
    setRegistrationOpen(value)
    try {
      await api.admin.updateSettings({ registration_open: value ? 'true' : 'false' })
    } catch (err) {
      console.error('Failed to update registration setting', err)
      setRegistrationOpen(!value)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Server settings</Text>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: registrationOpen ? t.accentBg : t.border }]}>
          <Ionicons name={registrationOpen ? 'person-add-outline' : 'lock-closed-outline'} size={22} color={registrationOpen ? t.accent : t.textMuted} />
        </View>
        <View style={styles.text}>
          <Text style={styles.label}>Open registration</Text>
          <Text style={styles.desc}>{registrationOpen ? 'New accounts can be created by anyone' : 'Registration is closed — invite only'}</Text>
        </View>
        <Switch
          value={registrationOpen}
          onValueChange={toggleRegistration}
          trackColor={{ false: t.border, true: t.accentBg }}
          thumbColor={registrationOpen ? t.accent : t.textSubtle}
        />
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Management</Text>
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
