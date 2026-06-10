# Alpha Trade Step: open-claim

- Generated: `2026-05-20T17:59:34.023978+00:00`
- RPC: `http://127.0.0.1:59167`
- Chain: `anvil:31337`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `ClaimOrDisputePending`

## Packets

- `alpha_espeon_claim_evidence`: `0x527fa8ade56dca104c6ae446ec1474ee29755359fd7774a14d65e5ed232cee64`
- `alpha_espeon_claim`: `0x6f1d8a85b5f6830565a1f3def477f2ce3ad5069efc1996b015ecbfa228f0e9b0`

## Transactions

- `alpha Espeon attach claim evidence`: `0x5ed8aa8d9a96e26a5f75e3ec6303eddcf88b1f1cb9b79c94ed2d6e9c50092a90`
- `alpha Espeon open condition claim`: `0x1ed9458a20e24098bfb0d3d875da7aa3eb50878a5883c215e6088773ac3be953`

## Interpretation

Buyer claim evidence and the dispute bond moved the escrow into ClaimOrDisputePending. The protocol has preserved the dispute surface; it has not decided who is right.
