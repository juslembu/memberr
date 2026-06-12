import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import type {
  User,
  Card,
  CardShare,
  Invitation,
  SharedCard,
  CreateCardInput,
  UpdateCardInput,
  ShareCardInput,
  RegisterInput,
  LoginInput,
} from '@memberr/shared'

const API_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://localhost:3000'

const ACCESS_TOKEN_KEY = 'memberr_access_token'

async function getAccessToken(): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem(ACCESS_TOKEN_KEY)
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY)
}

async function setAccessToken(token: string): Promise<void> {
  if (Platform.OS === 'web') { localStorage.setItem(ACCESS_TOKEN_KEY, token); return }
  return SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token)
}

async function clearAccessToken(): Promise<void> {
  if (Platform.OS === 'web') { localStorage.removeItem(ACCESS_TOKEN_KEY); return }
  return SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY)
}

async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken()
  const hasBody = options.body != null
  const headers: Record<string, string> = {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' })

  if (res.status === 401) {
    const refreshed = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (refreshed.ok) {
      const data = (await refreshed.json()) as { accessToken: string }
      await setAccessToken(data.accessToken)
      headers['Authorization'] = `Bearer ${data.accessToken}`
      return fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' })
    } else {
      await clearAccessToken()
      throw new ApiError(401, 'Session expired')
    }
  }

  return res
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: unknown; message?: unknown }
    const msg = typeof body.error === 'string' ? body.error
      : typeof body.message === 'string' ? body.message
      : `HTTP ${res.status}`
    throw new ApiError(res.status, msg)
  }
  return res.json() as Promise<T>
}

export const api = {
  auth: {
    async register(data: RegisterInput): Promise<{ user: User; accessToken: string }> {
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      })
      const result = await json<{ user: User; accessToken: string }>(res)
      await setAccessToken(result.accessToken)
      return result
    },

    async login(data: LoginInput): Promise<{ user: User; accessToken: string }> {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      })
      const result = await json<{ user: User; accessToken: string }>(res)
      await setAccessToken(result.accessToken)
      return result
    },

    async logout(): Promise<void> {
      await fetchWithAuth('/api/v1/auth/logout', { method: 'POST' })
      await clearAccessToken()
    },

    async me(): Promise<User> {
      return json<User>(await fetchWithAuth('/api/v1/auth/me'))
    },
  },

  cards: {
    async list(): Promise<Card[]> {
      return json<Card[]>(await fetchWithAuth('/api/v1/cards'))
    },

    async get(id: string): Promise<Card> {
      return json<Card>(await fetchWithAuth(`/api/v1/cards/${id}`))
    },

    async create(data: CreateCardInput): Promise<Card> {
      return json<Card>(
        await fetchWithAuth('/api/v1/cards', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      )
    },

    async update(id: string, data: UpdateCardInput): Promise<Card> {
      return json<Card>(
        await fetchWithAuth(`/api/v1/cards/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      )
    },

    async remove(id: string): Promise<void> {
      await fetchWithAuth(`/api/v1/cards/${id}`, { method: 'DELETE' })
    },
  },

  shares: {
    async list(cardId: string): Promise<CardShare[]> {
      return json<CardShare[]>(await fetchWithAuth(`/api/v1/cards/${cardId}/shares`))
    },

    async share(
      cardId: string,
      data: ShareCardInput,
    ): Promise<{ type: 'share' | 'invitation'; share?: CardShare; invitation?: Invitation }> {
      return json(
        await fetchWithAuth(`/api/v1/cards/${cardId}/shares`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      )
    },

    async revoke(cardId: string, shareId: string): Promise<void> {
      await fetchWithAuth(`/api/v1/cards/${cardId}/shares/${shareId}`, { method: 'DELETE' })
    },
  },

  invitations: {
    async incoming(): Promise<Invitation[]> {
      return json<Invitation[]>(await fetchWithAuth('/api/v1/invitations/incoming'))
    },

    async outgoing(): Promise<Invitation[]> {
      return json<Invitation[]>(await fetchWithAuth('/api/v1/invitations/outgoing'))
    },

    async accept(token: string): Promise<void> {
      await fetchWithAuth(`/api/v1/invitations/token/${token}/accept`, { method: 'POST' })
    },

    async decline(token: string): Promise<void> {
      await fetchWithAuth(`/api/v1/invitations/token/${token}/decline`, { method: 'POST' })
    },

    async cancel(id: string): Promise<void> {
      await fetchWithAuth(`/api/v1/invitations/${id}`, { method: 'DELETE' })
    },
  },

  sharedWithMe: {
    async list(): Promise<SharedCard[]> {
      return json<SharedCard[]>(await fetchWithAuth('/api/v1/shared-with-me'))
    },

    async get(shareId: string): Promise<SharedCard> {
      return json<SharedCard>(await fetchWithAuth(`/api/v1/shared-with-me/${shareId}`))
    },
  },
}
