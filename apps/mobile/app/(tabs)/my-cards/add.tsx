import { useMemo, useState, useRef, useCallback } from 'react'
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
import * as ImageManipulator from 'expo-image-manipulator'
import { pickImage } from '../../../lib/imagePicker'
import { Ionicons } from '@expo/vector-icons'
import { api, ApiError } from '../../../lib/api'
import { BARCODE_TYPES, BARCODE_LABELS } from '@memberr/shared'
import type { BarcodeType, PredefinedShop } from '@memberr/shared'
import { BarcodeDisplay } from '../../../components/BarcodeDisplay'
import { BarcodeScanner } from '../../../components/BarcodeScanner'
import { useTheme } from '../../../lib/ThemeContext'
import type { Theme } from '../../../lib/theme'

const CARD_COLORS = [
  '#0EA5E9', '#2563EB', '#4F46E5', '#7C3AED', '#9333EA', '#C026D3',
  '#DB2777', '#E11D48', '#DC2626', '#EA580C', '#F97316', '#D97706',
  '#EAB308', '#84CC16', '#22C55E', '#16A34A', '#14B8A6', '#0891B2',
  '#1E293B', '#374151', '#78350F', '#064E3B', '#4338CA', '#6B21A8',
]

function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex)
}

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
  } catch (err) {
    console.error('Failed to compress image on web', err)
    return null
  }
}

async function compressImageNative(uri: string): Promise<string | null> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    )
    if (!result.base64) return null
    return `data:image/jpeg;base64,${result.base64}`
  } catch (err) {
    console.error('Failed to compress image on native', err)
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
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject })
    const result = await reader.decodeFromImageElement(img)
    const formatName = BarcodeFormat[result.getBarcodeFormat()]
    const type = FORMAT_MAP[formatName] ?? 'CODE128'
    return { value: result.getText(), type }
  } catch (err) {
    console.error('Failed to detect barcode from image', err)
    return null
  }
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    methodContainer: { flex: 1, backgroundColor: t.bg, padding: 24, paddingTop: 32 },
    methodHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 4 },
    methodBack: { padding: 4, marginRight: 8 },
    methodTitle: { fontSize: 24, fontWeight: '800', color: t.text, marginBottom: 6 },
    methodSub: { fontSize: 15, color: t.textMuted, marginBottom: 32 },
    methodCard: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface,
      borderRadius: 16, padding: 16, marginBottom: 12, gap: 14,
      shadowColor: t.text, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    methodCardDisabled: { opacity: 0.6 },
    methodIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    methodText: { flex: 1 },
    methodLabel: { fontSize: 16, fontWeight: '700', color: t.text, marginBottom: 2 },
    methodDesc: { fontSize: 13, color: t.textMuted, lineHeight: 18 },
    barcodePreview: { backgroundColor: t.surface, padding: 24, alignItems: 'center', gap: 8 },
    detectedLabel: { fontSize: 12, color: t.textSubtle, textAlign: 'center' },
    imageRefSection: { backgroundColor: t.surface, paddingHorizontal: 24, paddingBottom: 16, alignItems: 'center', gap: 6 },
    imageRefLabel: { fontSize: 12, color: t.textSubtle, textTransform: 'uppercase', letterSpacing: 0.5, alignSelf: 'flex-start' },
    imageRef: { width: '100%', height: 160, borderRadius: 10, backgroundColor: t.bg },
    previewCard: {
      margin: 20, borderRadius: 16, padding: 24, aspectRatio: 1.586,
      justifyContent: 'space-between', overflow: 'hidden',
      shadowColor: '#0F172A', shadowOpacity: 0.14, shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 }, elevation: 5,
    },
    previewStore: { fontSize: 22, fontWeight: '700', color: '#fff' },
    previewNumber: { fontSize: 15, color: 'rgba(255,255,255,0.85)', letterSpacing: 2, marginTop: 12 },
    form: { padding: 24 },
    errorBox: { backgroundColor: t.errorBg, borderRadius: 10, padding: 12, marginBottom: 12 },
    errorText: { color: t.errorText, fontSize: 14 },
    label: { fontSize: 14, fontWeight: '600', color: t.textMuted, marginBottom: 6, marginTop: 16 },
    input: {
      borderWidth: 1, borderColor: t.border, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: t.text, backgroundColor: t.surface,
    },
    shopInputWrap: { position: 'relative' },
    shopInputSelected: { paddingRight: 40 },
    shopClearBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
    shopSelectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingHorizontal: 2 },
    selectedLogo: { width: 16, height: 16, borderRadius: 3 },
    shopSelectedText: { fontSize: 12, color: t.accent, fontWeight: '600' },
    suggestions: {
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
      borderRadius: 10, marginTop: 4, overflow: 'hidden',
      shadowColor: t.text, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
    },
    suggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
    suggestionItemBorder: { borderBottomWidth: 1, borderBottomColor: t.border },
    suggestionLogo: { width: 28, height: 28, borderRadius: 6, backgroundColor: t.bg },
    suggestionDot: { width: 28, height: 28, borderRadius: 14 },
    suggestionText: { flex: 1, fontSize: 15, fontWeight: '600', color: t.text },
    textarea: { minHeight: 80, textAlignVertical: 'top' },
    picker: {
      borderWidth: 1, borderColor: t.border, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 12, backgroundColor: t.surface,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    pickerText: { fontSize: 16, color: t.text },
    pickerChevron: { fontSize: 16, color: t.textMuted },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    colorSwatch: { width: 34, height: 34, borderRadius: 17 },
    colorSelected: { borderWidth: 3, borderColor: t.text },
    colorSwatchCustom: {
      backgroundColor: t.bg, borderWidth: 1.5, borderColor: t.border,
      justifyContent: 'center', alignItems: 'center',
    },
    customColorRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10,
      backgroundColor: t.bg, borderWidth: 1, borderColor: t.border,
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    },
    customColorPreview: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
    customColorHash: { fontSize: 16, fontWeight: '700', color: t.text },
    customColorInput: {
      flex: 1, fontSize: 16, color: t.text, letterSpacing: 1,
      ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    actions: { flexDirection: 'row', gap: 12, marginTop: 32, marginBottom: 40 },
    backBtn: {
      flex: 1, borderWidth: 1.5, borderColor: t.border, borderRadius: 12,
      paddingVertical: 15, alignItems: 'center',
    },
    backBtnText: { fontSize: 16, fontWeight: '600', color: t.text },
    saveBtn: { flex: 2, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
    btnDisabled: { opacity: 0.5 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    modalOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: t.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      maxHeight: 480, padding: 20,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginBottom: 16 },
    modalItem: { paddingVertical: 14, paddingHorizontal: 8, borderRadius: 8 },
    modalItemSelected: { backgroundColor: t.accentBg },
    modalItemText: { fontSize: 16, color: t.textMuted },
    modalItemTextSelected: { color: t.accent, fontWeight: '600' },
    modalCancel: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    modalCancelText: { fontSize: 16, color: t.textMuted },
  })
}

