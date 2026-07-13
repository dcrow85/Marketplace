import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import App from './App.jsx'
import './styles.css'

const APP_ID = import.meta.env.VITE_PRIVY_APP_ID

// One-time recovery for sessions created before wallet discovery was removed from
// bootstrap. A stale Privy token can otherwise keep the provider from mounting any
// UI when injected wallets disagree. Cairn's collection keys are left untouched.
try {
  const recoveryKey = 'cairn-auth-bootstrap-2026-07-13-v2'
  if (!localStorage.getItem(recoveryKey)) {
    // Privy uses its own prefix; remove only its stale bootstrap/session records.
    // Cairn collection, display, offer, and profile records use `cairn-*` keys.
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i)
      if (key?.startsWith('privy:')) localStorage.removeItem(key)
    }
    localStorage.setItem(recoveryKey, '1')
  }
} catch { /* storage can be unavailable in locked-down browsers */ }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PrivyProvider
      appId={APP_ID}
      config={{
        // Keep authentication identity-first. External wallet discovery is intentionally
        // not part of bootstrap: competing injected providers must never prevent Cairn
        // from loading. Wallets can be connected later, after authentication.
        loginMethods: ['email', 'google', 'apple', 'passkey'],
        appearance: {
          theme: 'light',
          accentColor: '#2C5B8C',
          // No wallet is part of authentication. This prevents Privy's bootstrap
          // connector pass from reading the legacy `window.ethereum` singleton.
          walletChainType: 'solana-only',
          // Do not auto-enumerate injected browser wallets during auth bootstrap.
          walletList: ['wallet_connect_qr'],
        },
        // Wallet provisioning belongs at the settlement decision, not page bootstrap.
        // Keeping it out here prevents injected providers from blocking basic identity.
      }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>,
)
