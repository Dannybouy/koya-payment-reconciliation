# Payment reconciliation

`payments.jsonl` is an export of payment events from a payments provider, one JSON object per line. The reconciliation script is meant to work out how much money was actually collected, but it doesn't work.

Fix it, in Python (`reconcile.py`) or JavaScript (`reconcile.js`), whichever you prefer. When it's right, it prints a code. Paste that code into the application form.

## How the data works

- Each line is one event: `txn_id`, `status` (`success`, `failed` or `pending`), `amount` in naira, `currency`, and `ts` (when it happened, UTC).
- A payment can be attempted more than once. Every attempt has the same `txn_id`. Only the latest attempt for each `txn_id` counts.
- A payment counts as collected only if its latest attempt is `success`.
- The export comes from a production system and isn't perfectly clean. Ignore lines that can't be read, and events without a `txn_id`. Every other event is valid and must be counted correctly.
- `expected.txt` holds the number of successful payments the finance team counted by hand. The script checks itself against it.

## JavaScript fix

The original script crashed on malformed JSON, counted every successful attempt instead of each payment's latest attempt, and could not read amounts containing commas.

The fix skips unreadable lines and events without a `txn_id`, then uses a `Map` to keep the event with the latest timestamp for each transaction. Only transactions whose latest status is `success` are counted. Amounts are stripped of commas and summed in integer kobo to avoid accumulating floating-point errors, then the final total is rounded to naira for the code.

Run the script with `node reconcile.js` and the regression tests with `node --test reconcile.test.js`.

Verified result: **22,733 successful payments**, totalling **₦1,964,687,345.74**. Application code: **`KOYA-1964687346`**.

## What to submit

1. Fork this repo, fix the script, and commit your fix to your fork.
2. Run it. Paste the code it prints into the form.
3. Paste the link to your fork into the form.
