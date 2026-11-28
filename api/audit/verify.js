import crypto from "crypto";
import { db } from "../lib/db.js";
import { authenticateSession } from "../lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const authState = await authenticateSession(req);
  if (!authState) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const logs = await db.getAuditLogs();
  let valid = true;
  let brokenIndex = -1;

  // The logs are stored chronologically in the database
  // Verify each link against SHA-256 Merkle chain formula
  for (let i = 0; i < logs.length; i++) {
    const entry = logs[i];
    const raw = `${entry.prevHash}|${entry.id}|${entry.timestamp}|${entry.actor}|${entry.action}`;
    const expectedHash = crypto.createHash("sha256").update(raw).digest("hex");

    if (expectedHash !== entry.currHash) {
      valid = false;
      brokenIndex = i;
      break;
    }

    if (i > 0 && entry.prevHash !== logs[i - 1].currHash) {
      valid = false;
      brokenIndex = i;
      break;
    }
  }

  return res.status(200).json({
    success: true,
    chainValid: valid,
    blocksVerified: logs.length,
    brokenIndex: valid ? null : brokenIndex,
    message: valid
      ? `Cryptographic audit chain intact: verified ${logs.length} blocks.`
      : `Integrity failure detected at block index ${brokenIndex}.`
  });
}
