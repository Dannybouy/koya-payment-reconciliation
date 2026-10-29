const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function run(lines, expected) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "koya-reconcile-"));
  try {
    fs.writeFileSync(path.join(dir, "payments.jsonl"), lines.map(line =>
      typeof line === "string" ? line : JSON.stringify(line)
    ).join("\n"));
    fs.writeFileSync(path.join(dir, "expected.txt"), String(expected));
    return spawnSync(process.execPath, [path.join(__dirname, "reconcile.js")], {
      cwd: dir, encoding: "utf8",
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function event(id, status, amount, ts = "2026-09-01T00:00:00Z") {
  return { txn_id: id, status, amount, currency: "NGN", ts };
}

function check(result, count, code) {
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `Check passed: ${count} successful payments.\nYour code: KOYA-${code}\n`);
}

test("ignores malformed lines and events without a transaction ID", () => {
  check(run(["{broken", "", {}, null, event("", "success", 500),
    event("paid", "success", 10)], 1), 1, 10);
});

test("uses the latest timestamp, regardless of file order or final status", () => {
  check(run([
    event("failed", "failed", 100, "2026-09-03T00:00:00Z"),
    event("failed", "success", 100),
    event("pending", "success", 200),
    event("pending", "pending", 200, "2026-09-02T00:00:00Z"),
    event("paid", "success", 30, "2026-09-03T00:00:00Z"),
    event("paid", "failed", 30),
    event("paid", "success", 20, "2026-09-02T00:00:00Z"),
  ], 1), 1, 30);
});

test("parses comma-separated amounts and rounds the final total once", () => {
  check(run([event("a", "success", "1,234.56"),
    event("b", "success", 10.25), event("c", "success", 10.25)], 3), 3, 1255);
});

test("preserves the expected-count check", () => {
  const result = run([event("a", "success", 10)], 2);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Check failed: counted 1 successful payments, expected 2/);
  assert.doesNotMatch(result.stdout, /Your code:/);
});
