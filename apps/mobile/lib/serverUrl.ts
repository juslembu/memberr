import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import Constants from 'expo-constants'

const SERVER_URL_KEY = 'memberr_server_url'

const BUNDLED_DEFAULT = Constants.expoConfig?.extra?.apiUrl as string | undefined

// undefined = not loaded from storage yet, '' = loaded and unset
let cached: string | undefined

export function normalizeServerUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, '')
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`
  return url
}

export function getBundledDefaultServerUrl(): string {
  return BUNDLED_DEFAULT ?? ''
}

// On a real deploy, the web app and API are served from the same origin
// (see infra/Caddyfile — /api/* is reverse-proxied on the same domain), so
// self-hosters get a working web build with zero config. The Metro dev
// server (localhost:8081) has no such proxy, so local dev still targets the
// local API directly per the documented `pnpm --filter @memberr/api dev`
// workflow. Native apps are a single distributable binary with no "origin"
// of their own, so they need an explicit, user-entered server URL instead.
export async function getServerUrl(): Promise<string> {
  if (Platform.OS === 'web') {
    const { hostname, origin } = window.location
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:3000'
    return origin
  }
  if (cached !== undefined) return cached
  const stored = await SecureStore.getItemAsync(SERVER_URL_KEY)
  cached = stored ?? ''
  return cached
}

export async function setServerUrl(url: string): Promise<void> {
  const normalized = normalizeServerUrl(url)
  cached = normalized
  if (Platform.OS !== 'web') await SecureStore.setItemAsync(SERVER_URL_KEY, normalized)
}

export async function clearServerUrl(): Promise<void> {
  cached = ''
  if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(SERVER_URL_KEY)
}

export async function hasServerUrl(): Promise<boolean> {
  if (Platform.OS === 'web') return true
  return (await getServerUrl()).length > 0
}

export async function pingServer(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${normalizeServerUrl(url)}/health`)
    if (!res.ok) return false
    const data = (await res.json().catch(() => null)) as { ok?: boolean } | null
    return data?.ok === true
  } catch {
    return false
  }
}
