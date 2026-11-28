import { db } from "../lib/db.js";
import {
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
  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: "Customer identifier is required." });
  }

  const user = await db.findUserByIdentifier(email);
  if (!user) {
    // Avoid user enumeration
    return res.status(200).json({
      success: true,
      message: "If the account is registered, a new verification code has been dispatched."
    });
  }

  // 60-second cooldown per phone
  const rate = checkRateLimit(`resend:${user.phone}`, 1, 60000);
  if (!rate.allowed) {
    return res.status(429).json({
      error: `Please wait ${rate.retryAfter}s before requesting another verification code.`
    });
  }

  try {
    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    await db.saveOtp(user.id, user.phone, otpHash, 5 * 60 * 1000);
    await sendOtpSms(user.phone, otp);

    const maskedPhone = user.phone.replace(/(\+?\d{2,3})\d{4,6}(\d{4})/, "$1••••••$2");

    return res.status(200).json({
      success: true,
      message: `A new 6-digit verification code was dispatched to ${maskedPhone}.`
    });
  } catch (err) {
    console.error("[Resend OTP Error]:", err);
    return res.status(500).json({ error: "Failed to dispatch verification code." });
  }
}
