import { useEffect } from 'react'
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native'
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import type { BarcodeType } from '@memberr/shared'

interface Props {
  onScanned: (type: BarcodeType, value: string) => void
  onCancel: () => void
}

const CAMERA_TYPE_MAP: Record<string, BarcodeType> = {
  aztec: 'AZTEC',
  ean13: 'EAN13',
  ean8: 'EAN8',
  qr: 'QR_CODE',
  pdf417: 'PDF417',
  datamatrix: 'DATA_MATRIX',
  code39: 'CODE39',
  code93: 'CODE128',
  itf14: 'CODE128',
  codabar: 'CODABAR',
  code128: 'CODE128',
  upc_a: 'UPC',
  upc_e: 'UPC',
}

export function BarcodeScanner({ onScanned, onCancel }: Props) {
  const [permission, requestPermission] = useCameraPermissions()

  useEffect(() => {
    if (!permission?.granted) requestPermission()
  }, [])

  function handleScanned({ type, data }: BarcodeScanningResult) {
    const mapped = CAMERA_TYPE_MAP[type.toLowerCase()] ?? 'CODE128'
    onScanned(mapped, data)
  }

  if (!permission) return null

  if (!permission.granted) {
    return (
      <View style={styles.permissionBox}>
        <Ionicons name="camera-outline" size={48} color="#6366f1" />
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionSub}>Allow camera access to scan barcodes</Text>
        <Pressable style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant permission</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={styles.cancelLink}>
          <Text style={styles.cancelLinkText}>Cancel</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={handleScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'pdf417', 'aztec', 'datamatrix', 'upc_a', 'upc_e', 'codabar', 'itf14'] }}
      />
      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <Pressable onPress={onCancel} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          <Text style={styles.topBarTitle}>Scan barcode</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.scanArea}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        <Text style={styles.hint}>
          {Platform.OS === 'web'
            ? 'Point at the barcode on your card'
            : 'Hold your card steady in the frame'}
        </Text>
      </View>
    </View>
  )
}

const CORNER = 24
const BORDER = 3

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', paddingBottom: 60 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  closeBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  topBarTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  scanArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanFrame: {
    width: 260, height: 160, position: 'relative',
  },
  corner: {
    position: 'absolute', width: CORNER, height: CORNER, borderColor: '#6366f1',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER },
  cornerTR: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER },
  hint: {
    color: 'rgba(255,255,255,0.8)', textAlign: 'center',
    fontSize: 14, paddingHorizontal: 40,
  },
  permissionBox: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, gap: 12, backgroundColor: '#f9fafb',
  },
  permissionTitle: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center' },
  permissionSub: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
  permissionBtn: {
    backgroundColor: '#6366f1', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 32, marginTop: 8,
  },
  permissionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelLink: { paddingVertical: 12 },
  cancelLinkText: { color: '#6b7280', fontSize: 15 },
})
