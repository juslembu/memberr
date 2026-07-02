import { createContext, useContext, useEffect, useState } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { lightTheme, darkTheme, Theme } from './theme'

export type ThemePref = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'memberr_theme_pref'

const Ctx = createContext<{
  t: Theme
  mode: 'light' | 'dark'
  pref: ThemePref
  setPref: (p: ThemePref) => void
}>({ t: lightTheme, mode: 'light', pref: 'system', setPref: () => {} })

function getWebInitial(): ThemePref {
  try {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(STORAGE_KEY)
      if (v === 'light' || v === 'dark' || v === 'system') return v
    }
  } catch {}
  return 'system'
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme()
  const [pref, setPrefState] = useState<ThemePref>(getWebInitial)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      if (v === 'light' || v === 'dark' || v === 'system') setPrefState(v)
    })
  }, [])

  function setPref(p: ThemePref) {
    setPrefState(p)
    AsyncStorage.setItem(STORAGE_KEY, p)
  }

  const mode: 'light' | 'dark' = pref === 'system' ? (systemScheme ?? 'light') : pref
  const t = mode === 'dark' ? darkTheme : lightTheme

  return (
    <Ctx.Provider value={{ t, mode, pref, setPref }}>
      {children}
    </Ctx.Provider>
  )
}

export function useTheme(): Theme { return useContext(Ctx).t }
export function useThemePref() {
  const { pref, setPref, mode } = useContext(Ctx)
  return { pref, setPref, mode }
}
