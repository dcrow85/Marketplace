# Alpha Trade Step: open-claim

- Generated: `2026-05-20T17:51:21.416483+00:00`
- RPC: `http://127.0.0.1:58717`
- Chain: `anvil:31337`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `ClaimOrDisputePending`

## Packets

- `alpha_espeon_claim_evidence`: `0x527fa8ade56dca104c6ae446ec1474ee29755359fd7774a14d65e5ed232cee64`
- `alpha_espeon_claim`: `0x6f1d8a85b5f6830565a1f3def477f2ce3ad5069efc1996b015ecbfa228f0e9b0`

## Transactions

- `alpha Espeon attach claim evidence`: `0xd8f92bd41b5f4887eca24bf382cf9a42b77a7eaa39e2b3f9a652d6d020cc7399`
- `alpha Espeon open condition claim`: `0xe9fe123abbe67698037dbfb4793a10873e7ebc2fb6f6ca7ca7786ec8acad15d7`

## Interpretation

Buyer claim evidence and the dispute bond moved the escrow into ClaimOrDisputePending. The protocol has preserved the dispute surface; it has not decided who is right.
