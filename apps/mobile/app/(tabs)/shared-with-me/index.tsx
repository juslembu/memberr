import { useMemo, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, ApiError } from '../../../lib/api'
import { useTheme } from '../../../lib/ThemeContext'
import type { Theme } from '../../../lib/theme'
import type { SharedCard } from '@memberr/shared'

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16 },
    empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
    emptyText: { fontSize: 18, fontWeight: '600', color: t.text },
    emptySubtext: { fontSize: 14, color: t.textSubtle },
    card: {
      backgroundColor: t.surface, borderRadius: 12, padding: 16, marginBottom: 10,
      borderLeftWidth: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      shadowColor: t.text, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    storeName: { fontSize: 17, fontWeight: '700', color: t.text },
    sharedBy: { fontSize: 13, color: t.textMuted, marginTop: 2 },
    error: { color: t.errorText, textAlign: 'center', padding: 16 },
  })
}

export default function SharedWithMeScreen() {
  const t = useTheme()
  const styles = useMemo(() => makeStyles(t), [t])
  const router = useRouter()
  const [shared, setShared] = useState<SharedCard[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    try {
      const data = await api.sharedWithMe.list()
      setShared(data)
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={shared}
        keyExtractor={(s) => s.shareId}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true) }}
            tintColor={t.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={t.textSubtle} />
            <Text style={styles.emptyText}>Nothing shared yet</Text>
            <Text style={styles.emptySubtext}>Cards shared with you will appear here</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { borderLeftColor: item.card.color ?? t.accent }]}
            onPress={() => router.push(`/(tabs)/shared-with-me/${item.shareId}`)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.storeName}>{item.card.storeName}</Text>
              <Text style={styles.sharedBy}>
                from {item.grantedBy.displayName ?? item.grantedBy.username}
              </Text>
            </View>
            {item.isPinned && (
              <Ionicons name="bookmark" size={14} color={item.card.color ?? t.accent} style={{ marginRight: 8 }} />
            )}
            <Ionicons name="chevron-forward" size={18} color={t.textSubtle} />
          </TouchableOpacity>
        )}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}
