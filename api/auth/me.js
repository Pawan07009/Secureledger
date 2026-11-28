import { authenticateSession } from "../lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const authState = await authenticateSession(req);
  if (!authState) {
    return res.status(401).json({ error: "Authentication required. Please sign in." });
  }

  const { user, session } = authState;
  const sessionRemainingMs = Math.max(0, session.expiresAt - Date.now());

  return res.status(200).json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      title: user.title,
      role: user.role,
      clearance: session.clearance
    },
    session: {
      clearance: session.clearance,
      remainingSeconds: Math.floor(sessionRemainingMs / 1000)
    }
  });
}
