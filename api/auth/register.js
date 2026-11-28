import { db } from "../lib/db.js";
import {
  hashPassword,
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
  const rate = checkRateLimit(`reg:${clientIp}`, 5, 60000);
  if (!rate.allowed) {
    return res.status(429).json({
      error: `Too many registration attempts. Please retry after ${rate.retryAfter}s.`
    });
  }

  try {
    const { name, email, phone, password, title } = req.body || {};

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        error: "All fields are required (name, corporate email, phone, password)."
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format." });
    }

    // Password complexity (min 8 chars, 1 uppercase, 1 lowercase, 1 digit)
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        error: "Password must be at least 8 characters and include uppercase, lowercase, and a number."
      });
    }

    // Phone format validation (E.164 or 10-digit Indian number)
    const cleanPhone = String(phone).replace(/\s+/g, "").replace(/-/g, "");
    if (!/^\+?[0-9]{10,14}$/.test(cleanPhone)) {
      return res.status(400).json({ error: "Invalid phone number format." });
    }
    const normalizedPhone = cleanPhone.startsWith("+") ? cleanPhone : `+91${cleanPhone}`;

    // Check if user already exists
    const existing = await db.findUserByIdentifier(email);
    if (existing) {
      return res.status(400).json({
        error: "Account registration could not be completed. Identifier already registered."
      });
    }

    // Hash password with PBKDF2 (100,000 rounds)
    const { salt, hash } = hashPassword(password);

    // Create user
    const newUser = await db.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: normalizedPhone,
      title: title ? title.trim() : "Treasury Officer",
      role: "treasury_officer",
      salt,
      passwordHash: hash,
      phoneVerified: false
    });

    // Generate CSPRNG 6-digit OTP
    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    // Save OTP hash in database (5 minutes expiry)
    await db.saveOtp(newUser.id, normalizedPhone, otpHash, 5 * 60 * 1000);

    // Dispatch SMS via provider (MSG91 / Fast2SMS / Twilio / Secure Server Log)
    await sendOtpSms(normalizedPhone, otp);

    const maskedPhone = normalizedPhone.replace(/(\+?\d{2,3})\d{4,6}(\d{4})/, "$1••••••$2");

    // Return response: NEVER LEAK OTP
    return res.status(201).json({
      success: true,
      requiresOtp: true,
      userId: newUser.id,
      phone: maskedPhone,
      message: `Verification code dispatched to ${maskedPhone}.`
    });
  } catch (err) {
    console.error("[Register Handler Error]:", err);
    return res.status(500).json({ error: "Internal server error during account creation." });
  }
}
