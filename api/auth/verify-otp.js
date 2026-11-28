import { db } from "../lib/db.js";
import {
  verifyOtpHash,
  generateSessionToken,
  hashSessionToken,
  serializeSessionCookie,
  checkRateLimit,
  MAX_OTP_ATTEMPTS
} from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const clientIp = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1";
  const rate = checkRateLimit(`verify:${clientIp}`, 10, 60000);
  if (!rate.allowed) {
    return res.status(429).json({
      error: `Too many verification requests. Please retry after ${rate.retryAfter}s.`
    });
  }

  try {
    const { email, code } = req.body || {};

    if (!email || !code) {
      return res.status(400).json({ error: "Customer identifier and 6-digit verification code are required." });
    }

    const cleanCode = String(code).trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({ error: "Verification code must be exactly 6 digits." });
    }

    const user = await db.findUserByIdentifier(email);
    if (!user) {
      return res.status(401).json({ error: "Authentication challenge not found or expired." });
    }

    const otpRecord = await db.getOtp(user.phone);
    if (!otpRecord) {
      return res.status(401).json({
        error: "Verification code expired or not requested. Please sign in again."
      });
    }

    // Check expiry
    if (Date.now() > otpRecord.expiresAt) {
      await db.deleteOtp(user.phone);
      return res.status(401).json({
        error: "Verification code has expired (5-minute limit). Please request a new code."
      });
    }

    // Check brute force attempts on this OTP
    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await db.deleteOtp(user.phone);
      return res.status(429).json({
        error: "Maximum verification attempts exceeded (3). Please initiate a new sign-in."
      });
    }

    // Verify hash with timingSafeEqual
    const isValid = verifyOtpHash(cleanCode, otpRecord.codeHash);

    if (!isValid) {
      const attempts = (otpRecord.attempts || 0) + 1;
      await db.updateOtpAttempts(user.phone, attempts);
      const remaining = MAX_OTP_ATTEMPTS - attempts;

      return res.status(401).json({
        error: remaining > 0
          ? `Invalid verification code. ${remaining} attempt(s) remaining.`
          : "Invalid verification code. Maximum attempts reached."
      });
    }

    // SUCCESS! Invalidate OTP immediately to prevent replay
    await db.deleteOtp(user.phone);
    await db.updateUser(user.id, { phoneVerified: true, failedAttempts: 0 });

    // Generate secure 256-bit session token
    const rawToken = generateSessionToken();
    const tokenHash = hashSessionToken(rawToken);

    // Save session in database (30 min lifetime)
    await db.saveSession(tokenHash, user.id, "level_1", 30 * 60 * 1000);

    // Set signed, HttpOnly, Secure, SameSite=Strict cookie
    res.setHeader("Set-Cookie", serializeSessionCookie(rawToken));

    // Append security audit log
    await db.appendAuditLog({
      id: `LOG-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      actor: user.name,
      action: "Multi-Factor Authentication Succeeded",
      details: "SMS OTP verified and authenticated session initiated",
      ipAddress: clientIp,
      status: "verified"
    });

    return res.status(200).json({
      success: true,
      token: rawToken, // Token also returned for authorization header flexibility
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        title: user.title,
        role: user.role,
        clearance: "level_1"
      }
    });
  } catch (err) {
    console.error("[Verify OTP Error]:", err);
    return res.status(500).json({ error: "Internal verification error." });
  }
}
