import { useEffect } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { api } from '../lib/api'

export function usePushNotifications() {
  useEffect(() => {
    if (Platform.OS === 'web') return
    void registerPushToken()
  }, [])
}

async function registerPushToken() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0EA5E9',
      })
    }

    const perms = await Notifications.requestPermissionsAsync() as { status: string }
    if (perms.status !== 'granted') return

    const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined
    const projectId = extra?.eas?.projectId
    if (!projectId) return

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId }).catch(() => null)
    if (!tokenData) return
    await api.auth.savePushToken(tokenData.data)
  } catch {
    // Not available in this environment (simulator without push support, etc.)
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
