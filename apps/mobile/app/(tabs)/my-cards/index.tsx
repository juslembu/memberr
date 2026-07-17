import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  RefreshControl,
  Platform,
  ScrollView,
  Modal,
} from 'react-native'
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, ApiError } from '../../../lib/api'
import { CardThumbnail } from '../../../components/CardThumbnail'
import { ReorderableCardList } from '../../../components/ReorderableCardList'
import { useTheme } from '../../../lib/ThemeContext'
import type { Theme } from '../../../lib/theme'
import type { Card, SharedCard } from '@memberr/shared'

type ListItem =
  | { kind: 'own'; card: Card }
  | { kind: 'shared'; data: SharedCard }

type Filter = 'all' | 'mine' | 'shared' | 'pinned'
type Sort = 'custom' | 'name' | 'recent' | 'expiry'

function cardIdOf(item: ListItem): string {
  return item.kind === 'own' ? item.card.id : item.data.card.id
}

function isPinnedItem(item: ListItem): boolean {
  return item.kind === 'own' ? item.card.isPinned : item.data.isPinned
}

function cardOf(item: ListItem): Card | SharedCard['card'] {
  return item.kind === 'own' ? item.card : item.data.card
}

function sortItems(items: ListItem[], sort: Sort): ListItem[] {
  if (sort === 'custom') return items
  const copy = [...items]
  copy.sort((a, b) => {
    const ca = cardOf(a)
    const cb = cardOf(b)
    if (sort === 'name') return ca.storeName.localeCompare(cb.storeName)
    if (sort === 'recent') {
      const da = new Date(ca.createdAt).getTime()
      const db = new Date(cb.createdAt).getTime()
      return db - da
    }
    if (sort === 'expiry') {
      const ea = ca.expiresAt ? new Date(ca.expiresAt).getTime() : Infinity
      const eb = cb.expiresAt ? new Date(cb.expiresAt).getTime() : Infinity
      return ea - eb
    }
    return 0
  })
  return copy
}

function applyOrder(items: ListItem[], orderMap: Record<string, number>): ListItem[] {
  const byOrder = (a: ListItem, b: ListItem) => {
    const ao = orderMap[cardIdOf(a)]
    const bo = orderMap[cardIdOf(b)]
    if (ao != null && bo != null) return ao - bo
    if (ao != null) return -1
    if (bo != null) return 1
    return 0
  }
  const pinned = items.filter(isPinnedItem).sort(byOrder)
  const unpinned = items.filter((i) => !isPinnedItem(i)).sort(byOrder)
  return [...pinned, ...unpinned]
}

function SkeletonRow() {
  const t = useTheme()
  const opacity = useRef(new Animated.Value(1)).current
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [opacity])
  return <Animated.View style={[{ flex: 1, height: 160, borderRadius: 14, backgroundColor: t.border, marginBottom: 10 }, { opacity }]} />
}

