const MAX_DATA_URL_LENGTH = 180_000
const MAX_SOURCE_BYTES = 15 * 1024 * 1024

export function cleanProfilePhoto(value) {
  const photo = typeof value === 'string' ? value : ''
  if (photo.length > MAX_DATA_URL_LENGTH) return ''
  return /^data:image\/(?:jpeg|png|webp);base64,/i.test(photo) ? photo : ''
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That image could not be read.')) }
    image.src = url
  })
}

function squareDataUrl(image, size, quality) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser could not prepare the picture.')
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight)
  const sx = (image.naturalWidth - sourceSize) / 2
  const sy = (image.naturalHeight - sourceSize) / 2
  context.drawImage(image, sx, sy, sourceSize, sourceSize, 0, 0, size, size)
  return canvas.toDataURL('image/jpeg', quality)
}

export async function prepareProfilePhoto(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Choose an image file.')
  if (file.size > MAX_SOURCE_BYTES) throw new Error('Choose an image under 15 MB.')
  const image = await readImage(file)
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('That image has no visible pixels.')
  let photo = squareDataUrl(image, 256, 0.82)
  if (photo.length > MAX_DATA_URL_LENGTH) photo = squareDataUrl(image, 192, 0.7)
  if (photo.length > MAX_DATA_URL_LENGTH) throw new Error('That image is still too large after resizing.')
  return photo
}
