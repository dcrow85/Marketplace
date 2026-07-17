import {
  captureSummary, json, orderKey, paypalConfig, paypalRequest, publicOrder, validOrderId,
} from '../../_shared.js'

export async function onRequestPost({ params, env }) {
  if (!paypalConfig(env).enabled) return json({ error: 'PayPal Sandbox is not configured.' }, 503)
  const id = String(params.id || '')
  if (!validOrderId(id)) return json({ error: 'Invalid PayPal order.' }, 400)
  const record = await env.PILOT.get(orderKey(id), 'json')
  if (!record) return json({ error: 'This order was not created by Cairn.' }, 404)
  if (record.captureStatus === 'COMPLETED') return json(publicOrder(record))

  const result = await paypalRequest(env, `/v2/checkout/orders/${id}/capture`, {
    method: 'POST', requestId: `${id}-capture`, body: {},
  }).catch(() => null)
  if (!result?.ok) {
    return json({ error: 'PayPal did not complete the sandbox capture.', issue: result?.data?.details?.[0]?.issue || null }, result?.status || 502)
  }
  const summary = captureSummary(result.data, record)
  if (summary.status !== 'COMPLETED' || summary.captureStatus !== 'COMPLETED'
      || summary.currency !== record.currency || summary.amount !== record.amount) {
    return json({ error: 'PayPal returned an incomplete or mismatched sandbox capture.', status: summary.status }, 409)
  }
  const next = { ...record, ...summary, updated: Date.now(), verifiedBy: 'paypal_capture_api' }
  await env.PILOT.put(orderKey(id), JSON.stringify(next), { expirationTtl: 60 * 60 * 24 * 90 })
  return json(publicOrder(next))
}

