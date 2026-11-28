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

  const { user, tokenHash } = authState;
  const { method } = req.body || {};

  // Upgrade session to Level 2 (Elevated clearance for 15 minutes)
  await db.updateSessionClearance(tokenHash, "level_2");

  await db.appendAuditLog({
    id: `LOG-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    actor: user.name,
    action: "Step-Up Clearance Granted",
    details: `Elevated to Level 2 via ${method || "Biometric Authorization"}`,
    ipAddress: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1",
    status: "verified"
  });

  return res.status(200).json({
    success: true,
    clearance: "level_2",
    message: "Level 2 Elevated Clearance activated for 15 minutes."
  });
}
