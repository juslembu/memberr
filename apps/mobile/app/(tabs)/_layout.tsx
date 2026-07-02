import { useState, useEffect } from 'react'
import { Tabs } from 'expo-router'
import { StyleSheet, Platform, View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { t } from '../../lib/theme'
import { api } from '../../lib/api'
import { registerBadgeRefresh } from '../../lib/invitationsBadge'

function BadgeIcon({ name, focused, color, count }: {
  name: string; focused: boolean; color: string; count: number
}) {
  return (
    <View>
      <Ionicons name={focused ? name : `${name}-outline` as any} size={22} color={color} />
      {count > 0 && (
        <View style={badge.dot}>
          <Text style={badge.text}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </View>
  )
}

const badge = StyleSheet.create({
  dot: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  text: { color: '#fff', fontSize: 9, fontWeight: '700' },
})

export default function TabsLayout() {
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function fetchCount() {
      try {
        const data = await api.invitations.incoming()
        if (!cancelled) setPendingCount(data.length)
      } catch {}
    }
    registerBadgeRefresh(fetchCount)
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.textSubtle,
        tabBarStyle: {
          backgroundColor: t.surface,
          borderTopColor: t.borderStrong,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 84 : Platform.OS === 'web' ? 84 : 62,
          paddingBottom: Platform.OS === 'ios' ? 24 : Platform.OS === 'web' ? 16 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 16,
          fontWeight: '600',
          marginTop: 3,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="my-cards"
        options={{
          title: 'Cards',
          tabBarItemStyle: { flex: 1 },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'card' : 'card-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shared-with-me"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { flex: 0, width: 0, overflow: 'hidden' },
        }}
      />
      <Tabs.Screen
        name="invitations"
        options={{
          title: 'Invitations',
          tabBarItemStyle: { flex: 1 },
          tabBarIcon: ({ color, focused }) => (
            <BadgeIcon name="mail" focused={focused} color={color} count={pendingCount} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarItemStyle: { flex: 1 },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
