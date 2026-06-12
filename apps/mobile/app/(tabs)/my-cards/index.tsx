import { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Platform,
  ScrollView,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, ApiError } from '../../../lib/api'
import { CardThumbnail } from '../../../components/CardThumbnail'
import { t } from '../../../lib/theme'
import type { Card } from '@memberr/shared'

const NUM_COLS = Platform.OS === 'web' ? 2 : 1

function SkeletonCard() {
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

  return <Animated.View style={[styles.skeleton, { opacity }]} />
}

function SkeletonGrid() {
  if (NUM_COLS > 1) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.list} scrollEnabled={false}>
        <View style={styles.row}>
          <View style={styles.colItem}><SkeletonCard /></View>
          <View style={styles.colItem}><SkeletonCard /></View>
        </View>
        <View style={styles.row}>
          <View style={styles.colItem}><SkeletonCard /></View>
          <View style={styles.colItem}><SkeletonCard /></View>
        </View>
      </ScrollView>
    )
  }
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.list} scrollEnabled={false}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.singleItem}><SkeletonCard /></View>
      ))}
    </ScrollView>
  )
}

export default function MyCardsScreen() {
  const router = useRouter()
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    try {
      const data = await api.cards.list()
      setCards(data)
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load cards')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return <SkeletonGrid />

  return (
    <View style={styles.container}>
      <FlatList
        data={cards}
        keyExtractor={(c) => c.id}
        numColumns={NUM_COLS}
        key={String(NUM_COLS)}
        columnWrapperStyle={NUM_COLS > 1 ? styles.row : undefined}
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
            <Text style={styles.emptyTitle}>No cards yet</Text>
            <Text style={styles.emptySub}>
              Add your membership cards to keep them in one place
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/(tabs)/my-cards/add')}
            >
              <Ionicons name="add" size={16} color={t.accent} />
              <Text style={styles.emptyBtnText}>Add your first card</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={NUM_COLS > 1 ? styles.colItem : styles.singleItem}>
            <CardThumbnail
              card={item}
              onPress={() => router.push(`/(tabs)/my-cards/${item.id}`)}
            />
          </View>
        )}
      />

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(tabs)/my-cards/add')}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  list: { padding: 16, paddingBottom: 100 },
  row: { gap: 12 },
  colItem: { flex: 1 },
  singleItem: { width: '100%' },

  skeleton: {
    width: '100%',
    aspectRatio: 1.586,
    borderRadius: 16,
    backgroundColor: t.border,
    marginBottom: 12,
  },

  empty: {
    alignItems: 'center',
    paddingTop: 72,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: t.text,
    letterSpacing: -0.3,
  },
  emptySub: {
    fontSize: 14,
    color: t.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: t.accent,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  emptyBtnText: {
    color: t.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  errorBanner: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: t.errorBg,
    borderRadius: 10,
    padding: 12,
  },
  errorText: { color: t.errorText, fontSize: 14, textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: t.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: t.accent,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
})
