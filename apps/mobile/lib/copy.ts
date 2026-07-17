import * as Clipboard from 'expo-clipboard'
import { Platform } from 'react-native'

export async function copyText(text: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy text to clipboard', err)
    }
    return
  }
  await Clipboard.setStringAsync(text)
}
