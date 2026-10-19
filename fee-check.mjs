#!/usr/bin/env node
/**
 * Pi NFT Fee Reconciliation — read-only.
 *
 * Reads a declared fee schedule (from a config file) and a set of on-chain
 * marketplace events (list / buy / accept / cancel), then reconciles them:
 * for every fee-bearing event it recomputes the expected fee from the declared
 * schedule and the observed amount, and reports any mismatch.
 *
 * GET-only. No writes. No database.
 *
 * Usage:
 *   node fee-check.mjs --config fees.json --events events.json
 *   node fee-check.mjs --config fees.json --events events.json --tolerance 1
 */

import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";

function usage() {
  console.log(
    [
      "Pi NFT Fee Reconciliation",
      "",
      "  node fee-check.mjs --config <fees.json> --events <events.json> [--tolerance stroops]",
      "",
      "fees.json shape:  { \"listBps\": 0, \"buyBps\": 250, \"acceptBps\": 0, \"currency\": \"PI\" }",
      "events.json shape: [ { \"type\": \"buy\", \"amount\": \"12.5\", \"fee\": \"0.3125\", ... } ]",
      "",
      "Compares declared fee rates against observed fees in on-chain events.",
    ].join("\n")
  );
}

const { values } = parseArgs({
  options: {
    config: { type: "string" },
    events: { type: "string" },
    tolerance: { type: "string", default: "0" },
    help: { type: "boolean", default: false },
  },
});

if (values.help || !values.config || !values.events) {
  usage();
  process.exit(values.help ? 0 : 1);
}

function loadJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

// bps = basis points (1 bps = 0.01%)
function expectedFee(amount, bps) {
  return (amount * bps) / 10000;
}

(async () => {
  console.log("# Pi NFT Fee Reconciliation");
  console.log(`config:  ${values.config}`);
  console.log(`events:  ${values.events}`);
  console.log("");

  const fees = loadJson(values.config);
  const events = loadJson(values.events);

  const schedule = {
    list: fees.listBps ?? 0,
    buy: fees.buyBps ?? 0,
    accept: fees.acceptBps ?? 0,
  };
  console.log("declared schedule (bps):");
  for (const [k, v] of Object.entries(schedule)) console.log(`  ${k}: ${v} bps (${(v / 100).toFixed(2)}%)`);
  console.log("");

  const tol = Number(values.tolerance) || 0;
  const list = Array.isArray(events) ? events : events.events ?? [];

  let checked = 0;
  let matched = 0;
  const mismatches = [];

  for (const [i, ev] of list.entries()) {
    const type = (ev.type ?? ev.event ?? "").toLowerCase();
    const bps = schedule[type];
    if (bps === undefined) continue;
    const amount = Number(ev.amount ?? ev.price ?? 0);
    const observedFee = Number(ev.fee ?? ev.feeAmount ?? 0);
    if (!Number.isFinite(amount) || !Number.isFinite(observedFee)) continue;

    const exp = expectedFee(amount, bps);
    const diff = Math.abs(exp - observedFee);
    const ok = diff <= tol;
    checked++;
    if (ok) matched++;
    else mismatches.push({ index: i, type, amount, expectedFee: exp, observedFee, diff });

    const status = ok ? "OK" : "MISMATCH";
    console.log(`  [${i}] ${type}  amount=${amount}  expected=${exp.toFixed(8)}  observed=${observedFee.toFixed(8)}  ${status}`);
  }

  console.log("");
  console.log("# Summary");
  console.log(`events_checked: ${checked}`);
  console.log(`matched:        ${matched}`);
  console.log(`mismatches:     ${mismatches.length}`);
  if (mismatches.length > 0) {
    console.log("");
    console.log("# Mismatches");
    for (const m of mismatches) {
      console.log(`  [${m.index}] ${m.type} amount=${m.amount} expected=${m.expectedFee.toFixed(8)} observed=${m.observedFee.toFixed(8)} diff=${m.diff.toFixed(8)}`);
    }
  }

  console.log("");
  console.log("# Caveat");
  console.log("A match proves the observed fee equals the declared rate for that event.");
  console.log("It does not prove the declared rate is correct, or that no fee was taken elsewhere.");
  process.exit(mismatches.length === 0 ? 0 : 2);
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
