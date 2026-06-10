# Alpha Trade Step: open-claim

- Generated: `2026-05-20T17:50:36.310766+00:00`
- RPC: `http://127.0.0.1:18653`
- Chain: `anvil:31337`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `ClaimOrDisputePending`

## Packets

- `alpha_espeon_claim_evidence`: `0x527fa8ade56dca104c6ae446ec1474ee29755359fd7774a14d65e5ed232cee64`
- `alpha_espeon_claim`: `0x6f1d8a85b5f6830565a1f3def477f2ce3ad5069efc1996b015ecbfa228f0e9b0`

## Transactions

- `alpha Espeon attach claim evidence`: `0xa192d5e706fef40385ea156e3a4d3b4dc41705810c52e153682fd49036d38ced`
- `alpha Espeon open condition claim`: `0xb5a98550649741ec1fd34d1c933a182eda17ca42525a804a811139554f3a5ca1`

## Interpretation

Buyer claim evidence and the dispute bond moved the escrow into ClaimOrDisputePending. The protocol has preserved the dispute surface; it has not decided who is right.
