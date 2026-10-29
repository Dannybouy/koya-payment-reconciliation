// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");

// Sum integer kobo to avoid accumulating floating-point errors.
let totalKobo = 0;
let count = 0;

const latestByTransaction = new Map();
const lines = fs.readFileSync("payments.jsonl", "utf8").split("\n");
for (const line of lines) {
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue;
  }
  if (!event?.txn_id) continue;

  const previous = latestByTransaction.get(event.txn_id);
  if (!previous || Date.parse(event.ts) > Date.parse(previous.ts)) {
    latestByTransaction.set(event.txn_id, event);
  }
}

for (const event of latestByTransaction.values()) {
  if (event.status === "success") {
    const amount = Number(String(event.amount).replace(/,/g, ""));
    totalKobo += Math.round(amount * 100);
    count += 1;
  }
}

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  const total = (totalKobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  console.log(`Total collected: ₦${total}`);
  console.log(`Your code: KOYA-${Math.round(totalKobo / 100)}`);
}
