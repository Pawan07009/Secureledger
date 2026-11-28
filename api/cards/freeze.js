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

  const card = await db.toggleCardFreeze(authState.user.id);
  if (!card) {
    return res.status(404).json({ error: "No active corporate card found for this account." });
  }

  await db.appendAuditLog({
    id: `LOG-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    actor: authState.user.name,
    action: card.status === "frozen" ? "Corporate Card Frozen" : "Corporate Card Unfrozen",
    details: `Virtual card ending in •••• ${card.last4} set to ${card.status}`,
    ipAddress: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1",
    status: "verified"
  });

  return res.status(200).json({
    success: true,
    cardId: card.id,
    status: card.status,
    message: `Card is now ${card.status}.`
  });
}
