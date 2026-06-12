import * as ImagePicker from 'expo-image-picker'

export async function pickImage(): Promise<{ uri: string } | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
  if (result.canceled || !result.assets[0]) return null
  return { uri: result.assets[0].uri }
}
