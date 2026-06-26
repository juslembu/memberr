import { useRef, useState, useEffect } from 'react'
import { View, Text, StyleSheet, Animated, PanResponder, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { t } from '../lib/theme'
import type { Card, SharedCard } from '@memberr/shared'

export type ListItem =
  | { kind: 'own'; card: Card }
  | { kind: 'shared'; data: SharedCard }

interface Props {
  items: ListItem[]
  onReorder: (items: ListItem[]) => void
  pinnedCount?: number
}

const SLOT_HEIGHT = 64
const ROW_HEIGHT = 56
const DIVIDER_HEIGHT = 32

function itemKey(item: ListItem): string {
  return item.kind === 'own' ? item.card.id : item.data.shareId
}
function itemStoreName(item: ListItem): string {
  return item.kind === 'own' ? item.card.storeName : item.data.card.storeName
}
function itemColor(item: ListItem): string {
  return (item.kind === 'own' ? item.card.color : item.data.card.color) ?? t.accent
}
function itemSharedBy(item: ListItem): string | null {
  return item.kind === 'shared' ? (item.data.grantedBy.displayName ?? item.data.grantedBy.username) : null
}

function topOf(index: number, pc: number): number {
  // Unpinned items (index >= pc) are offset by the divider height
  return index * SLOT_HEIGHT + (pc > 0 && pc < Infinity && index >= pc ? DIVIDER_HEIGHT : 0)
}

export function ReorderableCardList({ items, onReorder, pinnedCount = 0 }: Props) {
  const [data, setData] = useState(items)
  useEffect(() => { setData(items) }, [items])

  const pc = Math.min(pinnedCount, data.length)
  const showDivider = pc > 0 && pc < data.length

  const activeIndex = useRef<number | null>(null)
  const hoverIndex = useRef<number | null>(null)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const dragY = useRef(new Animated.Value(0)).current
  const rowOffsets = useRef<Animated.Value[]>([]).current

  if (rowOffsets.length !== data.length) {
    rowOffsets.length = 0
    for (let i = 0; i < data.length; i++) rowOffsets.push(new Animated.Value(0))
  }

  function resetOffsets() {
    rowOffsets.forEach((v) => v.setValue(0))
  }

  function updateHover(rawHover: number) {
    const from = activeIndex.current
    if (from == null) return

    // Clamp drag within the same section (pinned stays pinned, unpinned stays unpinned)
    const inPinned = from < pc
    const newHover = inPinned
      ? Math.max(0, Math.min(pc - 1, rawHover))
      : Math.max(pc, Math.min(data.length - 1, rawHover))

    if (hoverIndex.current === newHover) return
    hoverIndex.current = newHover

    rowOffsets.forEach((v, idx) => {
      if (idx === from) return
      // Only shift items within the same section
      const sameSection = inPinned ? idx < pc : idx >= pc
      if (!sameSection) { v.setValue(0); return }

      let shift = 0
      if (from < newHover && idx > from && idx <= newHover) shift = -SLOT_HEIGHT
      else if (from > newHover && idx >= newHover && idx < from) shift = SLOT_HEIGHT
      Animated.timing(v, { toValue: shift, duration: 150, useNativeDriver: false }).start()
    })
  }

  function finishDrag() {
    const from = activeIndex.current
    const to = hoverIndex.current
    activeIndex.current = null
    hoverIndex.current = null
    setActiveKey(null)
    Animated.timing(dragY, { toValue: 0, duration: 150, useNativeDriver: false }).start()
    resetOffsets()
    if (from != null && to != null && from !== to) {
      const next = [...data]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      setData(next)
      onReorder(next)
    }
  }

  function makeResponder(index: number) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        activeIndex.current = index
        hoverIndex.current = index
        setActiveKey(itemKey(data[index]))
        dragY.setValue(0)
      },
      onPanResponderMove: (_, gesture) => {
        dragY.setValue(gesture.dy)
        const from = activeIndex.current
        if (from == null) return
        const raw = from + Math.round(gesture.dy / SLOT_HEIGHT)
        updateHover(raw)
      },
      onPanResponderRelease: finishDrag,
      onPanResponderTerminate: finishDrag,
    })
  }

  const totalHeight = data.length * SLOT_HEIGHT + (showDivider ? DIVIDER_HEIGHT : 0)

  return (
    <View style={{ height: totalHeight }}>
      {showDivider && (
        <View style={[styles.divider, { top: pc * SLOT_HEIGHT }]}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>Other cards</Text>
          <View style={styles.dividerLine} />
        </View>
      )}
      {data.map((item, index) => {
        const key = itemKey(item)
        const isActive = activeKey === key
        const translateY = isActive ? dragY : rowOffsets[index]
        const isPinned = index < pc
        return (
          <Animated.View
            key={key}
            style={[
              styles.row,
              {
                top: topOf(index, pc),
                transform: [{ translateY }],
                zIndex: isActive ? 10 : 1,
                opacity: isActive ? 0.95 : 1,
              },
            ]}
          >
            {isPinned && (
              <Ionicons name="bookmark" size={13} color={itemColor(item)} style={styles.pinIcon} />
            )}
            <View style={[styles.swatch, { backgroundColor: itemColor(item) }]} />
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{itemStoreName(item)}</Text>
              {itemSharedBy(item) ? (
                <Text style={styles.sharedBy} numberOfLines={1}>via {itemSharedBy(item)}</Text>
              ) : null}
            </View>
            <View {...makeResponder(index).panHandlers} style={styles.handle}>
              <Ionicons name="reorder-three" size={22} color={t.textSubtle} />
            </View>
          </Animated.View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: t.border,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pinIcon: { marginRight: -4 },
  swatch: { width: 34, height: 34, borderRadius: 8 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: t.text },
  sharedBy: { fontSize: 11, color: t.textSubtle, marginTop: 1 },
  handle: {
    padding: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'grab' } as any) : {}),
  },
  divider: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: DIVIDER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: t.border },
  dividerLabel: { fontSize: 11, fontWeight: '600', color: t.textSubtle, textTransform: 'uppercase', letterSpacing: 0.8 },
})
