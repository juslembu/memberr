import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const BIOMETRIC_ENABLED_KEY = 'memberr_biometric_enabled'

export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const compatible = await LocalAuthentication.hasHardwareAsync()
  if (!compatible) return false
  const enrolled = await LocalAuthentication.isEnrolledAsync()
  return enrolled
}

export async function getBiometricEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY)
  return value === 'true'
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (Platform.OS === 'web') return
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true')
  } else {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY)
  }
}

export async function authenticateWithBiometric(reason = 'Unlock Memberr'): Promise<boolean> {
  if (Platform.OS === 'web') return true
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    fallbackLabel: 'Use passcode',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  })
  return result.success
}
