const MAX_INPUT_BYTES = 15 * 1024 * 1024

// Recorta o centro em quadrado e reduz, para a foto subir leve (alguns KB) e sem metadados da câmera.
export async function squareWebp(file: File, size = 256): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem (JPG, PNG ou WebP).')
  if (file.size > MAX_INPUT_BYTES) throw new Error('A imagem é muito grande. Use uma de até 15 MB.')
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Não deu para ler essa imagem. Tente outro arquivo.')
  }
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85))
  if (!blob) throw new Error('Não deu para processar essa imagem.')
  return blob
}

export const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Não deu para ler a imagem.'))
    reader.readAsDataURL(blob)
  })
