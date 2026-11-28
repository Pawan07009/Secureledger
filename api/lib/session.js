import { db } from "./db.js";
import { parseCookies, hashSessionToken } from "./auth.js";

/**
 * Validates the authenticated session from HttpOnly cookie or Authorization Bearer header.
 * Returns { user, session } if valid, or null.
 */
export async function authenticateSession(req) {
  // 1. Try cookie
  const cookies = parseCookies(req);
  let rawToken = cookies.secureledger_session;

  // 2. Try Authorization: Bearer <token>
  if (!rawToken && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      rawToken = parts[1];
    }
  }

  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const session = await db.getSession(tokenHash);
  if (!session) return null;

  const user = await db.findUserById(session.userId);
  if (!user) return null;

  return { user, session, tokenHash };
}
