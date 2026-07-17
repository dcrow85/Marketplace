// Bridges Privy's wallet to a viem wallet client for escrow writes.
// Login/onboarding polish (token-gate, PFP identity) is deferred — this just hands the
// trade flow a signer when one exists, and lets settlement explicitly create one.
import { useState } from 'react'
import { useCreateWallet, useWallets } from '@privy-io/react-auth'
import { walletClientFrom } from '../chain/escrow.js'
import { IS_LOCAL_CHAIN } from '../chain/config.js'
import { LOCAL_ACTORS, localWalletClient } from '../chain/localRehearsal.js'

export function useEscrowWallet() {
  const { wallets, ready: walletsReady } = useWallets()
  const { createWallet } = useCreateWallet()
  const [createdWallet, setCreatedWallet] = useState(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  // An explicitly created embedded wallet is the default; fall back to any connected one.
  const discoveredWallet = wallets?.find((w) => w.walletClientType === 'privy') || wallets?.[0] || null
  const wallet = createdWallet || discoveredWallet

  async function createSettlementWallet() {
    if (wallet) return wallet
    setCreating(true)
    setCreateError('')
    try {
      const created = await createWallet()
      setCreatedWallet(created)
      return created
    } catch (err) {
      const message = (err?.message || 'The testnet wallet could not be created.').slice(0, 180)
      setCreateError(message)
      throw err
    } finally {
      setCreating(false)
    }
  }

  async function getWalletClient() {
    if (IS_LOCAL_CHAIN) return localWalletClient('buyer')
    if (!wallet) throw new Error('No wallet connected — sign in first.')
    const provider = await wallet.getEthereumProvider()
    return walletClientFrom(provider, wallet.address)
  }

  // Local rehearsal: anvil account 0 is you, no Privy signature theater needed.
  if (IS_LOCAL_CHAIN) return {
    address: LOCAL_ACTORS.buyer, ready: true, walletsReady: true, creating: false,
    createError: '', createSettlementWallet, getWalletClient,
  }
  return {
    address: wallet?.address || null,
    // External connector discovery is intentionally disabled and its global ready flag
    // may stay false. A returned/discovered embedded wallet is independently usable.
    ready: !!wallet,
    walletsReady,
    creating,
    createError,
    createSettlementWallet,
    getWalletClient,
  }
}
