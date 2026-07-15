function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

function renderJpeg(img, max, quality) {
  const scale = Math.min(1, max / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

// One bounded inspection copy for local evidence, plus a smaller copy for the
// vision read. The full image remains detailed enough for a buyer to inspect.
export async function preparePhoto(file) {
  const img = await loadImage(file)
  try {
    return {
      read: renderJpeg(img, 1000, 0.85),
      full: renderJpeg(img, 2400, 0.9),
    }
  } finally {
    URL.revokeObjectURL(img.src)
  }
}
