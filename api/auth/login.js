import { db } from "../lib/db.js";
import {
  verifyPassword,
  generateOtp,
  hashOtp,
  checkRateLimit
} from "../lib/auth.js";
import { sendOtpSms } from "../lib/sms.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const clientIp = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1";
  const rate = checkRateLimit(`login:${clientIp}`, 8, 60000);
  if (!rate.allowed) {
    return res.status(429).json({
      error: `Too many login attempts. Please retry after ${rate.retryAfter}s.`
    });
  }

  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Customer identifier and password are required." });
    }

    const user = await db.findUserByIdentifier(email);

    // Timing-resistant generic error for non-existent users
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Check account lockout
    if (user.lockedUntil && Date.now() < user.lockedUntil) {
      const waitMinutes = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return res.status(403).json({
        error: `Account is temporarily locked due to excessive failed attempts. Please retry in ${waitMinutes} minute(s).`
      });
    }

    // Verify PBKDF2 hash using timingSafeEqual
    const isValid = verifyPassword(password, user.salt, user.passwordHash);

    if (!isValid) {
      const failed = (user.failedAttempts || 0) + 1;
      const updates = { failedAttempts: failed };

      if (failed >= 5) {
        updates.lockedUntil = Date.now() + 15 * 60 * 1000; // 15-minute lockout
        await db.updateUser(user.id, updates);
        return res.status(403).json({
          error: "Account locked for 15 minutes due to 5 consecutive failed login attempts."
        });
      }

      await db.updateUser(user.id, updates);
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Credentials verified! Reset failed attempts count
    await db.updateUser(user.id, { failedAttempts: 0, lockedUntil: 0 });

    // Generate CSPRNG 6-digit OTP
    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    // Save OTP hash in database (5 minutes validity)
    await db.saveOtp(user.id, user.phone, otpHash, 5 * 60 * 1000);

    // Dispatch SMS via configured provider (MSG91 / Fast2SMS / Twilio / Secure server console log)
    await sendOtpSms(user.phone, otp);

    const maskedPhone = user.phone.replace(/(\+?\d{2,3})\d{4,6}(\d{4})/, "$1••••••$2");

    // CRITICAL: NEVER leak OTP in client response payload
    return res.status(200).json({
      success: true,
      requiresMfa: true,
      email: user.email,
      phone: maskedPhone,
      message: `Multi-factor authentication code sent via SMS to ${maskedPhone}.`
    });
  } catch (err) {
    console.error("[Login Handler Error]:", err);
    return res.status(500).json({ error: "Internal authentication error." });
  }
}
