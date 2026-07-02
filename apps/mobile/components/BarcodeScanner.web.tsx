import { useMemo, useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { BarcodeType } from '@memberr/shared'
import { useTheme } from '../lib/ThemeContext'
import type { Theme } from '../lib/theme'

interface Props {
  onScanned: (type: BarcodeType, value: string) => void
  onCancel: () => void
}

const ZXING_FORMAT_MAP: Partial<Record<string, BarcodeType>> = {
  AZTEC: 'AZTEC', CODABAR: 'CODABAR', CODE_39: 'CODE39', CODE_128: 'CODE128',
  DATA_MATRIX: 'DATA_MATRIX', EAN_8: 'EAN8', EAN_13: 'EAN13',
  PDF_417: 'PDF417', QR_CODE: 'QR_CODE', UPC_A: 'UPC', UPC_E: 'UPC',
}

type Status = 'starting' | 'scanning' | 'denied' | 'unsupported'

const CORNER = 24
const BORDER = 3

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000', position: 'relative' } as any,
    overlay: {
      position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0,
      justifyContent: 'space-between', paddingBottom: 60,
    },
    topBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    closeBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    topBarTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
    scanArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scanFrame: { width: 260, height: 160, position: 'relative' },
    corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: t.accent },
    cornerTL: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER },
    cornerTR: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER },
    cornerBL: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER },
    cornerBR: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER },
    hint: { color: 'rgba(255,255,255,0.8)', textAlign: 'center', fontSize: 14, paddingHorizontal: 40 },
    msgBox: {
      flex: 1, justifyContent: 'center', alignItems: 'center',
      padding: 32, gap: 12, backgroundColor: t.bg,
    },
    msgTitle: { fontSize: 20, fontWeight: '700', color: t.text, textAlign: 'center' },
    msgSub: { fontSize: 15, color: t.textMuted, textAlign: 'center', lineHeight: 22 },
    btn: {
      backgroundColor: t.accent, borderRadius: 12,
      paddingVertical: 14, paddingHorizontal: 32, marginTop: 8,
    },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  })
}

export function BarcodeScanner({ onScanned, onCancel }: Props) {
  const t = useTheme()
  const styles = useMemo(() => makeStyles(t), [t])
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<any>(null)
  const doneRef = useRef(false)
  const [status, setStatus] = useState<Status>('starting')

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const { BrowserMultiFormatReader, BarcodeFormat } = await import('@zxing/browser')
        if (cancelled) return

        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        })
        if (cancelled) { stream.getTracks().forEach(tr => tr.stop()); return }

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        setStatus('scanning')

        reader.decodeFromStream(stream, videoRef.current!, (result, _err) => {
          if (!result || doneRef.current) return
          doneRef.current = true
          const fmt = BarcodeFormat[result.getBarcodeFormat()]
          const type = ZXING_FORMAT_MAP[fmt] ?? 'CODE128'
          onScanned(type, result.getText())
        })
      } catch (e: any) {
        if (cancelled) return
        if (e?.name === 'NotAllowedError') setStatus('denied')
        else setStatus('unsupported')
      }
    }

    start()

    return () => {
      cancelled = true
      try { readerRef.current?.reset() } catch {}
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(tr => tr.stop())
      }
    }
  }, [])

  if (status === 'denied') {
    return (
      <View style={styles.msgBox}>
        <Ionicons name="camera-outline" size={48} color={t.accent} />
        <Text style={styles.msgTitle}>Camera access denied</Text>
        <Text style={styles.msgSub}>Allow camera access in your browser settings, then try again.</Text>
        <Pressable style={styles.btn} onPress={onCancel}>
          <Text style={styles.btnText}>Go back</Text>
        </Pressable>
      </View>
    )
  }

  if (status === 'unsupported') {
    return (
      <View style={styles.msgBox}>
        <Ionicons name="alert-circle-outline" size={48} color="#f97316" />
        <Text style={styles.msgTitle}>Camera scanning unavailable</Text>
        <Text style={styles.msgSub}>Your browser doesn't support camera scanning. Use the image upload option instead.</Text>
        <Pressable style={styles.btn} onPress={onCancel}>
          <Text style={styles.btnText}>Go back</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* @ts-ignore — video is valid in this web-only file */}
      <video
        ref={videoRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        muted
        playsInline
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
          {status === 'starting' ? (
            <Text style={styles.hint}>Starting camera…</Text>
          ) : (
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          )}
        </View>

        <Text style={styles.hint}>Point at the barcode on your card</Text>
      </View>
    </View>
  )
}
