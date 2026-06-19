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
        // Identity-first: email/social/passkey up front; a wallet is just one option.
        loginMethods: ['email', 'google', 'apple', 'passkey', 'wallet'],
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
