import { useMemo, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  type ViewStyle,
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
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      zIndex: 100,
    },
    dialog: {
      backgroundColor: t.surface,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
    },
    dialogTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginBottom: 8 },
    dialogMessage: { fontSize: 14, color: t.textMuted, marginBottom: 20, lineHeight: 20 },
    dialogBtn: {
      backgroundColor: t.accent,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 10,
    },
    dialogBtnDestructive: { backgroundColor: '#DC2626' },
    dialogBtnDisabled: { opacity: 0.6 },
    dialogBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
    dialogCancel: { alignItems: 'center', paddingVertical: 8 },
    dialogCancelText: { fontSize: 15, fontWeight: '600', color: t.textMuted },
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
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

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
      setError(err instanceof ApiError ? err.message : 'Failed to restore card')
    }
  }

  function confirmDelete(id: string) {
    setDeleteId(id)
  }

  async function executeDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await api.cards.remove(deleteId)
      setCards((prev) => prev.filter((c) => c.id !== deleteId))
      setDeleteId(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete card')
    } finally {
      setDeleting(false)
    }
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
                onPress={() => confirmDelete(item.id)}
              >
                <Ionicons name="trash-outline" size={14} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {deleteId && (
        <View style={[styles.overlay, Platform.OS === 'web' ? ({ position: 'fixed' } as ViewStyle) : {}]}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Delete permanently?</Text>
            <Text style={styles.dialogMessage}>This cannot be undone.</Text>
            <TouchableOpacity
              style={[styles.dialogBtn, styles.dialogBtnDestructive, deleting && styles.dialogBtnDisabled]}
              onPress={executeDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.dialogBtnText}>Delete</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.dialogCancel} onPress={() => setDeleteId(null)} disabled={deleting}>
              <Text style={styles.dialogCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}
