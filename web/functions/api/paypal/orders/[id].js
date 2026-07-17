import { json, orderKey, publicOrder, validOrderId } from '../_shared.js'

export async function onRequestGet({ params, env }) {
  const id = String(params.id || '')
  if (!validOrderId(id)) return json({ error: 'Invalid PayPal order.' }, 400)
  const record = await env.PILOT.get(orderKey(id), 'json')
  return record ? json(publicOrder(record)) : json({ error: 'PayPal order not found.' }, 404)
}

