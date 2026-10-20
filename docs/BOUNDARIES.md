# What this tool does **not** claim

This tool answers one narrow question — *does the observed fee match the declared
rate for the events supplied?* — and nothing wider. The list below is the
boundary.

| Not claimed | Why |
|---|---|
| That the declared rate is **correct** | It only checks whether the observed fee matches the declared rate. A wrong rate that was faithfully applied passes. |
| That no fee was taken **outside** the checked events | It reconciles only the events supplied. Fee-taking on other paths is invisible to it. |
| That the events are **authentic** | The caller supplies them. Provenance of the event set is a separate question. |
| That the venue **owns** the fee-receiving address | On-chain data never proves venue ownership. |
| That a match means the marketplace is honest | A match means the arithmetic holds for those events, nothing about intent. |
| That zero-bps actions take no fee anywhere else | Only that the supplied rows for that action carry a zero fee. |
| That this is the first such tool | The prior-art position is **"no prior work found"**, not "we are first". |
| That Pi Network has adopted, reviewed or endorsed this | Adoption is **not-claimed**. |

## The shape of the claim

- **Verifiable** — decided by this repository's own arithmetic, so an offline test
  settles it: the bps formula, the tolerance behaviour, the exit codes, the input
  shapes.
- **Caller-supplied** — the manifest of events. The tool's result is only as good
  as the rows handed to it, and it says so.

There is no category here where a figure is quoted from a marketplace's own
documentation as if it were a measurement. The declared schedule is treated as a
**claim to be tested**, which is the whole reason the tool exists.
