import { View, Text, StyleSheet } from 'react-native'
import type { BarcodeType } from '@memberr/shared'
import BarcodeNative from 'react-native-barcode-svg'
import QRCode from 'react-native-qrcode-svg'

interface Props {
  value: string
  type: BarcodeType
  width?: number
  height?: number
}

const LINEAR_FORMAT: Partial<Record<BarcodeType, string>> = {
  CODE128: 'CODE128',
  CODE39: 'CODE39',
  EAN13: 'EAN13',
  EAN8: 'EAN8',
  UPC: 'UPC',
  CODABAR: 'codabar',
}

function isRenderableValue(value: string, type: BarcodeType): boolean {
  if (!value) return false
  if (type === 'EAN13') return /^\d{12,13}$/.test(value.replace(/\s/g, ''))
  if (type === 'EAN8') return /^\d{7,8}$/.test(value.replace(/\s/g, ''))
  if (type === 'UPC') return /^\d{11,12}$/.test(value.replace(/\s/g, ''))
  return true
}

export function BarcodeDisplay({ value, type, width = 280, height = 100 }: Props) {
  if (!value) return null

  if (type === 'QR_CODE') {
    const size = Math.max(height, 120)
    return (
      <View style={styles.qrWrap}>
        <QRCode value={value} size={size} />
      </View>
    )
  }

  const format = LINEAR_FORMAT[type]
  if (format && isRenderableValue(value, type)) {
    return (
      <View style={styles.barcodeWrap}>
        <BarcodeNative
          value={value.replace(/\s/g, '')}
          format={format}
          width={1.2}
          height={height}
          maxWidth={width}
          lineColor="#111827"
          backgroundColor="transparent"
        />
      </View>
    )
  }

  return (
    <View style={[styles.fallback, { width, height }]}>
      <Text style={styles.fallbackType}>{type.replace('_', ' ')}</Text>
      <Text style={styles.fallbackValue} numberOfLines={2}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  barcodeWrap: { alignItems: 'center', backgroundColor: '#fff', padding: 8, borderRadius: 8 },
  qrWrap: { alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8 },
  fallback: {
    backgroundColor: '#f3f4f6', borderRadius: 8, justifyContent: 'center',
    alignItems: 'center', padding: 12,
  },
  fallbackType: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 },
  fallbackValue: { fontSize: 14, color: '#374151', textAlign: 'center', fontWeight: '600' },
})
