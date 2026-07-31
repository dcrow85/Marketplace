// The pilot store: profiles and inboxes on Cloudflare KV, served by the site itself.
// Deliberately thin for the friends-cohort pilot: address-shaped keys, size caps, and
// CORS for local dev — NO signatures yet (that's P3; until then anyone could write any
// profile, which the cohort accepts and the SYNC log records honestly).
const ADDR = /^0x[0-9a-fA-F]{40}$/
const PAYPAL_HANDLE = /^[A-Za-z0-9]{1,20}$/
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } })

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors })
}

async function readBody(request, cap) {
  const text = await request.text()
  if (text.length > cap) return null
  try { return JSON.parse(text) } catch { return null }
}

export async function onRequestGet({ params, env }) {
  const parts = params.key || []
  if (parts[0] === 'profiles') {
    // A single read-modify-write index loses collectors when two people publish at
    // once: KV has no compare-and-swap primitive. The profile keys themselves are
    // the source of truth, so build this small pilot directory from those keys.
    const listed = await env.PILOT.list({ prefix: 'p:', limit: 200 })
    const profiles = await Promise.all((listed.keys || []).map((key) => env.PILOT.get(key.name, 'json')))
    const directory = profiles.filter(Boolean).map((profile) => ({
      addr: String(profile.addr || '').toLowerCase(),
      sign: String(profile.sign || '').slice(0, 140),
      listed: Array.isArray(profile.table) ? profile.table.length : 0,
      wants: Array.isArray(profile.wants) ? profile.wants.length : 0,
      showcase: Array.isArray(profile.showcase) ? profile.showcase.slice(0, 5) : [],
      updated: Number(profile.updated) || 0,
    })).filter((entry) => ADDR.test(entry.addr)).sort((a, b) => b.updated - a.updated)
    return json(directory)
  }
  if (parts[0] === 'profile' && ADDR.test(parts[1] || '')) {
    const p = await env.PILOT.get(`p:${parts[1].toLowerCase()}`, 'json')
    return p ? json(p) : json({ error: 'not published' }, 404)
  }
  if (parts[0] === 'inbox' && ADDR.test(parts[1] || '')) {
    const addr = parts[1].toLowerCase()
    const listed = await env.PILOT.list({ prefix: `i:${addr}:`, limit: 200 })
    const messages = await Promise.all((listed.keys || []).map((key) => env.PILOT.get(key.name, 'json')))
    // Read the old aggregate key during migration so pre-remediation messages stay
    // visible. New writes are one key per message and cannot overwrite a neighbor.
    const legacy = await env.PILOT.get(`i:${addr}`, 'json')
    const combined = [...(Array.isArray(legacy) ? legacy : []), ...messages.filter(Boolean)]
    const unique = new Map(combined.filter((message) => message?.id).map((message) => [
      `${message.type || ''}:${message.id}:${message.state || ''}`, message,
    ]))
    return json([...unique.values()].sort((a, b) => (Number(a.at) || 0) - (Number(b.at) || 0)).slice(-200))
  }
  return json({ error: 'unknown path' }, 404)
}

export async function onRequestPut({ params, env, request }) {
  const parts = params.key || []
  if (parts[0] !== 'profile' || !ADDR.test(parts[1] || '')) return json({ error: 'bad path' }, 400)
  const addr = parts[1].toLowerCase()
  const body = await readBody(request, 64 * 1024)
  if (!body) return json({ error: 'bad body (64KB json cap)' }, 400)

  if (body.removed) {
    await env.PILOT.delete(`p:${addr}`)
    return json({ ok: true, removed: true })
  }
  const paypalHandle = String(body.payment?.paypal?.handle || '')
  const payment = {
    escrow: { enabled: true, currency: 'USDC' },
    paypal: PAYPAL_HANDLE.test(paypalHandle)
      ? { enabled: true, handle: paypalHandle, currency: 'USD', mode: 'paypal_me' }
      : null,
  }
  await env.PILOT.put(`p:${addr}`, JSON.stringify({ ...body, payment, addr, updated: Date.now() }))
  return json({ ok: true })
}

export async function onRequestPost({ params, env, request }) {
  const parts = params.key || []
  if (parts[0] !== 'inbox' || !ADDR.test(parts[1] || '')) return json({ error: 'bad path' }, 400)
  const addr = parts[1].toLowerCase()
  const msg = await readBody(request, 16 * 1024)
  if (!msg || !msg.id) return json({ error: 'bad message (16KB json cap, id required)' }, 400)
  const safe = (value, fallback) => String(value || fallback).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 72) || fallback
  const messageKey = `i:${addr}:${safe(msg.id, 'message')}:${safe(msg.type, 'event')}:${safe(msg.state, 'none')}`
  const previous = await env.PILOT.get(messageKey)
  if (previous) return json({ ok: true, dup: true })
  await env.PILOT.put(messageKey, JSON.stringify({ ...msg, at: Date.now() }))
  return json({ ok: true })
}
