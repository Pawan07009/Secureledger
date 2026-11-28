import { db } from "./lib/db.js";
import { authenticateSession } from "./lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const authState = await authenticateSession(req);
  if (!authState) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const accounts = await db.getAccountsByUserId(authState.user.id);
  return res.status(200).json({ success: true, accounts });
}
