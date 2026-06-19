import { useEffect, useState } from 'react'
import { Platform } from 'react-native'
import { Redirect } from 'expo-router'
import { useAuth } from '../hooks/useAuth'
import { hasServerUrl } from '../lib/serverUrl'

export default function Index() {
  const { user, loading } = useAuth()
  const [serverConfigured, setServerConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    hasServerUrl().then(setServerConfigured)
  }, [])

  if (loading || serverConfigured === null) return null
  if (Platform.OS !== 'web' && !serverConfigured) return <Redirect href="/server-setup" />
  return <Redirect href={user ? '/(tabs)/my-cards' : '/(auth)/login'} />
}
