import { json, paypalConfig } from './_shared.js'

export function onRequestGet({ env }) {
  const config = paypalConfig(env)
  return json({
    enabled: config.enabled,
    mode: config.mode,
    clientId: config.enabled ? config.clientId : null,
    webhookReady: config.webhookReady,
    partnerReady: config.partnerReady,
    boundary: config.enabled
      ? 'PayPal Sandbox only. No real money can move.'
      : 'PayPal Sandbox credentials are not configured.',
  }, config.enabled ? 200 : 503)
}

