# Alpha Trade Step: open-claim

- Generated: `2026-05-21T01:00:26.814122+00:00`
- RPC: `http://127.0.0.1:64550`
- Chain: `anvil:31337`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `ClaimOrDisputePending`

## Packets

- `alpha_espeon_claim_evidence`: `0x527fa8ade56dca104c6ae446ec1474ee29755359fd7774a14d65e5ed232cee64`
- `alpha_espeon_claim`: `0x6f1d8a85b5f6830565a1f3def477f2ce3ad5069efc1996b015ecbfa228f0e9b0`

## Transactions

- `alpha Espeon attach claim evidence`: `0xf376446b28490072c7b24b64955491730a1763830ef576d9448827de698817e2`
- `alpha Espeon open condition claim`: `0xff4612f982775643cde559f0beed8eb2c145eea4e624b90d1a4a3aaa283c9228`

## Interpretation

Buyer claim evidence and the dispute bond moved the escrow into ClaimOrDisputePending. The protocol has preserved the dispute surface; it has not decided who is right.
