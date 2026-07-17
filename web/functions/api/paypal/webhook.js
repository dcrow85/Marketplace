import { json, orderKey, paypalConfig, paypalRequest, readJson } from './_shared.js'

const relatedOrderId = (event) => event?.resource?.supplementary_data?.related_ids?.order_id
  || (String(event?.event_type || '').startsWith('CHECKOUT.ORDER.') ? event?.resource?.id : null)

export async function onRequestPost({ request, env }) {
  const config = paypalConfig(env)
  if (!config.enabled || !config.webhookReady) return json({ error: 'PayPal webhook verification is not configured.' }, 503)
  const event = await readJson(request, 128 * 1024)
  if (!event?.id || !event?.event_type) return json({ error: 'Invalid webhook event.' }, 400)

  const verification = await paypalRequest(env, '/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: {
      auth_algo: request.headers.get('paypal-auth-algo'),
      cert_url: request.headers.get('paypal-cert-url'),
      transmission_id: request.headers.get('paypal-transmission-id'),
      transmission_sig: request.headers.get('paypal-transmission-sig'),
      transmission_time: request.headers.get('paypal-transmission-time'),
      webhook_id: env.PAYPAL_WEBHOOK_ID,
      webhook_event: event,
    },
  }).catch(() => null)
  if (!verification?.ok || verification.data?.verification_status !== 'SUCCESS') {
    return json({ error: 'Webhook signature was not verified.' }, 401)
  }

  const eventKey = `paypal:event:${event.id}`
  if (await env.PILOT.get(eventKey)) return json({ ok: true, duplicate: true })
  const orderId = relatedOrderId(event)
  if (orderId) {
    const record = await env.PILOT.get(orderKey(orderId), 'json')
    if (record) {
      const next = {
        ...record,
        providerEvent: String(event.event_type).slice(0, 80),
        providerEventAt: event.create_time || null,
        updated: Date.now(),
      }
      if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        next.captureId = event.resource?.id || next.captureId || null
        next.captureStatus = 'COMPLETED'
        next.status = 'COMPLETED'
        next.verifiedBy = 'paypal_verified_webhook'
        next.sellerProtection = event.resource?.seller_protection?.status || next.sellerProtection || null
      } else if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED') next.captureStatus = 'REFUNDED'
      else if (event.event_type === 'PAYMENT.CAPTURE.REVERSED') next.captureStatus = 'REVERSED'
      else if (event.event_type === 'PAYMENT.CAPTURE.PENDING') next.captureStatus = 'PENDING'
      await env.PILOT.put(orderKey(orderId), JSON.stringify(next), { expirationTtl: 60 * 60 * 24 * 90 })
    }
  }
  await env.PILOT.put(eventKey, JSON.stringify({ type: event.event_type, orderId: orderId || null, at: Date.now() }), { expirationTtl: 60 * 60 * 24 * 90 })
  return json({ ok: true })
}

