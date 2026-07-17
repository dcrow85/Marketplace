import {
  json, orderKey, paypalConfig, paypalOrderPayload, paypalRequest,
  readJson, resolveSampleOrder,
} from '../_shared.js'

export async function onRequestPost({ request, env }) {
  if (!paypalConfig(env).enabled) return json({ error: 'PayPal Sandbox is not configured.' }, 503)
  const body = await readJson(request)
  if (!body) return json({ error: 'Invalid checkout request.' }, 400)
  const order = await resolveSampleOrder(request, body)
  if (order.error) return json({ error: order.error }, 400)

  const result = await paypalRequest(env, '/v2/checkout/orders', {
    method: 'POST',
    requestId: order.cairnReference,
    body: paypalOrderPayload(order, request),
  }).catch(() => null)
  if (!result?.ok || !result.data?.id) {
    return json({ error: 'PayPal Sandbox could not create this order.', debugId: result?.data?.debug_id || null }, result?.status || 502)
  }

  const record = {
    orderId: result.data.id,
    status: result.data.status || 'CREATED',
    amount: order.total.toFixed(2),
    currency: 'USD',
    sellerId: order.sellerId,
    accountId: order.accountId,
    catalogId: order.catalogId,
    cairnReference: order.cairnReference,
    items: order.items.map(({ uid, ask }) => ({ uid, ask })),
    mode: 'sandbox',
    created: Date.now(),
    updated: Date.now(),
  }
  await env.PILOT.put(orderKey(record.orderId), JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 30 })
  return json({ id: record.orderId, status: record.status, amount: record.amount, currency: record.currency, mode: 'sandbox' }, 201)
}

