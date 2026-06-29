// Bridges Privy's wallet to a viem wallet client for escrow writes.
// Login/onboarding polish (token-gate, PFP identity) is deferred — this just hands the
// trade flow a signer when one exists, and reports `ready:false` when it doesn't.
import { useWallets } from '@privy-io/react-auth'
import { walletClientFrom } from '../chain/escrow.js'

export function useEscrowWallet() {
  const { wallets } = useWallets()
  // The embedded wallet (created on login) is the default; fall back to any connected one.
  const wallet = wallets?.find((w) => w.walletClientType === 'privy') || wallets?.[0] || null

  async function getWalletClient() {
    if (!wallet) throw new Error('No wallet connected — sign in first.')
    const provider = await wallet.getEthereumProvider()
    return walletClientFrom(provider, wallet.address)
  }

  return { address: wallet?.address || null, ready: !!wallet, getWalletClient }
}
