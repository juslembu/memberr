import { useEffect } from 'react'
import { Platform } from 'react-native'

export function useServiceWorker() {
  useEffect(() => {
    if (Platform.OS !== 'web') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
}
