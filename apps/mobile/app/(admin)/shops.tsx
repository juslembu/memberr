import { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
  ScrollView,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, ApiError } from '../../lib/api'
import { pickImage } from '../../lib/imagePicker'
import { t } from '../../lib/theme'
import type { PredefinedShop } from '@memberr/shared'

const COLORS = [
  '#0EA5E9', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#64748b', '#0F172A', '#DC2626',
]

const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}

type ShopForm = { name: string; color: string; logoUrl: string | null }

async function compressLogoDataUrl(uri: string): Promise<string | null> {
  if (Platform.OS !== 'web') return null
  try {
    const img = new (window as any).Image()
    img.src = uri
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject })
    const maxW = 200
    const scale = img.width > maxW ? maxW / img.width : 1
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

export default function AdminShopsScreen() {
  const [shops, setShops] = useState<PredefinedShop[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [modalVisible, setModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ShopForm>({ name: '', color: COLORS[0], logoUrl: null })
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    try {
      const data = await api.admin.listShops()
      setShops(data)
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load shops')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  function openAdd() {
    setEditingId(null)
    setForm({ name: '', color: COLORS[0], logoUrl: null })
    setFormError('')
    setModalVisible(true)
  }

  function openEdit(shop: PredefinedShop) {
    setEditingId(shop.id)
    setForm({ name: shop.name, color: shop.color, logoUrl: shop.logoUrl ?? null })
    setFormError('')
    setModalVisible(true)
  }

  async function handlePickLogo() {
    setUploadingLogo(true)
    try {
      const picked = await pickImage()
      if (!picked) return
      const dataUrl = await compressLogoDataUrl(picked.uri)
      setForm((f) => ({ ...f, logoUrl: dataUrl ?? picked.uri }))
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('Name is required'); return }
    setSaving(true)
    setFormError('')
    try {
      const payload = { name: form.name.trim(), color: form.color, logoUrl: form.logoUrl }
      if (editingId) {
        await api.admin.updateShop(editingId, payload)
      } else {
        await api.admin.createShop(payload)
      }
      setModalVisible(false)
      await load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save shop')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await api.admin.deleteShop(deleteId)
      setDeleteId(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete shop')
      setDeleteId(null)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={t.accent} /></View>
  }

  const deleteShop = shops.find((s) => s.id === deleteId)

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={shops}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true) }}
            tintColor={t.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="storefront-outline" size={36} color={t.textSubtle} />
            <Text style={styles.emptyTitle}>No shops yet</Text>
            <Text style={styles.emptySub}>Add shops so users can quickly fill in store details</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.logoUrl ? (
              <Image source={{ uri: item.logoUrl }} style={styles.logoThumb} resizeMode="contain" />
            ) : (
              <View style={[styles.colorDot, { backgroundColor: item.color }]} />
            )}
            <Text style={styles.shopName}>{item.name}</Text>
            <TouchableOpacity style={[styles.iconBtn, webCursor]} onPress={() => openEdit(item)}>
              <Ionicons name="pencil-outline" size={16} color={t.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, styles.deleteIconBtn, webCursor]} onPress={() => setDeleteId(item.id)}>
              <Ionicons name="trash-outline" size={16} color="#DC2626" />
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={[styles.fab, webCursor]} onPress={openAdd}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Add / Edit modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.dialog}>
              <Text style={styles.dialogTitle}>{editingId ? 'Edit shop' : 'Add shop'}</Text>

              {formError ? (
                <View style={styles.formErrorBox}>
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Emart"
                placeholderTextColor={t.textSubtle}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                autoCapitalize="words"
                returnKeyType="done"
              />

              <Text style={styles.fieldLabel}>Logo (optional)</Text>
              <View style={styles.logoRow}>
                {form.logoUrl ? (
                  <View style={styles.logoPreviewWrap}>
                    <Image source={{ uri: form.logoUrl }} style={styles.logoPreview} resizeMode="contain" />
                  </View>
                ) : (
                  <View style={[styles.logoPreviewWrap, styles.logoPlaceholder]}>
                    <Ionicons name="image-outline" size={28} color={t.textSubtle} />
                  </View>
                )}
                <View style={styles.logoActions}>
                  <TouchableOpacity
                    style={[styles.logoBtn, webCursor, uploadingLogo && styles.btnDisabled]}
                    onPress={handlePickLogo}
                    disabled={uploadingLogo}
                  >
                    <Ionicons name="cloud-upload-outline" size={15} color={t.accent} />
                    <Text style={styles.logoBtnText}>{uploadingLogo ? 'Uploading…' : form.logoUrl ? 'Change' : 'Upload'}</Text>
                  </TouchableOpacity>
                  {form.logoUrl && (
                    <TouchableOpacity
                      style={[styles.logoBtn, styles.logoBtnRemove, webCursor]}
                      onPress={() => setForm((f) => ({ ...f, logoUrl: null }))}
                    >
                      <Ionicons name="trash-outline" size={15} color="#DC2626" />
                      <Text style={styles.logoBtnRemoveText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <Text style={styles.fieldLabel}>Colour</Text>
              <View style={styles.colorRow}>
                {COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorSwatch, { backgroundColor: c }, form.color === c && styles.colorSelected]}
                    onPress={() => setForm((f) => ({ ...f, color: c }))}
                  />
                ))}
              </View>

              <View style={styles.dialogActions}>
                <TouchableOpacity style={[styles.cancelBtn, webCursor]} onPress={() => setModalVisible(false)} disabled={saving}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.confirmBtn, saving && styles.btnDisabled, webCursor]} onPress={handleSave} disabled={saving}>
                  <Text style={styles.confirmText}>{saving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Delete confirm modal */}
      <Modal visible={!!deleteId} transparent animationType="fade" onRequestClose={() => setDeleteId(null)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Remove shop?</Text>
            <Text style={styles.dialogBody}>
              Remove <Text style={{ fontWeight: '700' }}>{deleteShop?.name}</Text> from the predefined list?
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity style={[styles.cancelBtn, webCursor]} onPress={() => setDeleteId(null)} disabled={deleting}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, deleting && styles.btnDisabled, webCursor]} onPress={handleDelete} disabled={deleting}>
                <Text style={styles.confirmText}>{deleting ? 'Removing…' : 'Remove'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 100 },
  errorBanner: { backgroundColor: t.errorBg, padding: 12, margin: 16, marginBottom: 0, borderRadius: 10 },
  errorText: { color: t.errorText, fontSize: 14, textAlign: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: t.text,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  logoThumb: { width: 36, height: 36, borderRadius: 8, marginRight: 12, backgroundColor: t.bg },
  colorDot: { width: 36, height: 36, borderRadius: 8, marginRight: 12 },
  shopName: { flex: 1, fontSize: 16, fontWeight: '600', color: t.text },
  iconBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  deleteIconBtn: { backgroundColor: '#FEF2F2' },

  empty: { alignItems: 'center', paddingTop: 72, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: t.text, letterSpacing: -0.3 },
  emptySub: { fontSize: 14, color: t.textMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 32 },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: t.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: t.accent,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  overlayScroll: { flexGrow: 1, justifyContent: 'center' },
  dialog: {
    backgroundColor: t.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  dialogTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginBottom: 12, letterSpacing: -0.3 },
  dialogBody: { fontSize: 14, color: t.textMuted, lineHeight: 20, marginBottom: 20 },
  formErrorBox: { backgroundColor: t.errorBg, borderRadius: 8, padding: 10, marginBottom: 12 },
  formErrorText: { color: t.errorText, fontSize: 13, textAlign: 'center' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: t.textMuted, marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: t.text,
    backgroundColor: t.bg,
    marginBottom: 12,
  },

  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  logoPreviewWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: t.bg,
    borderWidth: 1,
    borderColor: t.border,
  },
  logoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  logoPreview: { width: '100%', height: '100%' },
  logoActions: { flex: 1, gap: 8 },
  logoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: t.accent,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  logoBtnText: { fontSize: 13, fontWeight: '600', color: t.accent },
  logoBtnRemove: { borderColor: '#FEE2E2' },
  logoBtnRemoveText: { fontSize: 13, fontWeight: '600', color: '#DC2626' },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18 },
  colorSelected: { borderWidth: 3, borderColor: t.text },
  dialogActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: t.border, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: t.text },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: t.accent, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  confirmText: { fontSize: 15, fontWeight: '600', color: '#fff' },
})
