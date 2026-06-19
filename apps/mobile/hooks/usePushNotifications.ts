import { useEffect } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { api } from '../lib/api'

export function usePushNotifications() {
  useEffect(() => {
    if (Platform.OS === 'web') return
    void registerPushToken()
  }, [])
}

async function registerPushToken() {
  try {
    const perms = await Notifications.requestPermissionsAsync() as { status: string }
    if (perms.status !== 'granted') return
    // Requires EAS projectId for production push tokens — gracefully skips without it
    const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null)
    if (!tokenData) return
    await api.auth.savePushToken(tokenData.data)
  } catch {
    // Not available in this environment (web, simulator without push support, etc.)
  }
}

export async function scheduleExpiryNotification(cardName: string, expiresAt: Date) {
  if (Platform.OS === 'web') return
  try {
    const reminderDate = new Date(expiresAt.getTime() - 7 * 24 * 60 * 60 * 1000)
    if (reminderDate <= new Date()) return
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Card expiring soon',
        body: `Your ${cardName} membership card expires in 7 days`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderDate },
    })
  } catch {
    // Local notifications not available
  }
}
