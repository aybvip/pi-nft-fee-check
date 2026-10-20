# Design decisions — pi-nft-fee-check

## D1 — Treat the declared rate as a claim, not a fact

**Reasoning:** a marketplace that publishes "2.5 % on buy" is making a claim. A
dashboard showing the same number is repeating the claim, not measuring it. Only
the chain records what was charged.

**Decision:** the tool takes the declared schedule as **input** and recomputes the
expected fee as `amount × bps ÷ 10 000`, then compares against the observed fee.
It never asserts the declared rate is right; it reports whether the observed fee
follows it.

## D2 — Deterministic comparison, with an explicit tolerance

**Reasoning:** fees are computed in floating point, so a strict equality can fail
at the last displayed digit even when the rate was applied exactly.

**Decision:** `--tolerance` (in the same unit as the amounts, default `0`) absorbs
rounding at the last displayed digit. `--tolerance 0` is exact and is the default,
so a caller who wants strictness gets it and a caller who wants the drift
absorbed states the bound explicitly. The tolerance is never silently applied.

## D3 — Report the delta, not a verdict on honesty

**Decision:** each row prints expected vs observed and `OK`/`MISMATCH`. The tool
does not say "the marketplace is cheating" or "the marketplace is honest"; it
prints a discrepancy or its absence. Judging intent is not something the data can
support.

## D4 — Bucket the events by declared action, skip the unknown

**Decision:** fees are looked up by event `type` against the declared schedule
(`listBps`, `buyBps`, `acceptBps`). An unknown event type is **skipped, not
counted** — it is not a match and not a mismatch, because the schedule says
nothing about it. This keeps the mismatch count from being inflated by events the
schedule does not cover.

## D5 — Zero-bps actions must carry a zero fee

**Decision:** when the declared rate for an action is 0 bps, a non-zero observed
fee is a mismatch. This closes the case where a "free" action silently charges.

## D6 — Skip non-numeric rows instead of producing `NaN`

**Reasoning:** a row with `amount: "abc"` or a missing `fee` would otherwise
poison the summary with `NaN` and produce a meaningless result.

**Decision:** non-numeric `amount` or `fee` rows are skipped safely. The tool
reports a count of what it actually checked, so a skipped row is visible in the
totals rather than hidden.

## D7 — Accept both input shapes, fail loudly on malformed JSON

**Decision:** `events.json` may be a bare array or `{ "events": [...] }`, matching
what scripts tend to emit. Malformed JSON exits `1`, distinct from a mismatch
which exits `2`, so an input error is never mistaken for a fee problem.
