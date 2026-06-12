import { useState, useEffect, createContext, useContext } from 'react'
import { router } from 'expo-router'
import { api } from '../lib/api'
import type { User, RegisterInput, LoginInput } from '@memberr/shared'

interface AuthState {
  user: User | null
  loading: boolean
  login: (data: LoginInput) => Promise<void>
  register: (data: RegisterInput) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function useAuthState(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(data: LoginInput) {
    const result = await api.auth.login(data)
    setUser(result.user)
    router.replace('/(tabs)/my-cards')
  }

  async function register(data: RegisterInput) {
    const result = await api.auth.register(data)
    setUser(result.user)
    router.replace('/(tabs)/my-cards')
  }

  async function logout() {
    await api.auth.logout().catch(() => {})
    setUser(null)
    router.replace('/(auth)/login')
  }

  return { user, loading, login, register, logout }
}
