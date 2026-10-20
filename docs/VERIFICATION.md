# Verification — pi-nft-fee-check

Everything this tool decides is decided offline, by arithmetic on the two files it
is given, so verification is a single command with no network involved.

## Run the suite

```bash
git clone https://github.com/aybvip/pi-nft-fee-check
cd pi-nft-fee-check
node --test test.mjs
```

Expected result: **12 pass, 0 fail**, with **no network access**.

What the 12 checks cover:

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

## Check a reconciliation by hand

```bash
node fee-check.mjs --config fees.json --events events.json
```

For each event the output shows `amount`, `expected`, `observed` and
`OK`/`MISMATCH`, then a summary of `events_checked`, `matched` and `mismatches`.
Because the arithmetic is `amount × bps ÷ 10 000`, any row can be recomputed by
hand or with a spreadsheet and compared against the printed `expected` value.
A disagreement localises to a single row.

## What a passing run does and does not show

- A passing suite shows the **arithmetic** is as specified: the bps formula, the
  tolerance behaviour, the zero-bps rule, the exit codes, the input handling.
- It does **not** show the declared rate is correct. A schedule that is wrong but
  consistently applied reconciles cleanly; the tool reconciles, it does not
  validate the schedule.
- It does **not** show the event set is complete or authentic. Only the rows
  supplied are checked, and their provenance is the caller's.

## Reproducibility note

No digest or signature is attached to these results, and none is claimed. A
digest would prove integrity, not truth, and a signature would require naming an
authority this project does not have. What is offered instead is a command whose
outcome anyone can recompute.
