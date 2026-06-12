import { View, Text, StyleSheet, Platform } from 'react-native'
import type { BarcodeType } from '@memberr/shared'

interface Props {
  value: string
  type: BarcodeType
  width?: number
  height?: number
}

export function BarcodeDisplay({ value, type, width = 280, height = 100 }: Props) {
  if (Platform.OS === 'web') {
    return <WebBarcode value={value} type={type} width={width} height={height} />
  }
  return <NativeBarcodePlaceholder value={value} type={type} width={width} height={height} />
}

function NativeBarcodePlaceholder({ value, type, width, height }: Props) {
  return (
    <View style={[styles.placeholder, { width, height }]}>
      <Text style={styles.placeholderText}>{type}</Text>
      <Text style={styles.placeholderValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  )
}

function WebBarcode({ value, type, width, height }: Props) {
  return (
    <View style={[styles.placeholder, { width, height }]}>
      <Text style={styles.placeholderText}>{type}</Text>
      <Text style={styles.placeholderValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  placeholderText: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 },
  placeholderValue: { fontSize: 14, color: '#374151', textAlign: 'center', fontWeight: '600' },
})
