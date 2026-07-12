// The pilot store: profiles and inboxes on Cloudflare KV, served by the site itself.
// Deliberately thin for the friends-cohort pilot: address-shaped keys, size caps, and
// CORS for local dev — NO signatures yet (that's P3; until then anyone could write any
// profile, which the cohort accepts and the SYNC log records honestly).
const ADDR = /^0x[0-9a-fA-F]{40}$/
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
    const idx = await env.PILOT.get('profiles-index', 'json')
    return json(idx || [])
  }
  if (parts[0] === 'profile' && ADDR.test(parts[1] || '')) {
    const p = await env.PILOT.get(`p:${parts[1].toLowerCase()}`, 'json')
    return p ? json(p) : json({ error: 'not published' }, 404)
  }
  if (parts[0] === 'inbox' && ADDR.test(parts[1] || '')) {
    const box = await env.PILOT.get(`i:${parts[1].toLowerCase()}`, 'json')
    return json(box || [])
  }
  return json({ error: 'unknown path' }, 404)
}

export async function onRequestPut({ params, env, request }) {
  const parts = params.key || []
  if (parts[0] !== 'profile' || !ADDR.test(parts[1] || '')) return json({ error: 'bad path' }, 400)
  const addr = parts[1].toLowerCase()
  const body = await readBody(request, 64 * 1024)
  if (!body) return json({ error: 'bad body (64KB json cap)' }, 400)

  const idx = (await env.PILOT.get('profiles-index', 'json')) || []
  if (body.removed) {
    await env.PILOT.delete(`p:${addr}`)
    await env.PILOT.put('profiles-index', JSON.stringify(idx.filter((e) => e.addr !== addr)))
    return json({ ok: true, removed: true })
  }
  await env.PILOT.put(`p:${addr}`, JSON.stringify({ ...body, addr, updated: Date.now() }))
  const entry = {
    addr, sign: String(body.sign || '').slice(0, 140),
    listed: (body.table || []).length, wants: (body.wants || []).length,
    showcase: (body.showcase || []).slice(0, 5), updated: Date.now(),
  }
  const next = [entry, ...idx.filter((e) => e.addr !== addr)].slice(0, 200)
  await env.PILOT.put('profiles-index', JSON.stringify(next))
  return json({ ok: true })
}

export async function onRequestPost({ params, env, request }) {
  const parts = params.key || []
  if (parts[0] !== 'inbox' || !ADDR.test(parts[1] || '')) return json({ error: 'bad path' }, 400)
  const addr = parts[1].toLowerCase()
  const msg = await readBody(request, 16 * 1024)
  if (!msg || !msg.id) return json({ error: 'bad message (16KB json cap, id required)' }, 400)
  const box = (await env.PILOT.get(`i:${addr}`, 'json')) || []
  if (box.some((m) => m.id === msg.id && m.type === msg.type && m.state === msg.state)) return json({ ok: true, dup: true })
  const next = [...box, { ...msg, at: Date.now() }].slice(-200)
  await env.PILOT.put(`i:${addr}`, JSON.stringify(next))
  return json({ ok: true })
}