export default function AddCardScreen() {
  const router = useRouter()
  const t = useTheme()
  const styles = useMemo(() => makeStyles(t), [t])
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
  const [shopInputFocused, setShopInputFocused] = useState(false)
  const [customHex, setCustomHex] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
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
    setShopInputFocused(false)
    setCustomHex('')
    setShowCustomInput(false)
    scannedOnce.current = false
    api.shops.list().then(setPredefinedShops).catch((err) => {
      console.error('Failed to load predefined shops', err)
    })
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
    let uri: string
    try {
      const picked = await pickImage()
      if (!picked) return
      uri = picked.uri
    } catch (err) {
      console.error('Failed to pick image', err)
      setDetectError('Could not open photo library. Please check permissions and try again.')
      return
    }

    setUploadedImageUri(uri)
    setDetecting(true)

    try {
      if (Platform.OS !== 'web') {
        const dataUrl = await compressImageNative(uri)
        if (dataUrl) {
          setCardDataUrl(dataUrl)
        } else {
          setDetectError('Could not process the image. Try a smaller photo or scan the barcode instead.')
        }
      } else {
        const [detected, dataUrl] = await Promise.all([
          detectBarcodeFromImage(uri),
          compressToDataUrl(uri),
        ])
        setCardDataUrl(dataUrl)
        if (detected) {
          setCardNumber(detected.value)
          setBarcodeType(detected.type)
        } else {
          setDetectError('No barcode found in image. You can enter the number manually below.')
        }
      }
    } catch (err) {
      console.error('Failed to process uploaded image', err)
      setDetectError('Could not process the image. Try again or enter the card number manually.')
    } finally {
      setDetecting(false)
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
        <View style={styles.methodHeader}>
          <TouchableOpacity style={styles.methodBack} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={t.text} />
          </TouchableOpacity>
        </View>
        <Text style={styles.methodTitle}>Add a membership card</Text>
        <Text style={styles.methodSub}>How would you like to add your card?</Text>

        <Pressable style={styles.methodCard} onPress={() => { scannedOnce.current = false; setStep('scanning') }}>
          <View style={[styles.methodIcon, { backgroundColor: t.accentBg }]}>
            <Ionicons name="scan-outline" size={28} color={t.accent} />
          </View>
          <View style={styles.methodText}>
            <Text style={styles.methodLabel}>Scan barcode</Text>
            <Text style={styles.methodDesc}>Point your camera at the barcode on your card</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={t.textSubtle} />
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
            <Text style={styles.methodLabel}>
              {detecting ? 'Processing image…' : 'Upload card image'}
            </Text>
            <Text style={styles.methodDesc}>
              {detecting
                ? 'Compressing and attaching your card image'
                : Platform.OS === 'web'
                  ? "Pick a photo of your card — we'll detect the barcode automatically"
                  : 'Choose a photo of your card to attach as a reference'}
            </Text>
          </View>
          {detecting ? null : <Ionicons name="chevron-forward" size={20} color={t.textSubtle} />}
        </Pressable>

        <Pressable style={styles.methodCard} onPress={() => setStep('form')}>
          <View style={[styles.methodIcon, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="create-outline" size={28} color="#22c55e" />
          </View>
          <View style={styles.methodText}>
            <Text style={styles.methodLabel}>Enter manually</Text>
            <Text style={styles.methodDesc}>Type in the card number and select barcode type</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={t.textSubtle} />
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

        <Text style={styles.label}>Shop name *</Text>
        <View style={styles.shopInputWrap}>
          <TextInput
            style={[styles.input, selectedShopId ? styles.shopInputSelected : null]}
            value={storeName}
            onChangeText={(v) => { setStoreName(v); setSelectedShopId(null) }}
            onFocus={() => setShopInputFocused(true)}
            onBlur={() => setTimeout(() => setShopInputFocused(false), 100)}
            placeholder="Search or type shop name…"
            placeholderTextColor={t.textSubtle}
          />
          {selectedShopId ? (
            <TouchableOpacity
              style={styles.shopClearBtn}
              onPress={() => setSelectedShopId(null)}
            >
              <Ionicons name="close-circle" size={20} color={t.textSubtle} />
            </TouchableOpacity>
          ) : null}
        </View>

        {selectedShopId ? (
          <View style={styles.shopSelectedBadge}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.selectedLogo} resizeMode="contain" />
            ) : null}
            <Text style={styles.shopSelectedText}>Predefined shop · color & logo applied</Text>
          </View>
        ) : shopInputFocused && predefinedShops.length > 0 ? (() => {
          const suggestions = predefinedShops.filter(s =>
            storeName.length === 0 || s.name.toLowerCase().includes(storeName.toLowerCase())
          )
          if (suggestions.length === 0) return null
          return (
            <View style={styles.suggestions}>
              <ScrollView keyboardShouldPersistTaps="always" nestedScrollEnabled style={{ maxHeight: 220 }}>
                {suggestions.map((shop, index) => (
                  <TouchableOpacity
                    key={shop.id}
                    style={[styles.suggestionItem, index < suggestions.length - 1 && styles.suggestionItemBorder]}
                    onPress={() => {
                      setSelectedShopId(shop.id)
                      setStoreName(shop.name)
                      setColor(shop.color)
                      setLogoUrl(shop.logoUrl ?? null)
                      setShopInputFocused(false)
                    }}
                  >
                    {shop.logoUrl ? (
                      <Image source={{ uri: shop.logoUrl }} style={styles.suggestionLogo} resizeMode="contain" />
                    ) : (
                      <View style={[styles.suggestionDot, { backgroundColor: shop.color }]} />
                    )}
                    <Text style={styles.suggestionText} numberOfLines={1}>{shop.name}</Text>
                    <Ionicons name="chevron-forward" size={14} color={t.textSubtle} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )
        })() : null}

        <Text style={styles.label}>Card / membership number *</Text>
        <TextInput
          style={styles.input}
          value={cardNumber}
          onChangeText={setCardNumber}
          placeholder="Card number or code"
          placeholderTextColor={t.textSubtle}
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
              onPress={() => { setColor(c); setShowCustomInput(false) }}
            />
          ))}
          <Pressable
            style={[
              styles.colorSwatch,
              styles.colorSwatchCustom,
              !CARD_COLORS.includes(color) && { backgroundColor: color },
              !CARD_COLORS.includes(color) && styles.colorSelected,
            ]}
            onPress={() => {
              const next = !showCustomInput
              setShowCustomInput(next)
              if (next) setCustomHex(CARD_COLORS.includes(color) ? '' : color)
            }}
          >
            {CARD_COLORS.includes(color)
              ? <Ionicons name="color-palette-outline" size={16} color={t.textSubtle} />
              : null}
          </Pressable>
        </View>

        {showCustomInput && (
          <View style={styles.customColorRow}>
            <View style={[styles.customColorPreview, { backgroundColor: isValidHex(customHex) ? customHex : t.border }]} />
            <Text style={styles.customColorHash}>#</Text>
            <TextInput
              style={styles.customColorInput}
              value={customHex.replace(/^#/, '')}
              onChangeText={(v) => {
                const hex = '#' + v.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 6)
                setCustomHex(hex)
                if (isValidHex(hex)) setColor(hex)
              }}
              placeholder="e.g. FF5733"
              placeholderTextColor={t.textSubtle}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {isValidHex(customHex) && (
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            )}
          </View>
        )}

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Rewards tier, member since, notes"
          placeholderTextColor={t.textSubtle}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Expiry date (optional)</Text>
        <TextInput
          style={styles.input}
          value={expiresAt}
          onChangeText={setExpiresAt}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={t.textSubtle}
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
              {BARCODE_TYPES.map((tp) => (
                <Pressable
                  key={tp}
                  style={[styles.modalItem, barcodeType === tp && styles.modalItemSelected]}
                  onPress={() => { setBarcodeType(tp); setShowTypePicker(false) }}
                >
                  <Text style={[styles.modalItemText, barcodeType === tp && styles.modalItemTextSelected]}>
                    {BARCODE_LABELS[tp]}
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
