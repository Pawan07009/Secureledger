import { db } from "../lib/db.js";
import { authenticateSession } from "../lib/session.js";
import { clearSessionCookie } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const authState = await authenticateSession(req);
  if (authState) {
    await db.deleteSession(authState.tokenHash);
    await db.appendAuditLog({
      id: `LOG-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      actor: authState.user.name,
      action: "Session Terminated",
      details: "User initiated sign-out",
      ipAddress: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1",
      status: "verified"
    });
  }

  res.setHeader("Set-Cookie", clearSessionCookie());
  return res.status(200).json({ success: true, message: "Logged out successfully." });
}
