import { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, ApiError } from '../../../lib/api'
import { BARCODE_TYPES, BARCODE_LABELS } from '@memberr/shared'
import type { BarcodeType, Card } from '@memberr/shared'
import { BarcodeDisplay } from '../../../components/BarcodeDisplay'

const CARD_COLORS = [
  '#0EA5E9', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#64748b',
]

export default function EditCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [card, setCard] = useState<Card | null>(null)
  const [storeName, setStoreName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [barcodeType, setBarcodeType] = useState<BarcodeType>('CODE128')
  const [notes, setNotes] = useState('')
  const [color, setColor] = useState(CARD_COLORS[0])
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showTypePicker, setShowTypePicker] = useState(false)

  useFocusEffect(useCallback(() => {
    api.cards.get(id).then((c) => {
      setCard(c)
      setStoreName(c.storeName)
      setCardNumber(c.cardNumber)
      setBarcodeType(c.barcodeType as BarcodeType)
      setNotes(c.notes ?? '')
      setColor(c.color ?? CARD_COLORS[0])
      setExpiresAt(c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : '')
      setLoading(false)
    }).catch(() => {
      setError('Failed to load card')
      setLoading(false)
    })
  }, [id]))

  async function handleSave() {
    if (!storeName.trim() || !cardNumber.trim()) return
    setError('')
    setSaving(true)
    try {
      const parsedExpiry = expiresAt.trim() ? new Date(expiresAt.trim()) : null
      if (expiresAt.trim() && isNaN(parsedExpiry!.getTime())) {
        setError('Invalid date format — use YYYY-MM-DD')
        setSaving(false)
        return
      }
      await api.cards.update(id, {
        storeName: storeName.trim(),
        cardNumber: cardNumber.trim(),
        barcodeType,
        notes: notes.trim() || undefined,
        color,
        expiresAt: parsedExpiry?.toISOString() ?? null,
      })
      router.back()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {cardNumber ? (
        <View style={styles.barcodePreview}>
          <BarcodeDisplay value={cardNumber} type={barcodeType} width={300} height={110} />
          <Text style={styles.detectedLabel}>{BARCODE_LABELS[barcodeType]} · {cardNumber}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

        <Text style={styles.label}>Shop name *</Text>
        <TextInput
          style={styles.input}
          value={storeName}
          onChangeText={setStoreName}
          placeholder="e.g. Emart, Doremart, Everise"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Card / membership number *</Text>
        <TextInput
          style={styles.input}
          value={cardNumber}
          onChangeText={setCardNumber}
          placeholder="Card number or code"
          placeholderTextColor="#9ca3af"
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Barcode type</Text>
        <Pressable style={styles.picker} onPress={() => setShowTypePicker(true)}>
          <Text style={styles.pickerText}>{BARCODE_LABELS[barcodeType]}</Text>
          <Text style={styles.pickerChevron}>▾</Text>
        </Pressable>

        <Text style={styles.label}>Card color</Text>
        <View style={styles.colorRow}>
          {CARD_COLORS.map((c) => (
            <Pressable
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
          placeholder="e.g. Rewards tier, member since, notes"
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Expiry date (optional)</Text>
        <TextInput
          style={styles.input}
          value={expiresAt}
          onChangeText={setExpiresAt}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.actions}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.saveBtn, (!storeName.trim() || !cardNumber.trim() || saving) && styles.btnDisabled]}
            onPress={handleSave}
            disabled={!storeName.trim() || !cardNumber.trim() || saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save changes'}</Text>
          </Pressable>
        </View>
      </View>

      {showTypePicker && (
        <Pressable style={styles.modalOverlay} onPress={() => setShowTypePicker(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Select barcode type</Text>
            <ScrollView>
              {BARCODE_TYPES.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.modalItem, barcodeType === t && styles.modalItemSelected]}
                  onPress={() => { setBarcodeType(t); setShowTypePicker(false) }}
                >
                  <Text style={[styles.modalItemText, barcodeType === t && styles.modalItemTextSelected]}>
                    {BARCODE_LABELS[t]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.modalCancel} onPress={() => setShowTypePicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  barcodePreview: { backgroundColor: '#fff', padding: 24, alignItems: 'center', gap: 8 },
  detectedLabel: { fontSize: 12, color: '#9ca3af', textAlign: 'center' },
  form: { padding: 24 },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { color: '#dc2626', fontSize: 14 },
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
  actions: { flexDirection: 'row', gap: 12, marginTop: 32, marginBottom: 40 },
  backBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  backBtnText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  saveBtn: { flex: 2, backgroundColor: '#0EA5E9', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: 480, padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  modalItem: { paddingVertical: 14, paddingHorizontal: 8, borderRadius: 8 },
  modalItemSelected: { backgroundColor: '#E0F2FE' },
  modalItemText: { fontSize: 16, color: '#374151' },
  modalItemTextSelected: { color: '#0EA5E9', fontWeight: '600' },
  modalCancel: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  modalCancelText: { fontSize: 16, color: '#6b7280' },
})
