# Pi NFT Fee Reconciliation

A **read-only, zero-dependency** reconciler between a declared NFT-marketplace fee schedule and the fees actually observed in on-chain events.

> **Plainly:** it reads a fee config (basis points per action) and a set of
> marketplace events (`list` / `buy` / `accept` / `cancel`), recomputes the
> **expected** fee from the declared rate and the observed amount, and reports
> any mismatch. A match proves the observed fee equals the declared rate **for
> that event** — it does **not** prove the declared rate is correct, or that no
> fee was taken elsewhere.

## Why it exists

Marketplaces publish a fee schedule, but a published number is a claim, not a
measurement. The only way to know whether the stated fee was actually charged is
to compare it against what the chain recorded. This tool does that comparison
deterministically and reports the delta, so a reviewer can see the discrepancy
directly instead of trusting a dashboard.

## Quick start

```bash
node fee-check.mjs --config fees.json --events events.json
node fee-check.mjs --config fees.json --events events.json --tolerance 1
```

No install. No API keys. No writes.

## Input formats

**`fees.json`** — declared schedule in basis points (1 bps = 0.01 %):

```json
{
  "listBps": 0,
  "buyBps": 250,
  "acceptBps": 0,
  "currency": "PI"
}
```

**`events.json`** — array (or `{ "events": [...] }`) of observed events:

```json
[
  { "type": "buy", "amount": "12.5", "fee": "0.3125", "tx": "…" }
]
```

## Output

A per-event line with expected vs observed, then a summary:

```
  [0] buy  amount=12.5  expected=0.31250000  observed=0.31250000  OK

# Summary
events_checked: 1
matched:        1
mismatches:     0
```

Exit code `0` = all matched, `2` = one or more mismatches, `1` = error.

## Tolerance

Fees are computed in floating point, so a `--tolerance` (in the same unit as the
amounts, default `0`) absorbs rounding at the last displayed digit. Set it to `0`
for exact comparison.

## What this tool does **not** claim

| Not claimed | Why |
|---|---|
| That the declared rate is correct | It only checks whether the **observed** fee matches the **declared** rate. |
| That no fee was taken outside the checked events | It reconciles only the events supplied. |
| That the events are authentic | The caller supplies them; provenance of the event set is a separate question. |
| That the venue owns the fee-receiving address | On-chain data never proves venue ownership. |

## Tests

```bash
node --test test.mjs
```

12 offline checks, no network:

- matching fees report `matched` and exit `0`
- a fee mismatch is reported as `MISMATCH` and exits `2`
- a zero-bps action must carry a zero fee
- `--tolerance 0` is strict; a wider tolerance absorbs float drift
- unknown event types are skipped, not counted
- both the bare-array and `{ "events": [...] }` shapes are accepted
- an empty event list reports `events_checked: 0` and exits `0`
- non-numeric `amount` / `fee` rows are skipped safely instead of producing `NaN`
- malformed JSON exits `1`
- `100 bps = 1 %` is verified on both a large and a fractional amount


## Documentation

| Document | What it covers |
|---|---|
| [`docs/INDEX.md`](docs/INDEX.md) | everything, in reading order, with the claim status of each figure |
| [`docs/BOUNDARIES.md`](docs/BOUNDARIES.md) | every non-claim, in full |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | the design choices and the measurement behind each |
| [`docs/SOURCES.md`](docs/SOURCES.md) | the endpoint, the date, and how to re-measure |
| [`docs/VERIFICATION.md`](docs/VERIFICATION.md) | how to reproduce the tests and the live run |
| [`llms.txt`](llms.txt) | a compact summary for machine readers |

## See also

- `pi-nft-provenance` — who created a token, and when
- `pi-soroban-events` — walk events with measured coverage
- `pi-contract-upgrade-trail` — track `wasmHash` changes across deployments
