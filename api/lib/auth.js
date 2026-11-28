import crypto from "crypto";

const SESSION_COOKIE_NAME = "secureledger_session";
const SESSION_MAX_AGE_SEC = 1800; // 30 minutes
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_OTP_ATTEMPTS = 3;

// In-memory sliding window rate-limiting for serverless environments
// Keys: ip:endpoint or phone:send-otp
const rateLimitStore = new Map();

export function checkRateLimit(key, maxRequests = 5, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitStore.get(key) || { count: 0, firstRequest: now };

  if (now - record.firstRequest > windowMs) {
    rateLimitStore.set(key, { count: 1, firstRequest: now });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    const retryAfter = Math.ceil((record.firstRequest + windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count += 1;
  rateLimitStore.set(key, record);
  return { allowed: true, remaining: maxRequests - record.count };
}

export function hashPassword(password, salt = null) {
  const passwordSalt = salt || crypto.randomBytes(32).toString("hex");
  const hash = crypto.pbkdf2Sync(password, passwordSalt, 100000, 64, "sha512").toString("hex");
  return { salt: passwordSalt, hash };
}

export function verifyPassword(password, salt, storedHash) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  const hashBuf = Buffer.from(hash, "hex");
  const storedBuf = Buffer.from(storedHash, "hex");
  if (hashBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(hashBuf, storedBuf);
}

export function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtp(code) {
  return crypto.createHash("sha256").update(String(code).trim()).digest("hex");
}

export function verifyOtpHash(enteredCode, storedHash) {
  const enteredHash = hashOtp(enteredCode);
  const enteredBuf = Buffer.from(enteredHash, "hex");
  const storedBuf = Buffer.from(storedHash, "hex");
  if (enteredBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(enteredBuf, storedBuf);
}

export function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSessionToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (!rc) return list;

  rc.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    list[parts.shift().trim()] = decodeURIComponent(parts.join("="));
  });

  return list;
}

export function serializeSessionCookie(token, maxAge = SESSION_MAX_AGE_SEC) {
  // Enforce HttpOnly, Secure, SameSite=Strict
  const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  const secureFlag = isProd ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${secureFlag}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`;
}

export {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SEC,
  OTP_EXPIRY_MS,
  MAX_OTP_ATTEMPTS
};
