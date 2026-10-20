# Documentation index — pi-nft-fee-check

A read-only, zero-dependency reconciler between a declared NFT-marketplace fee
schedule (basis points) and the fees actually observed in on-chain events.

| Document | What it covers |
|---|---|
| [`BOUNDARIES.md`](BOUNDARIES.md) | every claim this tool does **not** make, and why |
| [`DECISIONS.md`](DECISIONS.md) | the declared-vs-observed design and the tolerance rule |
| [`SOURCES.md`](SOURCES.md) | the two input files as sources, and how to re-check |
| [`VERIFICATION.md`](VERIFICATION.md) | how to reproduce the 12 offline checks |
| [`../README.md`](../README.md) | the full description and quick start |
| [`../llms.txt`](../llms.txt) | a compact summary for machine readers |

## The one-line answer

> A published fee schedule is a **claim**; only the chain records what was
> actually charged. This tool recomputes the **expected** fee from the declared
> rate and the observed amount, and reports the delta.

## Claim status at a glance

| Statement | Status |
|---|---|
| Expected fee = amount × bps ÷ 10 000 | **verifiable** (`node --test test.mjs`) |
| `100 bps = 1 %` on large and fractional amounts | **verifiable** |
| A mismatch is reported and exits `2` | **verifiable** |
| `--tolerance 0` is exact; a wider value absorbs float drift | **verifiable** |
| The declared rate is correct | **not claimed** |
| No fee was taken elsewhere | **not claimed** |
| The supplied events are authentic | **not claimed** |
