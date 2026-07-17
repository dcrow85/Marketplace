export const RAIL_ESCROW = 'escrow'
export const RAIL_PAYPAL = 'paypal'

const PAYPAL_HANDLE = /^[A-Za-z0-9]{1,20}$/

export function cleanPayPalHandle(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const withoutQuery = raw.split(/[?#]/, 1)[0]
  const match = withoutQuery.match(/(?:https?:\/\/)?(?:www\.)?paypal\.me\/([^/]+)/i)
  const candidate = (match?.[1] || withoutQuery.replace(/^@/, '')).trim()
  return PAYPAL_HANDLE.test(candidate) ? candidate : ''
}

export function payPalHandleError(value) {
  if (!String(value || '').trim()) return ''
  return cleanPayPalHandle(value)
    ? ''
    : 'Use the 1–20 letter-or-number username from your PayPal.Me link.'
}

export function payPalMeUrl(handle, amount) {
  const clean = cleanPayPalHandle(handle)
  const value = Number(amount)
  if (!clean || !Number.isFinite(value) || value <= 0) return ''
  return `https://www.paypal.me/${encodeURIComponent(clean)}/${value.toFixed(2)}USD`
}

export function paymentRailFor(value) {
  return value === RAIL_PAYPAL ? RAIL_PAYPAL : RAIL_ESCROW
}

export function railCurrency(rail) {
  return paymentRailFor(rail) === RAIL_PAYPAL ? 'USD' : 'USDC'
}

export function sellerPayPalHandle(seller) {
  return cleanPayPalHandle(seller?.payment?.paypal?.handle || seller?.paypal?.handle || '')
}

export function sellerPayPalMode(seller) {
  const paypal = seller?.payment?.paypal || seller?.paypal || null
  if (!paypal?.enabled) return null
  if (paypal.mode === 'sandbox_api') return 'sandbox_api'
  if (paypal.mode === 'connected' && paypal.merchant_id) return 'connected'
  return sellerPayPalHandle(seller) ? 'paypal_me' : null
}

export function sellerAcceptsPayPal(seller) {
  return !!sellerPayPalMode(seller)
}

export function paymentReference(prefix = 'CAIRN') {
  const stamp = Date.now().toString(36).slice(-6).toUpperCase()
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}-${stamp}-${random}`
}
