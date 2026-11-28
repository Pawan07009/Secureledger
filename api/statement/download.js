import { db } from "../lib/db.js";
import { authenticateSession } from "../lib/session.js";

function sanitizeCsvField(field) {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  // Mitigate CSV Formula Injection: prepend tick if starts with =, +, -, @, \t, \r
  let safeStr = str;
  if (/^[=\+\-@\t\r]/.test(safeStr)) {
    safeStr = `'${safeStr}`;
  }
  return `"${safeStr.replace(/"/g, '""')}"`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const authState = await authenticateSession(req);
  if (!authState) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const txs = await db.getTransactionsByUserId(authState.user.id);

  const headers = [
    "Transaction ID",
    "Timestamp",
    "Title",
    "Category",
    "Direction",
    "Amount (INR)",
    "Running Balance (INR)",
    "Status",
    "Counterparty",
    "Reference",
    "Merkle Block Hash"
  ];

  const rows = txs.map((tx) => [
    sanitizeCsvField(tx.id),
    sanitizeCsvField(tx.timestamp),
    sanitizeCsvField(tx.title),
    sanitizeCsvField(tx.category),
    sanitizeCsvField(tx.direction),
    sanitizeCsvField(tx.amount.toFixed(2)),
    sanitizeCsvField(tx.runningBalance.toFixed(2)),
    sanitizeCsvField(tx.status),
    sanitizeCsvField(tx.counterparty),
    sanitizeCsvField(tx.reference),
    sanitizeCsvField(tx.currHash)
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="SecureLedger_Statement_${new Date().toISOString().slice(0, 10)}.csv"`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(200).send(csvContent);
}
