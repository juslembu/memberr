// jest.setup.js for @memberr/mobile

// Extend jest matchers for React Native Testing Library
import '@testing-library/react-native/extend-expect'

// Mock native modules that don't exist in Node.js test environment
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}))

jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '1.0.0',
    extra: { apiUrl: '' },
  },
}))

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}))

jest.mock('expo-haptics', () => ({}))

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(false)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(false)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: false })),
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: () => void) => cb(),
  Stack: { Screen: () => null },
  Redirect: () => null,
  Link: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}))

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}))

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'test-token' })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
}))

jest.mock('expo-font', () => ({
  useFonts: () => [true],
}))

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}))

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
