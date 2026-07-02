export const lightTheme = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
  accent: '#0EA5E9',
  accentDark: '#0284C7',
  accentBg: '#F0F9FF',
  brand: '#0F172A',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  errorBg: '#FEF2F2',
  errorText: '#DC2626',
} as const

export const darkTheme = {
  bg: '#0F172A',
  surface: '#1E293B',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  textSubtle: '#64748B',
  accent: '#38BDF8',
  accentDark: '#0EA5E9',
  accentBg: '#0C2A3F',
  brand: '#F1F5F9',
  border: '#334155',
  borderStrong: '#475569',
  errorBg: '#3B0F0F',
  errorText: '#F87171',
} as const

export type Theme = { [K in keyof typeof lightTheme]: string }

// backward compat — static consumers that haven't been migrated yet
export const t = lightTheme
