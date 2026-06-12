import { Redirect } from 'expo-router'
import { useAuth } from '../hooks/useAuth'

export default function Index() {
  const { user, loading } = useAuth()
  if (loading) return null
  return <Redirect href={user ? '/(tabs)/my-cards' : '/(auth)/login'} />
}
