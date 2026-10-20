# Sources — pi-nft-fee-check

This repository has no network source. Its two sources are **files the caller
supplies**, and the reason it works that way is the point of the tool: a
marketplace's published schedule is the thing being **tested**, so it cannot also
be the thing being **trusted**.

## Source 1 — the declared schedule (`fees.json`)

A claim made by a marketplace, expressed in basis points:

```json
{ "listBps": 0, "buyBps": 250, "acceptBps": 0, "currency": "PI" }
```

The tool treats every number here as an **input to be checked**, never as an
established fact. If the schedule is wrong, the tool will show the observed fees
deviating from it — which is the intended outcome, not a failure.

## Source 2 — the observed events (`events.json`)

The record of what the chain actually charged, supplied by the caller:

```json
[ { "type": "buy", "amount": "12.5", "fee": "0.3125", "tx": "..." } ]
```

Provenance of these rows is the **caller's** responsibility and is deliberately
outside this tool's scope. How the rows were obtained (REST, RPC, an indexer) does
not change the arithmetic; it does change what the result means, which is why the
tool states that the events are caller-supplied.

## The arithmetic

| Rule | Expression | Checked by |
|---|---|---|
| Fee in basis points | `amount × bps ÷ 10 000` | `node --test test.mjs` |
| `100 bps` | `= 1 %` | asserted on a large and a fractional amount |
| Zero bps | observed fee must be `0` | asserted |
| Tolerance | `abs(expected − observed) <= tolerance` | asserted, including `--tolerance 0` strictness |

## Re-checking everything

```bash
git clone https://github.com/aybvip/pi-nft-fee-check
cd pi-nft-fee-check
node --test test.mjs                                             # 12 offline checks
node fee-check.mjs --config fees.json --events events.json       # reconcile
node fee-check.mjs --config fees.json --events events.json --tolerance 1
```

## No third-party source

No marketplace documentation, blog or dashboard is used as a source. Where such a
document would normally be cited as authority, this tool instead takes the same
numbers as a **hypothesis** and measures the events against them. That inversion
is the repository's contribution: it makes the published rate falsifiable for the
events in hand.
