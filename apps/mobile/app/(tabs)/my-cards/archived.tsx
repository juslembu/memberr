import { useMemo, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, ApiError } from '../../../lib/api'
import { CardThumbnail } from '../../../components/CardThumbnail'
import { useTheme } from '../../../lib/ThemeContext'
import type { Theme } from '../../../lib/theme'
import type { Card } from '@memberr/shared'

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    },
    backBtn: { padding: 4 },
    title: { fontSize: 18, fontWeight: '700', color: t.text },
    list: { padding: 16, paddingBottom: 100 },
    row: { gap: 10, marginBottom: 0 },
    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 8 },
    emptyText: { fontSize: 18, fontWeight: '600', color: t.text },
    emptySubtext: { fontSize: 14, color: t.textSubtle, textAlign: 'center' },
    error: { color: t.errorText, textAlign: 'center', padding: 16 },
  })
}

export default function ArchivedCardsScreen() {
  const t = useTheme()
  const styles = useMemo(() => makeStyles(t), [t])
  const router = useRouter()
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    try {
      const data = await api.cards.listArchived()
      setCards(data)
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load archived cards')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleUnarchive(id: string) {
    try {
      await api.cards.unarchive(id)
      setCards((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed to restore card')
    }
  }

  async function handlePermanentDelete(id: string) {
    Alert.alert(
      'Delete permanently?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.cards.remove(id)
              setCards((prev) => prev.filter((c) => c.id !== id))
            } catch (err) {
              Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed to delete card')
            }
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Archived cards</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={cards}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={t.accent} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="archive-outline" size={48} color={t.textSubtle} />
            <Text style={styles.emptyText}>No archived cards</Text>
            <Text style={styles.emptySubtext}>Cards you archive will appear here</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1 }}>
            <CardThumbnail
              card={item}
              onPress={() => router.push(`/(tabs)/my-cards/${item.id}`)}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <TouchableOpacity
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: t.accentBg, borderRadius: 8, paddingVertical: 8 }}
                onPress={() => handleUnarchive(item.id)}
              >
                <Ionicons name="arrow-undo-outline" size={14} color={t.accent} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: t.accent }}>Restore</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#FEF2F2', borderRadius: 8, paddingHorizontal: 12 }}
                onPress={() => handlePermanentDelete(item.id)}
              >
                <Ionicons name="trash-outline" size={14} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  )
}
