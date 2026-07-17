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
  setUser: (user: User | null) => void
}

export const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  setUser: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

function routeAfterLogin(user: User) {
  if (user.mustChangePassword) {
    router.replace('/change-password')
  } else {
    router.replace('/(tabs)/my-cards')
  }
}

export function useAuthState(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      .catch((err) => {
        console.error('Auth session check failed', err)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(data: LoginInput) {
    const result = await api.auth.login(data)
    setUser(result.user)
    routeAfterLogin(result.user)
  }

  async function register(data: RegisterInput) {
    const result = await api.auth.register(data)
    setUser(result.user)
    routeAfterLogin(result.user)
  }

  async function logout() {
    try {
      await api.auth.logout()
    } catch (err) {
      console.error('Logout failed', err)
    }
    setUser(null)
    router.replace('/(auth)/login')
  }

  return { user, loading, login, register, logout, setUser }
}