function SkeletonList() {
  const t = useTheme()
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      scrollEnabled={false}
    >
      <View style={{ gap: 10, marginBottom: 0, flexDirection: 'row' }}><SkeletonRow /><SkeletonRow /></View>
      <View style={{ gap: 10, marginBottom: 0, flexDirection: 'row' }}><SkeletonRow /><SkeletonRow /></View>
      <View style={{ gap: 10, marginBottom: 0, flexDirection: 'row' }}><SkeletonRow /><SkeletonRow /></View>
    </ScrollView>
  )
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    searchWrap: {
      backgroundColor: t.surface, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
      borderBottomWidth: 1, borderBottomColor: t.border, gap: 10,
    },
    searchRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: t.bg,
      borderRadius: 12, borderWidth: 1, borderColor: t.border, paddingHorizontal: 12, paddingVertical: 9,
    },
    searchInput: {
      flex: 1, fontSize: 14, color: t.text,
      ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    filterRow: { flexDirection: 'row', gap: 8 },
    filterChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20,
      paddingVertical: 5, paddingHorizontal: 12,
      backgroundColor: t.bg, borderWidth: 1, borderColor: t.border,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
    },
    filterChipActive: { backgroundColor: t.accentBg, borderColor: t.accent },
    filterChipText: { fontSize: 13, fontWeight: '600', color: t.textMuted },
    filterChipTextActive: { color: t.accent },
    reorderChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20,
      paddingVertical: 5, paddingHorizontal: 12, backgroundColor: t.bg,
      borderWidth: 1, borderColor: t.border, marginLeft: 'auto',
      ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
    },
    reorderChipActive: { backgroundColor: t.accent, borderColor: t.accent },
    reorderChipText: { fontSize: 13, fontWeight: '600', color: t.textMuted },
    reorderChipTextActive: { color: '#fff' },
    archivedLink: {
      flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
      marginTop: 4,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
    },
    archivedLinkText: { fontSize: 12, color: t.accent, fontWeight: '600' },
    list: { padding: 16, paddingBottom: 100 },
    row: { gap: 10, marginBottom: 0 },
    empty: { alignItems: 'center', paddingTop: 72, paddingHorizontal: 32, gap: 10 },
    emptyIconWrap: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
      justifyContent: 'center', alignItems: 'center', marginBottom: 4,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: t.text, letterSpacing: -0.3 },
    emptySub: { fontSize: 14, color: t.textMuted, textAlign: 'center', lineHeight: 20 },
    emptyBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
      borderWidth: 1, borderColor: t.accent, borderRadius: 20,
      paddingVertical: 10, paddingHorizontal: 20,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
    },
    emptyBtnText: { color: t.accent, fontSize: 14, fontWeight: '600' },
    errorBanner: {
      position: 'absolute', bottom: 100, left: 16, right: 16,
      backgroundColor: t.errorBg, borderRadius: 10, padding: 12,
    },
    errorText: { color: t.errorText, fontSize: 14, textAlign: 'center' },
    undoBanner: {
      position: 'absolute', bottom: 100, left: 16, right: 16,
      backgroundColor: t.surface, borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: t.border,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    },
    undoText: { fontSize: 14, color: t.text, fontWeight: '500' },
    undoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    undoBtnText: { fontSize: 14, color: t.accent, fontWeight: '700' },
    bulkBar: {
      position: 'absolute', bottom: 24, left: 16, right: 16,
      backgroundColor: t.surface, borderRadius: 16, padding: 14,
      borderWidth: 1, borderColor: t.border,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 8,
    },
    bulkCount: { fontSize: 14, fontWeight: '700', color: t.text },
    bulkActions: { flexDirection: 'row', gap: 10 },
    bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    bulkBtnShare: { backgroundColor: t.accentBg },
    bulkBtnArchive: { backgroundColor: '#FEF2F2' },
    bulkBtnTextShare: { fontSize: 13, fontWeight: '700', color: t.accent },
    bulkBtnTextArchive: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
    fab: {
      position: 'absolute', bottom: 24, right: 24, width: 54, height: 54, borderRadius: 27,
      backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center',
      shadowColor: t.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
      elevation: 8,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
    },
  })
}

