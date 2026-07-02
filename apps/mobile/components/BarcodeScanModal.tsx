import { useEffect } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import * as Brightness from 'expo-brightness'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { Ionicons } from '@expo/vector-icons'
import { BarcodeDisplay } from './BarcodeDisplay'
import type { BarcodeType } from '@memberr/shared'

interface Props {
  visible: boolean
  value: string
  type: BarcodeType
  storeName: string
  onClose: () => void
}

export function BarcodeScanModal({ visible, value, type, storeName, onClose }: Props) {
  useEffect(() => {
    if (!visible || Platform.OS === 'web') return
    let originalBrightness = 0.5

    Brightness.getBrightnessAsync()
      .then((b) => { originalBrightness = b; return Brightness.setBrightnessAsync(1.0) })
      .catch(() => {})
    activateKeepAwakeAsync('barcode-scan').catch(() => {})

    return () => {
      Brightness.setBrightnessAsync(originalBrightness).catch(() => {})
      deactivateKeepAwake('barcode-scan')
    }
  }, [visible])

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={styles.container} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <Ionicons name="close" size={20} color="#334155" />
        </TouchableOpacity>
        <Text style={styles.storeName} numberOfLines={2}>{storeName}</Text>
        <View style={styles.barcodeBox}>
          <BarcodeDisplay value={value} type={type} width={320} height={140} />
        </View>
        <Text style={styles.hint}>Tap anywhere to dismiss</Text>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  closeBtn: {
    position: 'absolute', top: 56, right: 24,
    padding: 10, borderRadius: 20, backgroundColor: '#f1f5f9',
  },
  storeName: {
    fontSize: 22, fontWeight: '700', color: '#0F172A',
    letterSpacing: -0.4, marginBottom: 40, textAlign: 'center',
  },
  barcodeBox: {
    width: '100%', alignItems: 'center', paddingHorizontal: 16,
  },
  hint: { marginTop: 36, fontSize: 13, color: '#94a3b8' },
})
