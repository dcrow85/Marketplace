const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
}

const ORDER_ID = /^[A-Z0-9]{8,32}$/
const ADDRESS_ID = /^0x[0-9a-fA-F]{40}$/
const PRIVY_ID = /^did:privy:[A-Za-z0-9._-]{8,160}$/
const CAIRN_REF = /^CAIRN-[A-Z0-9-]{6,48}$/

const validBuyerId = (value) => ADDRESS_ID.test(value) || PRIVY_ID.test(value)

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })

export const readJson = async (request, cap = 32 * 1024) => {
  const text = await request.text()
  if (text.length > cap) return null
  try { return JSON.parse(text) } catch { return null }
}

export const paypalConfig = (env) => {
  const mode = env.PAYPAL_ENV === 'sandbox' ? 'sandbox' : 'unconfigured'
  const clientId = String(env.PAYPAL_CLIENT_ID || '').trim()
  const clientSecret = String(env.PAYPAL_CLIENT_SECRET || '').trim()
  return {
    mode,
    enabled: mode === 'sandbox' && !!clientId && !!clientSecret,
    clientId: mode === 'sandbox' ? clientId : '',
    webhookReady: mode === 'sandbox' && !!String(env.PAYPAL_WEBHOOK_ID || '').trim(),
    partnerReady: mode === 'sandbox' && !!String(env.PAYPAL_PARTNER_MERCHANT_ID || '').trim(),
  }
}

const paypalBase = () => 'https://api-m.sandbox.paypal.com'

export async function accessToken(env) {
  const config = paypalConfig(env)
  if (!config.enabled) throw new Error('PayPal Sandbox is not configured.')
  const basic = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)
  const response = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok || !body.access_token) throw new Error('PayPal Sandbox authentication failed.')
  return body.access_token
}

export async function paypalRequest(env, path, { method = 'GET', body, requestId } = {}) {
  const token = await accessToken(env)
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
  if (requestId) headers['PayPal-Request-Id'] = requestId
  const response = await fetch(`${paypalBase()}${path}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, data }
}

const cleanText = (value, limit) => String(value || '').replace(/[<>]/g, '').trim().slice(0, limit)
const money = (value) => Number(value).toFixed(2)

export async function resolveSampleOrder(request, body) {
  const sellerId = cleanText(body?.sellerId, 42).toLowerCase()
  const catalogId = cleanText(body?.catalogId, 80)
  const cairnReference = cleanText(body?.cairnReference, 64).toUpperCase()
  const accountId = cleanText(body?.accountId, 180)
  const uids = [...new Set((Array.isArray(body?.items) ? body.items : []).map((item) => cleanText(item?.uid || item, 180)).filter(Boolean))]
  if (!ADDRESS_ID.test(sellerId)) return { error: 'This sample table is not payable in PayPal Sandbox.' }
  if (!validBuyerId(accountId)) return { error: 'Sign in again before starting PayPal Sandbox.' }
  if (!CAIRN_REF.test(cairnReference)) return { error: 'The Cairn checkout reference is incomplete.' }
  if (!catalogId || !uids.length || uids.length > 20) return { error: 'Choose between 1 and 20 listed cards.' }

  const marketUrl = new URL('/app/market-sample.json', request.url)
  const response = await fetch(marketUrl.toString(), { headers: { Accept: 'application/json' } })
  if (!response.ok) return { error: 'The sample market could not be checked.' }
  const market = await response.json().catch(() => null)
  if (!market || market.catalog_id !== catalogId) return { error: 'That catalog is not available for sandbox checkout.' }
  const seller = (market.sellers || []).find((candidate) => String(candidate.id || '').toLowerCase() === sellerId)
  if (!seller) return { error: 'PayPal Sandbox is available only on Cairn sample tables for now.' }

  const listings = new Map((seller.listings || []).map((listing) => [listing.uid, listing]))
  const suppliedNames = new Map((Array.isArray(body?.items) ? body.items : []).map((item) => [item?.uid, cleanText(item?.name, 120)]))
  const items = []
  for (const uid of uids) {
    const listing = listings.get(uid)
    const ask = Number(listing?.ask)
    if (!listing || !Number.isFinite(ask) || ask <= 0) return { error: 'One of these cards is no longer listed at a payable ask.' }
    items.push({ uid, ask, name: suppliedNames.get(uid) || 'Cairn card' })
  }
  const total = items.reduce((sum, item) => sum + item.ask, 0)
  if (!(total > 0) || total > 500) return { error: 'This sandbox checkout is outside the 500 USD rehearsal cap.' }
  return { sellerId, accountId, catalogId, cairnReference, items, total }
}

export function paypalOrderPayload(order, request) {
  const origin = new URL(request.url).origin
  return {
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: order.cairnReference,
      custom_id: order.cairnReference,
      invoice_id: order.cairnReference,
      description: `Cairn sample checkout · ${order.items.length} card${order.items.length === 1 ? '' : 's'}`,
      items: order.items.map((item) => ({
        name: item.name,
        sku: item.uid.slice(0, 127),
        quantity: '1',
        category: 'PHYSICAL_GOODS',
        unit_amount: { currency_code: 'USD', value: money(item.ask) },
      })),
      amount: {
        currency_code: 'USD',
        value: money(order.total),
        breakdown: { item_total: { currency_code: 'USD', value: money(order.total) } },
      },
    }],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: 'Cairn Cards Sandbox',
          user_action: 'PAY_NOW',
          shipping_preference: 'GET_FROM_FILE',
          return_url: `${origin}/app/?paypal=approved`,
          cancel_url: `${origin}/app/?paypal=cancelled`,
        },
      },
    },
  }
}

export const orderKey = (id) => `paypal:order:${id}`
export const validOrderId = (id) => ORDER_ID.test(String(id || ''))

export function captureSummary(orderData, fallback = {}) {
  const unit = orderData?.purchase_units?.[0] || {}
  const capture = unit?.payments?.captures?.[0] || {}
  const amount = capture.amount || unit.amount || {}
  return {
    orderId: cleanText(orderData?.id || fallback.orderId, 40),
    status: cleanText(orderData?.status || fallback.status, 32),
    captureId: cleanText(capture.id || fallback.captureId, 40) || null,
    captureStatus: cleanText(capture.status || fallback.captureStatus, 32) || null,
    amount: cleanText(amount.value || fallback.amount, 24),
    currency: cleanText(amount.currency_code || fallback.currency || 'USD', 8),
    sellerProtection: cleanText(capture.seller_protection?.status || fallback.sellerProtection, 32) || null,
  }
}

export const publicOrder = (record) => ({
  orderId: record.orderId,
  status: record.status,
  captureId: record.captureId || null,
  captureStatus: record.captureStatus || null,
  amount: record.amount,
  currency: record.currency || 'USD',
  sellerProtection: record.sellerProtection || null,
  mode: 'sandbox',
  updated: record.updated || record.created || null,
})
