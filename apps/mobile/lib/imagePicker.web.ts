export async function pickImage(): Promise<{ uri: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) { resolve(null); return }
      resolve({ uri: URL.createObjectURL(file) })
    }
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}
