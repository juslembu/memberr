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
}

const SLOT_HEIGHT = 64
const ROW_HEIGHT = 56

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

export function ReorderableCardList({ items, onReorder }: Props) {
  const [data, setData] = useState(items)
  useEffect(() => { setData(items) }, [items])

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

  function updateHover(newHover: number) {
    const from = activeIndex.current
    if (from == null || hoverIndex.current === newHover) return
    hoverIndex.current = newHover
    rowOffsets.forEach((v, idx) => {
      if (idx === from) return
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
        updateHover(Math.max(0, Math.min(data.length - 1, raw)))
      },
      onPanResponderRelease: finishDrag,
      onPanResponderTerminate: finishDrag,
    })
  }

  return (
    <View style={{ height: data.length * SLOT_HEIGHT }}>
      {data.map((item, index) => {
        const key = itemKey(item)
        const isActive = activeKey === key
        const translateY = isActive ? dragY : rowOffsets[index]
        return (
          <Animated.View
            key={key}
            style={[
              styles.row,
              {
                top: index * SLOT_HEIGHT,
                transform: [{ translateY }],
                zIndex: isActive ? 10 : 1,
                opacity: isActive ? 0.95 : 1,
              },
            ]}
          >
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
  swatch: { width: 34, height: 34, borderRadius: 8 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: t.text },
  sharedBy: { fontSize: 11, color: t.textSubtle, marginTop: 1 },
  handle: {
    padding: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'grab' } as any) : {}),
  },
})
