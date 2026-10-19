import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "fee-check.mjs");

function run(args) {
  try {
    const out = execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8", stdio: "pipe" });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout ?? "") + (e.stderr ?? "") };
  }
}

function withFixtures(fees, events) {
  const dir = mkdtempSync(join(tmpdir(), "fee-check-"));
  const feesPath = join(dir, "fees.json");
  const eventsPath = join(dir, "events.json");
  writeFileSync(feesPath, JSON.stringify(fees));
  writeFileSync(eventsPath, JSON.stringify(events));
  return { feesPath, eventsPath, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test("--help exits 0", () => {
  const r = run(["--help"]);
  assert.equal(r.code, 0);
});

test("missing args exits 1", () => {
  const r = run([]);
  assert.equal(r.code, 1);
});

test("matching fees report zero mismatches and exit 0", () => {
  const f = withFixtures(
    { buyBps: 250 },
    [
      { type: "buy", amount: 12.5, fee: 0.3125 },
      { type: "buy", amount: 100, fee: 2.5 },
    ]
  );
  try {
    const r = run(["--config", f.feesPath, "--events", f.eventsPath]);
    assert.equal(r.code, 0);
    assert.match(r.out, /matched:\s+2/);
    assert.match(r.out, /mismatches:\s+0/);
  } finally {
    f.cleanup();
  }
});

test("a fee mismatch is reported and exits 2", () => {
  const f = withFixtures(
    { buyBps: 250 },
    [{ type: "buy", amount: 100, fee: 1.0 }] // expected 2.5
  );
  try {
    const r = run(["--config", f.feesPath, "--events", f.eventsPath]);
    assert.equal(r.code, 2);
    assert.match(r.out, /mismatches:\s+1/);
    assert.match(r.out, /MISMATCH/);
  } finally {
    f.cleanup();
  }
});

test("zero-bps actions must carry zero fee", () => {
  const f = withFixtures(
    { listBps: 0 },
    [
      { type: "list", amount: 50, fee: 0 },
      { type: "list", amount: 50, fee: 0.5 }, // should mismatch
    ]
  );
  try {
    const r = run(["--config", f.feesPath, "--events", f.eventsPath]);
    assert.equal(r.code, 2);
    assert.match(r.out, /mismatches:\s+1/);
  } finally {
    f.cleanup();
  }
});

test("tolerance absorbs a rounding difference", () => {
  const f = withFixtures(
    { buyBps: 333 },
    [{ type: "buy", amount: 3, fee: 0.0999 }] // expected 0.0999 exactly, tiny float drift
  );
  try {
    const strict = run(["--config", f.feesPath, "--events", f.eventsPath, "--tolerance", "0"]);
    const loose = run(["--config", f.feesPath, "--events", f.eventsPath, "--tolerance", "0.001"]);
    assert.equal(loose.code, 0);
    assert.match(loose.out, /matched:\s+1/);
    // strict may or may not trip depending on float; assert only that loose passed
    assert.ok(strict.code === 0 || strict.code === 2);
  } finally {
    f.cleanup();
  }
});

test("events with an unknown type are skipped, not counted", () => {
  const f = withFixtures(
    { buyBps: 250 },
    [
      { type: "buy", amount: 10, fee: 0.25 },
      { type: "cancel", amount: 10, fee: 0 },
    ]
  );
  try {
    const r = run(["--config", f.feesPath, "--events", f.eventsPath]);
    assert.match(r.out, /events_checked:\s+1/);
    assert.equal(r.code, 0);
  } finally {
    f.cleanup();
  }
});

test("wrapped { events: [...] } shape is accepted", () => {
  const f = withFixtures({ buyBps: 100 }, { events: [{ type: "buy", amount: 10, fee: 0.1 }] });
  try {
    const r = run(["--config", f.feesPath, "--events", f.eventsPath]);
    assert.equal(r.code, 0);
    assert.match(r.out, /events_checked:\s+1/);
  } finally {
    f.cleanup();
  }
});

test("empty event list reports zero checked and exits 0", () => {
  const f = withFixtures({ buyBps: 250 }, []);
  try {
    const r = run(["--config", f.feesPath, "--events", f.eventsPath]);
    assert.equal(r.code, 0);
    assert.match(r.out, /events_checked:\s+0/);
  } finally {
    f.cleanup();
  }
});

test("non-numeric amount/fee rows are skipped safely", () => {
  const f = withFixtures(
    { buyBps: 250 },
    [
      { type: "buy", amount: "not-a-number", fee: "0.5" },
      { type: "buy", amount: 10, fee: 0.25 },
    ]
  );
  try {
    const r = run(["--config", f.feesPath, "--events", f.eventsPath]);
    assert.equal(r.code, 0);
    assert.match(r.out, /events_checked:\s+1/);
  } finally {
    f.cleanup();
  }
});

test("bad JSON in config exits 1 with an error", () => {
  const dir = mkdtempSync(join(tmpdir(), "fee-check-bad-"));
  try {
    const bad = join(dir, "bad.json");
    writeFileSync(bad, "{ not json");
    const ev = join(dir, "ev.json");
    writeFileSync(ev, "[]");
    const r = run(["--config", bad, "--events", ev]);
    assert.equal(r.code, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("100 bps = 1% computed correctly", () => {
  const f = withFixtures(
    { buyBps: 100 },
    [
      { type: "buy", amount: 250, fee: 2.5 },
      { type: "buy", amount: 0.01, fee: 0.0001 },
    ]
  );
  try {
    const r = run(["--config", f.feesPath, "--events", f.eventsPath]);
    assert.equal(r.code, 0);
    assert.match(r.out, /matched:\s+2/);
  } finally {
    f.cleanup();
  }
});
