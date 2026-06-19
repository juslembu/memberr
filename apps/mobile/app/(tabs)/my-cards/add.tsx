import { useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { pickImage } from '../../../lib/imagePicker'
import { Ionicons } from '@expo/vector-icons'
import { api, ApiError } from '../../../lib/api'
import { BARCODE_TYPES, BARCODE_LABELS } from '@memberr/shared'
import type { BarcodeType, PredefinedShop } from '@memberr/shared'
import { BarcodeDisplay } from '../../../components/BarcodeDisplay'
import { BarcodeScanner } from '../../../components/BarcodeScanner'

const CARD_COLORS = [
  '#0EA5E9', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#64748b',
]

type Step = 'method' | 'scanning' | 'form'

async function compressToDataUrl(uri: string): Promise<string | null> {
  if (Platform.OS !== 'web') return null
  try {
    const img = new window.Image()
    img.src = uri
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject })
    const maxW = 1200
    const scale = img.width > maxW ? maxW / img.width : 1
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.75)
  } catch {
    return null
  }
}

async function detectBarcodeFromImage(uri: string): Promise<{ value: string; type: BarcodeType } | null> {
  if (Platform.OS !== 'web') return null
  try {
    const { BrowserMultiFormatReader, BarcodeFormat } = await import('@zxing/browser')
    const FORMAT_MAP: Partial<Record<string, BarcodeType>> = {
      AZTEC: 'AZTEC', CODABAR: 'CODABAR', CODE_39: 'CODE39', CODE_128: 'CODE128',
      DATA_MATRIX: 'DATA_MATRIX', EAN_8: 'EAN8', EAN_13: 'EAN13',
      PDF_417: 'PDF417', QR_CODE: 'QR_CODE', UPC_A: 'UPC', UPC_E: 'UPC',
    }
    const reader = new BrowserMultiFormatReader()
    const img = new window.Image()
    img.src = uri
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
    })
    const result = await reader.decodeFromImageElement(img)
    const formatName = BarcodeFormat[result.getBarcodeFormat()]
    const type = FORMAT_MAP[formatName] ?? 'CODE128'
    return { value: result.getText(), type }
  } catch {
    return null
  }
}

