#!/bin/sh
# Local EVM for the full checkout rehearsal: Anvil + the REAL ThinPilotEscrow + a
# MockUSDC, dev actors funded, and web/.env.local written so `npm run dev` runs the
# entire checkout on real rails (chain id 31337, anvil's well-known dev accounts).
# Consumes chain/ artifacts read-only — the contracts are Codex's lane, untouched.
set -e
. ~/.zshenv 2>/dev/null || true
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RPC="http://127.0.0.1:8545"

BUYER=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
BUYER_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# 1. anvil (reuse if already listening)
if ! cast chain-id --rpc-url "$RPC" >/dev/null 2>&1; then
  echo "starting anvil…"
  nohup anvil --chain-id 31337 --silent > /tmp/cairn-anvil.log 2>&1 &
  for i in $(seq 1 20); do cast chain-id --rpc-url "$RPC" >/dev/null 2>&1 && break; sleep 0.3; done
fi
echo "anvil up · chain id $(cast chain-id --rpc-url "$RPC")"

# 2. deploy MockUSDC (from the escrow's own test file) + ThinPilotEscrow(usdc, cap 200 USDC, 14d)
USDC=$(forge create --root "$ROOT/chain" test/ThinPilotEscrow.t.sol:MockUSDC \
  --rpc-url "$RPC" --private-key "$BUYER_KEY" --broadcast --json | python3 -c 'import json,sys; print(json.load(sys.stdin)["deployedTo"])')
ESCROW=$(forge create --root "$ROOT/chain" src/ThinPilotEscrow.sol:ThinPilotEscrow \
  --rpc-url "$RPC" --private-key "$BUYER_KEY" --broadcast --json \
  --constructor-args "$USDC" 200000000 1209600 | python3 -c 'import json,sys; print(json.load(sys.stdin)["deployedTo"])')
echo "MockUSDC        $USDC"
echo "ThinPilotEscrow $ESCROW"

# 3. fund the buyer with 1000 rehearsal USDC
cast send "$USDC" "mint(address,uint256)" "$BUYER" 1000000000 \
  --rpc-url "$RPC" --private-key "$BUYER_KEY" >/dev/null
echo "buyer funded    1000 USDC → $BUYER"

# 4. hand the addresses to the app
cat > "$ROOT/web/.env.local" <<EOF
VITE_CHAIN_MODE=local
VITE_LOCAL_ESCROW=$ESCROW
VITE_LOCAL_USDC=$USDC
EOF
echo "web/.env.local written — restart the dev server to pick it up"
echo
echo "the entire checkout now runs on this chain: accept a cash deal and watch"
echo "the ledger fund, ship, inspect, and settle with real transactions."
