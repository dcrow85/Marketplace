import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import App from './App.jsx'
import './styles.css'

const APP_ID = import.meta.env.VITE_PRIVY_APP_ID

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
          walletChainType: 'ethereum-only',
        },
        // Courtyard's move: every user silently gets a self-custodial embedded wallet.
        embeddedWallets: { createOnLogin: 'users-without-wallets' },
      }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>,
)