export default function AddCardScreen() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('method')
  const [storeName, setStoreName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [barcodeType, setBarcodeType] = useState<BarcodeType>('CODE128')
  const [notes, setNotes] = useState('')
  const [color, setColor] = useState(CARD_COLORS[0])
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [detectError, setDetectError] = useState('')
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null)
  const [cardDataUrl, setCardDataUrl] = useState<string | null>(null)
  const [predefinedShops, setPredefinedShops] = useState<PredefinedShop[]>([])
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null)
  const scannedOnce = useRef(false)

  useFocusEffect(useCallback(() => {
    setStep('method')
    setStoreName('')
    setCardNumber('')
    setBarcodeType('CODE128')
    setNotes('')
    setColor(CARD_COLORS[0])
    setLogoUrl(null)
    setSaving(false)
    setDetecting(false)
    setDetectError('')
    setShowTypePicker(false)
    setExpiresAt('')
    setUploadedImageUri(null)
    setCardDataUrl(null)
    setSelectedShopId(null)
    scannedOnce.current = false
    api.shops.list().then(setPredefinedShops).catch(() => {})
  }, []))

  function handleScanned(type: BarcodeType, value: string) {
    if (scannedOnce.current) return
    scannedOnce.current = true
    setCardNumber(value)
    setBarcodeType(type)
    setStep('form')
  }

  async function handleUpload() {
    setDetectError('')
    const picked = await pickImage()
    if (!picked) return
    const uri = picked.uri

    if (Platform.OS !== 'web') {
      setStep('form')
      return
    }

    setUploadedImageUri(uri)
    setDetecting(true)
    const [detected, dataUrl] = await Promise.all([
      detectBarcodeFromImage(uri),
      compressToDataUrl(uri),
    ])
    setCardDataUrl(dataUrl)
    setDetecting(false)

    if (detected) {
      setCardNumber(detected.value)
      setBarcodeType(detected.type)
    } else {
      setDetectError('No barcode found in image. You can enter the number manually below.')
    }
    setStep('form')
  }

  async function handleSave() {
    if (!storeName.trim() || !cardNumber.trim()) return
    setSaving(true)
    try {
      const parsedExpiry = expiresAt.trim() ? new Date(expiresAt.trim()) : null
      await api.cards.create({
        storeName: storeName.trim(),
        cardNumber: cardNumber.trim(),
        barcodeType,
        notes: notes.trim() || undefined,
        color,
        logoUrl: logoUrl ?? undefined,
        cardImageUrl: cardDataUrl ?? undefined,
        expiresAt: parsedExpiry?.toISOString() ?? undefined,
      })
      router.replace('/(tabs)/my-cards')
    } catch (err) {
      setDetectError(err instanceof ApiError ? err.message : 'Failed to save card')
    } finally {
      setSaving(false)
    }
  }

  if (step === 'scanning') {
    return (
      <BarcodeScanner
        onScanned={handleScanned}
        onCancel={() => setStep('method')}
      />
    )
  }

  if (step === 'method') {
    return (
      <View style={styles.methodContainer}>
        <Text style={styles.methodTitle}>Add a membership card</Text>
        <Text style={styles.methodSub}>How would you like to add your card?</Text>

        <Pressable style={styles.methodCard} onPress={() => { scannedOnce.current = false; setStep('scanning') }}>
          <View style={[styles.methodIcon, { backgroundColor: '#E0F2FE' }]}>
            <Ionicons name="scan-outline" size={28} color="#0EA5E9" />
          </View>
          <View style={styles.methodText}>
            <Text style={styles.methodLabel}>Scan barcode</Text>
            <Text style={styles.methodDesc}>Point your camera at the barcode on your card</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
        </Pressable>

        <Pressable
          style={[styles.methodCard, detecting && styles.methodCardDisabled]}
          onPress={handleUpload}
          disabled={detecting}
        >
          <View style={[styles.methodIcon, { backgroundColor: '#fce7f3' }]}>
            {detecting
              ? <ActivityIndicator size="small" color="#ec4899" />
              : <Ionicons name="image-outline" size={28} color="#ec4899" />}
          </View>
          <View style={styles.methodText}>
            <Text style={styles.methodLabel}>Upload card image</Text>
            <Text style={styles.methodDesc}>
              {Platform.OS === 'web'
                ? "Pick a photo of your card — we'll detect the barcode automatically"
                : 'Choose a photo from your library'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
        </Pressable>

        <Pressable style={styles.methodCard} onPress={() => setStep('form')}>
          <View style={[styles.methodIcon, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="create-outline" size={28} color="#22c55e" />
          </View>
          <View style={styles.methodText}>
            <Text style={styles.methodLabel}>Enter manually</Text>
            <Text style={styles.methodDesc}>Type in the card number and select barcode type</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
        </Pressable>
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
      ) : (
        <View style={[styles.previewCard, { backgroundColor: color }]}>
          <Text style={styles.previewStore}>{storeName || 'Shop Name'}</Text>
          <Text style={styles.previewNumber}>{'0000 0000 0000'}</Text>
        </View>
      )}

      {uploadedImageUri ? (
        <View style={styles.imageRefSection}>
          <Text style={styles.imageRefLabel}>Uploaded card</Text>
          <Image source={{ uri: uploadedImageUri }} style={styles.imageRef} resizeMode="contain" />
        </View>
      ) : null}

      <View style={styles.form}>
        {detectError ? (
          <View style={styles.errorBox}><Text style={styles.errorText}>{detectError}</Text></View>
        ) : null}

        {predefinedShops.length > 0 && (
          <View style={styles.chipsSection}>
            <Text style={styles.chipsLabel}>Quick select</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {predefinedShops.map((shop) => {
                const active = selectedShopId === shop.id
                return (
                  <Pressable
                    key={shop.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => {
                      if (active) {
                        setSelectedShopId(null)
                      } else {
                        setSelectedShopId(shop.id)
                        setStoreName(shop.name)
                        setColor(shop.color)
                        setLogoUrl(shop.logoUrl ?? null)
                      }
                    }}
                  >
                    {shop.logoUrl ? (
                      <Image source={{ uri: shop.logoUrl }} style={styles.chipLogo} resizeMode="contain" />
                    ) : (
                      <View style={[styles.chipDot, { backgroundColor: shop.color }]} />
                    )}
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{shop.name}</Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        )}

        <Text style={styles.label}>Shop name *</Text>
        <TextInput
          style={[styles.input, selectedShopId && styles.inputLocked]}
          value={storeName}
          onChangeText={(v) => { setStoreName(v); setSelectedShopId(null) }}
          placeholder="e.g. Emart, Doremart, Everise"
          placeholderTextColor="#9ca3af"
          editable={!selectedShopId}
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
          <Pressable style={styles.backBtn} onPress={() => setStep('method')}>
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
          <Pressable
            style={[styles.saveBtn, (!storeName.trim() || !cardNumber.trim() || saving) && styles.btnDisabled]}
            onPress={handleSave}
            disabled={!storeName.trim() || !cardNumber.trim() || saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save card'}</Text>
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
  methodContainer: { flex: 1, backgroundColor: '#f9fafb', padding: 24, paddingTop: 32 },
  methodTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 6 },
  methodSub: { fontSize: 15, color: '#6b7280', marginBottom: 32 },
  methodCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 16, marginBottom: 12, gap: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  methodCardDisabled: { opacity: 0.6 },
  methodIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  methodText: { flex: 1 },
  methodLabel: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  methodDesc: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  barcodePreview: { backgroundColor: '#fff', padding: 24, alignItems: 'center', gap: 8 },
  detectedLabel: { fontSize: 12, color: '#9ca3af', textAlign: 'center' },
  imageRefSection: { backgroundColor: '#fff', paddingHorizontal: 24, paddingBottom: 16, alignItems: 'center', gap: 6 },
  imageRefLabel: { fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, alignSelf: 'flex-start' },
  imageRef: { width: '100%', height: 160, borderRadius: 10, backgroundColor: '#f3f4f6' },
  previewCard: {
    margin: 20, borderRadius: 16, padding: 24, aspectRatio: 1.586,
    justifyContent: 'space-between', overflow: 'hidden',
    shadowColor: '#0F172A', shadowOpacity: 0.14, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  previewStore: { fontSize: 22, fontWeight: '700', color: '#fff' },
  previewNumber: { fontSize: 15, color: 'rgba(255,255,255,0.85)', letterSpacing: 2, marginTop: 12 },
  chipsSection: { marginBottom: 4 },
  chipsLabel: { fontSize: 11, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 16 },
  chipsRow: { gap: 8, paddingRight: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  chipActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0EA5E9',
  },
  chipDot: { width: 14, height: 14, borderRadius: 7 },
  chipLogo: { width: 20, height: 20, borderRadius: 4 },
  chipText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  chipTextActive: { color: '#0EA5E9' },
  form: { padding: 24 },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { color: '#dc2626', fontSize: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#111827', backgroundColor: '#fff',
  },
  inputLocked: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
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
  saveBtn: {
    flex: 2, backgroundColor: '#0EA5E9', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
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
