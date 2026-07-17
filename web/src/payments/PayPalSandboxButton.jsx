import { useEffect, useRef, useState } from 'react'

let sdkPromise = null

async function paypalConfig() {
  const response = await fetch('/api/paypal/config', { headers: { Accept: 'application/json' }, cache: 'no-store' })
  const body = await response.json().catch(() => ({}))
  if (!response.ok || !body.enabled || !body.clientId) throw new Error(body.error || body.boundary || 'PayPal Sandbox is not configured yet.')
  return body
}

function loadSdk(clientId) {
  if (window.paypal?.Buttons) return Promise.resolve(window.paypal)
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-cairn-paypal-sdk]')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.paypal), { once: true })
      existing.addEventListener('error', () => reject(new Error('PayPal Sandbox could not load.')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.dataset.cairnPaypalSdk = 'sandbox'
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&commit=true&components=buttons`
    script.async = true
    script.onload = () => resolve(window.paypal)
    script.onerror = () => reject(new Error('PayPal Sandbox could not load.'))
    document.head.appendChild(script)
  })
  return sdkPromise
}

const errorLine = (error) => String(error?.message || error || 'PayPal Sandbox could not continue.').slice(0, 180)

export default function PayPalSandboxButton({ accountId, seller, catalog, cards, cairnReference, onComplete }) {
  const mount = useRef(null)
  const complete = useRef(onComplete)
  const [state, setState] = useState({ phase: 'loading', line: 'Loading PayPal Sandbox…' })
  useEffect(() => { complete.current = onComplete }, [onComplete])

  useEffect(() => {
    let cancelled = false
    let buttons = null
    const start = async () => {
      try {
        const config = await paypalConfig()
        const paypal = await loadSdk(config.clientId)
        if (cancelled || !mount.current) return
        mount.current.replaceChildren()
        buttons = paypal.Buttons({
          fundingSource: paypal.FUNDING.PAYPAL,
          style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal', height: 44, tagline: false },
          createOrder: async () => {
            setState({ phase: 'creating', line: 'Creating the sandbox order…' })
            const response = await fetch('/api/paypal/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                accountId, sellerId: seller.id, catalogId: catalog.id, cairnReference,
                items: cards.map((card) => ({ uid: card.uid, name: card.name })),
              }),
            })
            const order = await response.json().catch(() => ({}))
            if (!response.ok || !order.id) throw new Error(order.error || 'The sandbox order could not be created.')
            setState({ phase: 'approval', line: 'PayPal Sandbox opened the approval window.' })
            return order.id
          },
          onApprove: async ({ orderID }) => {
            setState({ phase: 'capturing', line: 'Confirming the sandbox capture with PayPal…' })
            const response = await fetch(`/api/paypal/orders/${encodeURIComponent(orderID)}/capture`, { method: 'POST' })
            const capture = await response.json().catch(() => ({}))
            if (!response.ok || capture.captureStatus !== 'COMPLETED') throw new Error(capture.error || 'PayPal did not confirm the sandbox capture.')
            if (cancelled) return
            setState({ phase: 'complete', line: `PayPal Sandbox confirmed ${capture.amount} ${capture.currency}.` })
            complete.current?.(capture)
          },
          onCancel: () => setState({ phase: 'ready', line: 'Sandbox checkout cancelled. Nothing was captured.' }),
          onError: (error) => setState({ phase: 'error', line: errorLine(error) }),
        })
        if (!buttons.isEligible()) throw new Error('PayPal Sandbox is not eligible in this browser.')
        await buttons.render(mount.current)
        if (!cancelled) setState({ phase: 'ready', line: 'No real money moves in PayPal Sandbox.' })
      } catch (error) {
        if (!cancelled) setState({ phase: 'error', line: errorLine(error) })
      }
    }
    start()
    return () => {
      cancelled = true
      if (typeof buttons?.close === 'function') buttons.close().catch(() => {})
    }
  }, [accountId, seller.id, catalog.id, cairnReference, cards])

  return <div className={'buy-paypal-sdk ' + state.phase}>
    <div ref={mount} className="buy-paypal-buttons" aria-label="PayPal Sandbox approval" />
    <p className="mono" role={state.phase === 'error' ? 'alert' : 'status'}>{state.line}</p>
  </div>
}
