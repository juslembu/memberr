import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  FlatList,
} from 'react-native'
import { useRouter } from 'expo-router'
import { api, ApiError } from '../../../lib/api'
import { BARCODE_TYPES, BARCODE_LABELS } from '@memberr/shared'
import type { BarcodeType } from '@memberr/shared'

const CARD_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#64748b',
]

export default function AddCardScreen() {
  const router = useRouter()
  const [storeName, setStoreName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [barcodeType, setBarcodeType] = useState<BarcodeType>('CODE128')
  const [notes, setNotes] = useState('')
  const [color, setColor] = useState(CARD_COLORS[0])
  const [loading, setLoading] = useState(false)
  const [showTypePicker, setShowTypePicker] = useState(false)

  async function handleSave() {
    if (!storeName.trim() || !cardNumber.trim()) {
      Alert.alert('Required', 'Please enter a store name and card number')
      return
    }
    setLoading(true)
    try {
      await api.cards.create({
        storeName: storeName.trim(),
        cardNumber: cardNumber.trim(),
        barcodeType,
        notes: notes.trim() || undefined,
        color,
      })
      router.back()
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed to save card')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.preview}>
        <View style={[styles.previewCard, { backgroundColor: color }]}>
          <Text style={styles.previewStore}>{storeName || 'Store Name'}</Text>
          <Text style={styles.previewNumber}>{cardNumber || '0000 0000 0000'}</Text>
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Store name</Text>
        <TextInput
          style={styles.input}
          value={storeName}
          onChangeText={setStoreName}
          placeholder="e.g. Costco, Target, CVS"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Card / membership number</Text>
        <TextInput
          style={styles.input}
          value={cardNumber}
          onChangeText={setCardNumber}
          placeholder="Card number or code"
          placeholderTextColor="#9ca3af"
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Barcode type</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setShowTypePicker(true)}>
          <Text style={styles.pickerText}>{BARCODE_LABELS[barcodeType]}</Text>
          <Text style={styles.pickerChevron}>▾</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Card color</Text>
        <View style={styles.colorRow}>
          {CARD_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSelected]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Rewards tier, PIN, notes"
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Saving…' : 'Save card'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showTypePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select barcode type</Text>
            <FlatList
              data={BARCODE_TYPES}
              keyExtractor={(t) => t}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, barcodeType === item && styles.modalItemSelected]}
                  onPress={() => { setBarcodeType(item); setShowTypePicker(false) }}
                >
                  <Text style={[styles.modalItemText, barcodeType === item && styles.modalItemTextSelected]}>
                    {BARCODE_LABELS[item]}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowTypePicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  preview: { padding: 24, paddingBottom: 8 },
  previewCard: {
    borderRadius: 16, padding: 24, minHeight: 120, justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  previewStore: { fontSize: 22, fontWeight: '700', color: '#fff' },
  previewNumber: { fontSize: 16, color: 'rgba(255,255,255,0.85)', letterSpacing: 2, marginTop: 12 },
  form: { padding: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#111827', backgroundColor: '#fff',
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  picker: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerText: { fontSize: 16, color: '#111827' },
  pickerChevron: { fontSize: 16, color: '#6b7280' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18 },
  colorSelected: { borderWidth: 3, borderColor: '#111827' },
  button: {
    backgroundColor: '#6366f1', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 32, marginBottom: 40,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '70%', padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  modalItem: { paddingVertical: 14, paddingHorizontal: 8, borderRadius: 8 },
  modalItemSelected: { backgroundColor: '#ede9fe' },
  modalItemText: { fontSize: 16, color: '#374151' },
  modalItemTextSelected: { color: '#6366f1', fontWeight: '600' },
  modalCancel: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  modalCancelText: { fontSize: 16, color: '#6b7280' },
})