export default function MyCardsScreen() {
  const t = useTheme()
  const styles = useMemo(() => makeStyles(t), [t])
  const router = useRouter()
  const params = useLocalSearchParams<{ deletedCard?: string; archivedCard?: string }>()
  const [items, setItems] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('custom')
  const [reorderMode, setReorderMode] = useState(false)
  const [undoItem, setUndoItem] = useState<ListItem | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastArchivedRef = useRef<string | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkShareOpen, setBulkShareOpen] = useState(false)
  const [bulkShareIdentifier, setBulkShareIdentifier] = useState('')
  const [bulkSharing, setBulkSharing] = useState(false)
  const [bulkShareError, setBulkShareError] = useState('')

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    try {
      const [ownCards, sharedCards, orderMap] = await Promise.all([
        api.cards.list(),
        api.sharedWithMe.list(),
        api.cardOrder.get().catch((err) => {
          console.error('Failed to load card order', err)
          return {} as Record<string, number>
        }),
      ])
      const combined: ListItem[] = [
        ...ownCards.map((card): ListItem => ({ kind: 'own', card })),
        ...sharedCards.map((data): ListItem => ({ kind: 'shared', data })),
      ]
      setItems(applyOrder(combined, orderMap))
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load cards')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  useEffect(() => {
    if (!params.archivedCard) {
      lastArchivedRef.current = null
      return
    }
    const archivedId = params.archivedCard
    if (lastArchivedRef.current === archivedId) return
    lastArchivedRef.current = archivedId

    const item = items.find((i) => cardIdOf(i) === archivedId)
    if (!item) {
      router.setParams({ archivedCard: undefined })
      return
    }

    // Clear the param so the effect doesn't re-run
    router.setParams({ archivedCard: undefined })

    // Remove from UI immediately, archive on the server, and show undo
    setItems((prev) => prev.filter((i) => cardIdOf(i) !== archivedId))
    setUndoItem(item)
    void api.cards.archive(archivedId)
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    undoTimerRef.current = setTimeout(() => {
      setUndoItem(null)
    }, 5000)
  }, [params.archivedCard, items, router])

  function handleUndo() {
    if (!undoItem) return
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    const id = cardIdOf(undoItem)
    void api.cards.unarchive(id)
    setItems((prev) => {
      if (prev.some((i) => cardIdOf(i) === id)) return prev
      return [...prev, undoItem]
    })
    setUndoItem(null)
  }

  function enterSelectionMode(id: string) {
    setSelectionMode(true)
    setSelectedIds(new Set([id]))
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }

  async function archiveSelected() {
    const ids = Array.from(selectedIds)
    setItems((prev) => prev.filter((i) => !ids.includes(cardIdOf(i))))
    exitSelectionMode()
    const failed: string[] = []
    await Promise.all(
      ids.map(async (id) => {
        try {
          await api.cards.archive(id)
        } catch (err) {
          console.error(`Failed to archive card ${id}`, err)
          failed.push(id)
        }
      })
    )
    if (failed.length > 0) {
      setError(`Failed to archive ${failed.length} card${failed.length > 1 ? 's' : ''}`)
    }
  }

  async function shareSelected() {
    const val = bulkShareIdentifier.trim()
    if (!val) return
    setBulkSharing(true)
    setBulkShareError('')
    const ids = Array.from(selectedIds)
    const failed: string[] = []
    await Promise.all(
      ids.map(async (id) => {
        try {
          await api.shares.share(id, { identifier: val })
        } catch (err) {
          console.error(`Failed to share card ${id}`, err)
          failed.push(id)
        }
      })
    )
    if (failed.length > 0) {
      setBulkShareError(`Failed to share ${failed.length} card${failed.length > 1 ? 's' : ''}`)
    } else {
      setBulkShareOpen(false)
      setBulkShareIdentifier('')
      exitSelectionMode()
    }
    setBulkSharing(false)
  }

  async function handleReorder(newItems: ListItem[]) {
    setItems(newItems)
    try {
      await api.cardOrder.save(newItems.map(cardIdOf))
    } catch (err) {
      console.error('Failed to save card order', err)
      setError('Failed to save card order')
    }
  }

  const pinnedCount = items.filter(isPinnedItem).length

  const filtered = sortItems(
    items.filter((item) => {
      if (filter === 'mine' && item.kind !== 'own') return false
      if (filter === 'shared' && item.kind !== 'shared') return false
      if (filter === 'pinned' && !isPinnedItem(item)) return false
      const name = item.kind === 'own' ? item.card.storeName : item.data.card.storeName
      return name.toLowerCase().includes(search.toLowerCase())
    }),
    sort,
  )

  if (loading) return <SkeletonList />

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color={t.textSubtle} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search cards…"
            placeholderTextColor={t.textSubtle}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={t.textSubtle} />
            </TouchableOpacity>
          )}
        </View>
        {/* Filter and sort chips */}
        <View style={styles.filterRow}>
          {(['all', 'mine', 'shared', 'pinned'] as Filter[]).map((f) => {
            if (f === 'pinned' && pinnedCount === 0) return null
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
                disabled={reorderMode}
              >
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                  {f === 'all' ? 'All' : f === 'mine' ? 'Mine' : f === 'shared' ? 'Shared' : 'Pinned'}
                </Text>
              </TouchableOpacity>
            )
          })}
          {items.length > 1 && (
            <TouchableOpacity
              style={[styles.filterChip, sort !== 'custom' && styles.filterChipActive]}
              onPress={() => {
                const options: Sort[] = ['custom', 'name', 'recent', 'expiry']
                const next = options[(options.indexOf(sort) + 1) % options.length]
                setSort(next)
                if (next !== 'custom') setReorderMode(false)
              }}
              disabled={reorderMode}
            >
              <Ionicons name="swap-vertical-outline" size={13} color={sort !== 'custom' ? t.accent : t.textMuted} />
              <Text style={[styles.filterChipText, sort !== 'custom' && styles.filterChipTextActive]}>
                {sort === 'custom' ? 'Sort' : sort === 'name' ? 'Name' : sort === 'recent' ? 'Recent' : 'Expiry'}
              </Text>
            </TouchableOpacity>
          )}
          {filter === 'all' && !search && sort === 'custom' && items.length > 1 && (
            <TouchableOpacity
              style={[styles.reorderChip, reorderMode && styles.reorderChipActive]}
              onPress={() => setReorderMode((v) => !v)}
            >
              <Ionicons name={reorderMode ? 'checkmark' : 'reorder-three-outline'} size={14} color={reorderMode ? '#fff' : t.textMuted} />
              <Text style={[styles.reorderChipText, reorderMode && styles.reorderChipTextActive]}>
                {reorderMode ? 'Done' : 'Reorder'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.archivedLink} onPress={() => router.push('/(tabs)/my-cards/archived')}>
          <Ionicons name="archive-outline" size={14} color={t.accent} />
          <Text style={styles.archivedLinkText}>View archived cards</Text>
        </TouchableOpacity>
      </View>

      {reorderMode ? (
        <ScrollView contentContainerStyle={styles.list}>
          <ReorderableCardList items={items} onReorder={handleReorder} pinnedCount={pinnedCount} />
        </ScrollView>
      ) : (
      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={(item) => item.kind === 'own' ? item.card.id : item.data.shareId}
        columnWrapperStyle={styles.row}
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
            <View style={styles.emptyIconWrap}>
              <Ionicons name="card-outline" size={36} color={t.textSubtle} />
            </View>
            <Text style={styles.emptyTitle}>
              {search ? 'No matches' : 'No cards yet'}
            </Text>
            <Text style={styles.emptySub}>
              {search
                ? `No cards match "${search}"`
                : 'Add your membership cards to keep them in one place'}
            </Text>
            {!search && (
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/(tabs)/my-cards/add')}
              >
                <Ionicons name="add" size={16} color={t.accent} />
                <Text style={styles.emptyBtnText}>Add your first card</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const id = cardIdOf(item)
          const isOwn = item.kind === 'own'
          if (isOwn) {
            return (
              <CardThumbnail
                card={item.card}
                selectionMode={selectionMode}
                selected={selectedIds.has(id)}
                onPress={() => {
                  if (selectionMode) toggleSelection(id)
                  else router.push(`/(tabs)/my-cards/${item.card.id}`)
                }}
                onLongPress={() => enterSelectionMode(id)}
              />
            )
          }
          const sharedBy = item.data.grantedBy.displayName ?? item.data.grantedBy.username
          return (
            <CardThumbnail
              card={{ ...item.data.card, isPinned: item.data.isPinned }}
              sharedBy={sharedBy}
              shareExpiresAt={item.data.expiresAt}
              onPress={() => router.push(`/(tabs)/shared-with-me/${item.data.shareId}`)}
            />
          )
        }}
      />
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {undoItem && (
        <View style={styles.undoBanner}>
          <Text style={styles.undoText}>Card archived</Text>
          <TouchableOpacity style={styles.undoBtn} onPress={handleUndo}>
            <Ionicons name="arrow-undo-outline" size={16} color={t.accent} />
            <Text style={styles.undoBtnText}>Undo</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectionMode ? (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkCount}>{selectedIds.size} selected</Text>
          <View style={styles.bulkActions}>
            <TouchableOpacity style={[styles.bulkBtn, styles.bulkBtnShare]} onPress={() => setBulkShareOpen(true)}>
              <Ionicons name="person-add-outline" size={16} color={t.accent} />
              <Text style={styles.bulkBtnTextShare}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.bulkBtn, styles.bulkBtnArchive]} onPress={archiveSelected}>
              <Ionicons name="archive-outline" size={16} color="#DC2626" />
              <Text style={styles.bulkBtnTextArchive}>Archive</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={exitSelectionMode}>
              <Ionicons name="close" size={22} color={t.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(tabs)/my-cards/add')}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      <Modal visible={bulkShareOpen} transparent animationType="fade" onRequestClose={() => setBulkShareOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: t.surface, borderRadius: 16, padding: 20, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: t.text, marginBottom: 8 }}>Share {selectedIds.size} cards</Text>
            <Text style={{ fontSize: 14, color: t.textMuted, marginBottom: 16 }}>Enter an email or username to share all selected cards.</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.bg, borderRadius: 12, borderWidth: 1, borderColor: t.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}>
              <Ionicons name="person-outline" size={18} color={t.textSubtle} style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, fontSize: 15, color: t.text }}
                placeholder="Email or username"
                placeholderTextColor={t.textSubtle}
                value={bulkShareIdentifier}
                onChangeText={(v) => { setBulkShareIdentifier(v); setBulkShareError('') }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={shareSelected}
              />
            </View>
            {bulkShareError ? <Text style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{bulkShareError}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: t.border, alignItems: 'center' }} onPress={() => setBulkShareOpen(false)}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: t.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: t.accent, alignItems: 'center', opacity: bulkSharing || !bulkShareIdentifier.trim() ? 0.6 : 1 }} onPress={shareSelected} disabled={bulkSharing || !bulkShareIdentifier.trim()}>
                {bulkSharing ? <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Sharing…</Text> : <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Share</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}
