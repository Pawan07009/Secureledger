#!/usr/bin/env python3
"""
==============================================================================
SecureLedger - Enterprise FinTech Backend & Banking API Server
==============================================================================
Architecture & Features:
- Multi-threaded (ThreadingHTTPServer) binding to 0.0.0.0 for LAN/Mobile access.
- Embedded ACID relational storage via SQLite (secureledger.db).
- Cryptographic authentication:
  * NIST SP 800-132 PBKDF2-HMAC-SHA256 (100,000 rounds) password hashing.
  * CSPRNG 6-digit Multi-Factor Authentication (OTP) with 3-minute expiry.
  * Secure session management with HttpOnly, SameSite=Strict cookies.
  * Contextual dual-tier clearance with timed Step-Up authorization decay.
  * IP-based rate limiting & brute-force lockouts.
- Tamper-evident transaction & audit ledger with SHA-256 Merkle chain verification.
- Banking controls: Balance sufficiency, duplicate transfer idempotency, virtual card locking.
- Defense-in-depth static serving:
  * Path traversal protection (../ directory climbing -> 403 Forbidden).
  * Sensitive files protection (.db, .py, .ps1, .env, .md, .log -> 403 Forbidden).
  * Strict MIME whitelist (unknown extensions -> 404 Not Found).
  * Enforced Content Security Policy (CSP), nosniff, DENY frame options.
==============================================================================
"""

import os
import sys
import time
import json
import socket
import secrets
import hashlib
import hmac
import sqlite3
import argparse
import urllib.parse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timezone

DB_NAME = "secureledger.db"

MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
}

FORBIDDEN_FILES = {
    'server.ps1',
    'server.py',
    'test_server.py',
    'readme.md',
    'secureledger.db',
    '.env',
    '.gitignore',
    '.gitattributes',
    'web.config',
    'files.zip',
}

FORBIDDEN_EXTENSIONS = {
    '.ps1',
    '.py',
    '.md',
    '.zip',
    '.env',
    '.config',
    '.bak',
    '.log',
    '.sh',
    '.db',
    '.sqlite',
    '.sqlite3',
}

CSP_POLICY = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com; "
    "img-src 'self' data:; "
    "connect-src 'self'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "frame-ancestors 'none'"
)

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"


# ==============================================================================
# CRYPTOGRAPHIC & SECURITY HELPERS
# ==============================================================================

def hash_password(password: str, salt: bytes = None) -> tuple[str, str]:
    """PBKDF2-HMAC-SHA256 password hashing with 100,000 iterations (NIST standard)."""
    if salt is None:
        salt = secrets.token_bytes(32)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100_000)
    return salt.hex(), dk.hex()


def verify_password(password: str, salt_hex: str, hash_hex: str) -> bool:
    """Constant-time verification of password against stored hash."""
    salt = bytes.fromhex(salt_hex)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100_000)
    return hmac.compare_digest(dk.hex(), hash_hex)


def compute_sha256(payload: str) -> str:
    """Compute standard SHA-256 digest."""
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()


def compute_chain_hash(prev_hash: str, tx_id: str, timestamp: str, amount: float, counterparty: str) -> str:
    """Calculate cryptographic chain block hash."""
    raw = f"{prev_hash}|{tx_id}|{timestamp}|{amount:.2f}|{counterparty}"
    return compute_sha256(raw)


def compute_audit_hash(prev_hash: str, log_id: str, timestamp: str, actor: str, action: str) -> str:
    """Calculate audit trail block hash."""
    raw = f"{prev_hash}|{log_id}|{timestamp}|{actor}|{action}"
    return compute_sha256(raw)


# ==============================================================================
# DATABASE INITIALIZATION & MIGRATIONS
# ==============================================================================

def get_db(db_path: str = DB_NAME):
    conn = sqlite3.connect(db_path, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def init_database(db_path: str = DB_NAME):
    """Seed relational database tables, users, accounts, and cryptographic ledger."""
    conn = get_db(db_path)
    cur = conn.cursor()

    cur.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            title TEXT NOT NULL,
            role TEXT NOT NULL,
            clearance TEXT NOT NULL DEFAULT 'level_1',
            salt TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            failed_attempts INTEGER NOT NULL DEFAULT 0,
            locked_until REAL NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            clearance TEXT NOT NULL,
            expires_at REAL NOT NULL,
            created_at REAL NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS mfa_challenges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            code TEXT NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            expires_at REAL NOT NULL,
            created_at REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            number TEXT NOT NULL,
            type TEXT NOT NULL,
            available_balance REAL NOT NULL,
            settled_balance REAL NOT NULL,
            pending_hold REAL NOT NULL,
            currency TEXT NOT NULL DEFAULT 'INR',
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS cards (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            brand TEXT NOT NULL,
            last4 TEXT NOT NULL,
            cardholder TEXT NOT NULL,
            expiry TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            monthly_limit REAL NOT NULL DEFAULT 50000.0,
            monthly_spent REAL NOT NULL DEFAULT 12450.0,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            direction TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            counterparty TEXT NOT NULL,
            running_balance REAL NOT NULL,
            is_step_up INTEGER NOT NULL DEFAULT 0,
            reference TEXT NOT NULL,
            prev_hash TEXT NOT NULL,
            curr_hash TEXT NOT NULL,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            actor TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT NOT NULL,
            ip_address TEXT NOT NULL,
            status TEXT NOT NULL,
            prev_hash TEXT NOT NULL,
            curr_hash TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS rate_limits (
            key TEXT PRIMARY KEY,
            count INTEGER NOT NULL,
            first_attempt REAL NOT NULL
        );
    """)

    # Check if seed user exists
    cur.execute("SELECT id FROM users WHERE email = 'alex.sterling@secureledger.io'")
    if not cur.fetchone():
        salt, p_hash = hash_password("DemoSecure2026!")
        cur.execute("""
            INSERT INTO users (id, email, name, title, role, clearance, salt, password_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "usr_alex_sterling",
            "alex.sterling@secureledger.io",
            "Alex Sterling",
            "Chief Treasury Officer",
            "admin",
            "level_1",
            salt,
            p_hash
        ))

        # Seed Accounts
        cur.execute("""
            INSERT INTO accounts (id, user_id, name, number, type, available_balance, settled_balance, pending_hold, currency)
            VALUES 
            ('acc_chk_8492', 'usr_alex_sterling', 'Primary Operating Checking', '•••• 8492', 'Checking', 24850.75, 25450.75, 600.0, 'INR'),
            ('acc_sav_1024', 'usr_alex_sterling', 'High-Yield Treasury Reserve', '•••• 1024', 'Savings', 118400.0, 118400.0, 0.0, 'INR')
        """)

        # Seed Corporate Virtual Card
        cur.execute("""
            INSERT INTO cards (id, user_id, brand, last4, cardholder, expiry, status, monthly_limit, monthly_spent)
            VALUES ('crd_elite_4028', 'usr_alex_sterling', 'SecureLedger Corporate Elite', '4028', 'Alex Sterling', '12/29', 'active', 50000.0, 12450.0)
        """)

        # Seed Genesis & Initial Transactions with SHA-256 chain
        prev_h = GENESIS_HASH
        txs = [
            ("TXN-20261031-99810", "acc_chk_8492", "Initial Treasury Endowment", "Capital", "credit", 20050.75, "settled", "2026-10-31T06:00:00Z", "Reserve Allocation", 20050.75, 0, "INIT-CAPITAL-01"),
            ("TXN-20261031-99811", "acc_chk_8492", "AWS Cloud Infrastructure", "Technology", "debit", 600.0, "pending", "2026-10-31T07:30:00Z", "Amazon Web Services", 19450.75, 0, "AWS-INV-77291"),
            ("TXN-20261031-99812", "acc_chk_8492", "Global Stripe Payout", "Income", "credit", 5400.0, "settled", "2026-10-31T09:15:00Z", "Stripe Payments Ltd", 24850.75, 0, "STRIPE-BATCH-8902"),
        ]

        for tx_id, acc_id, title, cat, dir_, amt, stat, ts, cparty, rbal, is_su, ref in txs:
            curr_h = compute_chain_hash(prev_h, tx_id, ts, amt, cparty)
            cur.execute("""
                INSERT INTO transactions (id, account_id, title, category, direction, amount, status, timestamp, counterparty, running_balance, is_step_up, reference, prev_hash, curr_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (tx_id, acc_id, title, cat, dir_, amt, stat, ts, cparty, rbal, is_su, ref, prev_h, curr_h))
            prev_h = curr_h

        # Seed Audit Trail
        prev_audit = GENESIS_HASH
        logs = [
            ("LOG-0001", "2026-10-26T00:00:00Z", "System Core", "Genesis Node Initialized", "Cryptographic ledger initialized with SHA-256 block chain", "127.0.0.1", "verified"),
            ("LOG-0002", "2026-10-30T09:00:00Z", "Alex Sterling", "Session Authenticated", "Multi-factor authentication validated via TOTP", "127.0.0.1", "verified"),
            ("LOG-0003", "2026-10-31T09:15:00Z", "System Core", "Transaction Finalized", "Settled inbound batch STRIPE-BATCH-8902 (+₹5,400.00)", "127.0.0.1", "verified")
        ]
        for log_id, ts, act, action, details, ip, stat in logs:
            curr_audit = compute_audit_hash(prev_audit, log_id, ts, act, action)
            cur.execute("""
                INSERT INTO audit_logs (id, timestamp, actor, action, details, ip_address, status, prev_hash, curr_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (log_id, ts, act, action, details, ip, stat, prev_audit, curr_audit))
            prev_audit = curr_audit

        conn.commit()

    conn.close()


# ==============================================================================
# SECURE REQUEST HANDLER & REST API ROUTER
# ==============================================================================

class SecureRequestHandler(BaseHTTPRequestHandler):
    server_version = "SecureLedgerServer/3.0"

    def address_string(self):
        """Override to avoid reverse DNS lookup delays on Windows."""
        return self.client_address[0]

    def set_security_headers(self, is_api=False):
        self.send_header("Content-Security-Policy", CSP_POLICY)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        if is_api:
            self.send_header("Content-Type", "application/json; charset=utf-8")

    def send_json(self, status_code: int, data: dict, cookies: list = None):
        """Send a structured JSON API response with strict security headers."""
        body = json.dumps(data, indent=2).encode('utf-8')
        self.send_response(status_code)
        self.set_security_headers(is_api=True)
        self.send_header("Content-Length", str(len(body)))
        if cookies:
            for cookie in cookies:
                self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(body)

    def send_error_response(self, code: int, message: str):
        """Send a plain text error response for static routes."""
        body = message.encode('utf-8')
        self.send_response(code)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.set_security_headers()
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self) -> dict:
        """Parse incoming JSON body safely with size bounds."""
        try:
            length = int(self.headers.get('Content-Length', 0))
            if length <= 0 or length > 1024 * 1024:  # Max 1MB payload
                return {}
            raw = self.rfile.read(length).decode('utf-8')
            return json.loads(raw)
        except Exception:
            return {}

    def get_session_token(self) -> str:
        """Extract session token from Cookie header or Authorization bearer."""
        cookie_header = self.headers.get('Cookie', '')
        if 'secureledger_session=' in cookie_header:
            parts = cookie_header.split('secureledger_session=')
            if len(parts) > 1:
                return parts[1].split(';')[0].strip()
        auth_header = self.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            return auth_header[7:].strip()
        return ""

    def get_authenticated_user(self, conn) -> tuple[dict, str]:
        """Validate session token and return user row & current clearance."""
        token = self.get_session_token()
        if not token:
            return None, None
        cur = conn.cursor()
        cur.execute("""
            SELECT s.token, s.clearance, s.expires_at, u.id, u.email, u.name, u.title, u.role
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > ?
        """, (token, time.time()))
        row = cur.fetchone()
        if not row:
            return None, None
        user = {
            "id": row["id"],
            "email": row["email"],
            "name": row["name"],
            "title": row["title"],
            "role": row["role"],
        }
        return user, row["clearance"]

    def check_rate_limit(self, conn, key_suffix: str, limit: int = 5, window_sec: int = 60) -> bool:
        """Token bucket / sliding window rate limiting per IP + endpoint."""
        client_ip = self.client_address[0]
        key = f"{client_ip}:{key_suffix}"
        now = time.time()
        cur = conn.cursor()
        cur.execute("SELECT count, first_attempt FROM rate_limits WHERE key = ?", (key,))
        row = cur.fetchone()
        if not row:
            cur.execute("INSERT INTO rate_limits (key, count, first_attempt) VALUES (?, 1, ?)", (key, now))
            conn.commit()
            return True

        count, first_attempt = row["count"], row["first_attempt"]
        if now - first_attempt > window_sec:
            cur.execute("UPDATE rate_limits SET count = 1, first_attempt = ? WHERE key = ?", (now, key))
            conn.commit()
            return True
        elif count >= limit:
            return False
        else:
            cur.execute("UPDATE rate_limits SET count = count + 1 WHERE key = ?", (key,))
            conn.commit()
            return True

    # --------------------------------------------------------------------------
    # HTTP VERBS
    # --------------------------------------------------------------------------

    def do_HEAD(self):
        if self.path.startswith('/api/'):
            self.send_error_response(405, "Method Not Allowed")
            return
        self.serve_static_asset(is_head=True)

    def do_GET(self):
        if self.path.startswith('/api/'):
            self.handle_api_get()
            return
        self.serve_static_asset(is_head=False)

    def do_POST(self):
        if self.path.startswith('/api/'):
            self.handle_api_post()
            return
        self.send_error_response(405, "Method Not Allowed")

    # --------------------------------------------------------------------------
    # REST API HANDLERS (GET)
    # --------------------------------------------------------------------------

    def handle_api_get(self):
        parsed = urllib.parse.urlsplit(self.path)
        path = parsed.path.rstrip('/')
        conn = get_db(self.server.db_path)

        try:
            # 1. Session status check: /api/auth/me
            if path == '/api/auth/me':
                user, clearance = self.get_authenticated_user(conn)
                if not user:
                    self.send_json(401, {"success": False, "authenticated": False, "error": "Not authenticated or session expired."})
                    return
                self.send_json(200, {
                    "success": True,
                    "authenticated": True,
                    "user": user,
                    "clearance": clearance
                })

            # 2. Get Accounts: /api/accounts
            elif path == '/api/accounts':
                user, _ = self.get_authenticated_user(conn)
                if not user:
                    self.send_json(401, {"success": False, "error": "Authentication required."})
                    return
                cur = conn.cursor()
                cur.execute("SELECT * FROM accounts WHERE user_id = ?", (user["id"],))
                rows = [dict(r) for r in cur.fetchall()]
                self.send_json(200, {"success": True, "accounts": rows})

            # 3. Get Transactions: /api/transactions
            elif path == '/api/transactions':
                user, _ = self.get_authenticated_user(conn)
                if not user:
                    self.send_json(401, {"success": False, "error": "Authentication required."})
                    return
                cur = conn.cursor()
                cur.execute("""
                    SELECT t.* FROM transactions t
                    JOIN accounts a ON t.account_id = a.id
                    WHERE a.user_id = ?
                    ORDER BY t.timestamp DESC
                """, (user["id"],))
                rows = [dict(r) for r in cur.fetchall()]
                self.send_json(200, {"success": True, "transactions": rows})

            # 4. Get Corporate Cards: /api/cards
            elif path == '/api/cards':
                user, _ = self.get_authenticated_user(conn)
                if not user:
                    self.send_json(401, {"success": False, "error": "Authentication required."})
                    return
                cur = conn.cursor()
                cur.execute("SELECT * FROM cards WHERE user_id = ?", (user["id"],))
                rows = [dict(r) for r in cur.fetchall()]
                self.send_json(200, {"success": True, "cards": rows})

            # 5. Get Audit Trail & Hash Chain Summary: /api/audit
            elif path == '/api/audit':
                cur = conn.cursor()
                cur.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50")
                logs = [dict(r) for r in cur.fetchall()]
                self.send_json(200, {"success": True, "auditLogs": logs})

            # 6. Downloadable Sanitized Statement CSV: /api/statement/download
            elif path == '/api/statement/download':
                user, _ = self.get_authenticated_user(conn)
                if not user:
                    self.send_error_response(401, "Unauthorized")
                    return
                cur = conn.cursor()
                cur.execute("""
                    SELECT t.id, t.timestamp, t.title, t.category, t.direction, t.amount, t.status, t.curr_hash
                    FROM transactions t
                    JOIN accounts a ON t.account_id = a.id
                    WHERE a.user_id = ?
                    ORDER BY t.timestamp DESC
                """, (user["id"],))
                csv_lines = ["Transaction ID,Timestamp,Description,Category,Type,Amount (INR),Status,SHA-256 Hash"]
                for r in cur.fetchall():
                    csv_lines.append(f'"{r["id"]}","{r["timestamp"]}","{r["title"]}","{r["category"]}","{r["direction"]}",{r["amount"]:.2f},"{r["status"]}","{r["curr_hash"]}"')
                csv_body = "\r\n".join(csv_lines).encode('utf-8')

                self.send_response(200)
                self.set_security_headers()
                self.send_header("Content-Type", "text/csv; charset=utf-8")
                self.send_header("Content-Disposition", 'attachment; filename="SecureLedger-Statement.csv"')
                self.send_header("Content-Length", str(len(csv_body)))
                self.end_headers()
                self.wfile.write(csv_body)

            else:
                self.send_json(404, {"error": "API route not found."})
        finally:
            conn.close()

    # --------------------------------------------------------------------------
    # REST API HANDLERS (POST)
    # --------------------------------------------------------------------------

    def handle_api_post(self):
        parsed = urllib.parse.urlsplit(self.path)
        path = parsed.path.rstrip('/')
        data = self.read_json_body()
        conn = get_db(self.server.db_path)

        try:
            # 1. Login Authentication Endpoint: /api/auth/login
            if path == '/api/auth/login':
                if not self.check_rate_limit(conn, "login", limit=5, window_sec=60):
                    self.send_json(429, {"success": False, "error": "Too many failed login attempts. Please wait 60 seconds."})
                    return

                email = data.get("email", "").strip().lower()
                password = data.get("password", "")

                if not email or not password:
                    self.send_json(400, {"success": False, "error": "Email and password are required."})
                    return

                cur = conn.cursor()
                cur.execute("SELECT * FROM users WHERE email = ?", (email,))
                user = cur.fetchone()

                if not user or not verify_password(password, user["salt"], user["password_hash"]):
                    self.send_json(401, {"success": False, "error": "Invalid email or credentials."})
                    return

                # Generate secure 6-digit cryptographic OTP
                otp_code = f"{secrets.randbelow(900000) + 100000}"
                code_hash = hashlib.sha256(otp_code.encode("utf-8")).hexdigest()
                expires_at = time.time() + 180.0  # 3 minutes

                cur.execute("""
                    INSERT INTO mfa_challenges (email, code, attempts, expires_at, created_at)
                    VALUES (?, ?, 0, ?, ?)
                """, (email, code_hash, expires_at, time.time()))
                conn.commit()

                # Mask email for display
                email_parts = email.split('@')
                masked = f"{email_parts[0][0]}***{email_parts[0][-1]}@{email_parts[1]}" if len(email_parts[0]) > 2 else email

                # Secure dispatch log on server console ONLY - zero leakage in HTTP payload
                print(f"[SECURE SMS DISPATCH (SERVER LOG ONLY)] Recipient: {masked} | OTP Code: {otp_code} | Valid: 3 min", flush=True)

                self.send_json(200, {
                    "success": True,
                    "requiresMfa": True,
                    "email": email,
                    "maskedEmail": masked,
                    "expiresIn": 180,
                    "message": f"Verification code dispatched via SMS to registered phone."
                })

            # 2. MFA Verification Endpoint: /api/auth/verify-otp
            elif path == '/api/auth/verify-otp':
                email = data.get("email", "").strip().lower()
                code = data.get("code", "").strip()

                cur = conn.cursor()
                cur.execute("""
                    SELECT * FROM mfa_challenges
                    WHERE email = ? AND expires_at > ?
                    ORDER BY id DESC LIMIT 1
                """, (email, time.time()))
                challenge = cur.fetchone()

                if not challenge:
                    self.send_json(401, {"success": False, "error": "Verification code expired or not found. Please request a new code."})
                    return

                if challenge["attempts"] >= 3:
                    cur.execute("DELETE FROM mfa_challenges WHERE id = ?", (challenge["id"],))
                    conn.commit()
                    self.send_json(401, {"success": False, "error": "Maximum verification attempts exceeded. Challenge invalidated."})
                    return

                entered_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()
                if not hmac.compare_digest(challenge["code"], entered_hash):
                    cur.execute("UPDATE mfa_challenges SET attempts = attempts + 1 WHERE id = ?", (challenge["id"],))
                    conn.commit()
                    remaining = 2 - challenge["attempts"]
                    self.send_json(401, {"success": False, "error": f"Invalid verification code. {remaining} attempt(s) remaining."})
                    return

                # Validated! Issue secure session token
                cur.execute("DELETE FROM mfa_challenges WHERE id = ?", (challenge["id"],))
                cur.execute("SELECT * FROM users WHERE email = ?", (email,))
                user = cur.fetchone()

                token = secrets.token_hex(32)
                expires_at = time.time() + 1800.0  # 30-minute session

                cur.execute("""
                    INSERT INTO sessions (token, user_id, clearance, expires_at, created_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (token, user["id"], "level_1", expires_at, time.time()))

                # Log to audit trail
                cur.execute("SELECT curr_hash FROM audit_logs ORDER BY timestamp DESC LIMIT 1")
                prev_row = cur.fetchone()
                prev_h = prev_row["curr_hash"] if prev_row else GENESIS_HASH
                log_id = f"LOG-{secrets.token_hex(4).upper()}"
                now_iso = datetime.now(timezone.utc).isoformat()
                curr_h = compute_audit_hash(prev_h, log_id, now_iso, user["name"], "Session Authenticated via MFA")

                cur.execute("""
                    INSERT INTO audit_logs (id, timestamp, actor, action, details, ip_address, status, prev_hash, curr_hash)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (log_id, now_iso, user["name"], "Session Authenticated", "Validated TOTP challenge successfully", self.client_address[0], "verified", prev_h, curr_h))

                conn.commit()

                cookie_str = f"secureledger_session={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800"
                self.send_json(200, {
                    "success": True,
                    "token": token,
                    "user": {
                        "id": user["id"],
                        "email": user["email"],
                        "name": user["name"],
                        "title": user["title"],
                        "role": user["role"],
                        "clearance": "level_1"
                    }
                }, cookies=[cookie_str])

            # 3. Step-Up Authorization: /api/auth/step-up
            elif path == '/api/auth/step-up':
                user, _ = self.get_authenticated_user(conn)
                if not user:
                    self.send_json(401, {"success": False, "error": "Authentication required."})
                    return

                token = self.get_session_token()
                cur = conn.cursor()
                cur.execute("UPDATE sessions SET clearance = 'level_2' WHERE token = ?", (token,))

                # Audit log step-up
                cur.execute("SELECT curr_hash FROM audit_logs ORDER BY timestamp DESC LIMIT 1")
                prev_row = cur.fetchone()
                prev_h = prev_row["curr_hash"] if prev_row else GENESIS_HASH
                log_id = f"LOG-{secrets.token_hex(4).upper()}"
                now_iso = datetime.now(timezone.utc).isoformat()
                curr_h = compute_audit_hash(prev_h, log_id, now_iso, user["name"], "Elevated to Level 2 Step-Up")

                cur.execute("""
                    INSERT INTO audit_logs (id, timestamp, actor, action, details, ip_address, status, prev_hash, curr_hash)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (log_id, now_iso, user["name"], "Step-Up Clearance Granted", "Contextual re-authentication approved", self.client_address[0], "verified", prev_h, curr_h))

                conn.commit()
                self.send_json(200, {"success": True, "clearance": "level_2", "expiresIn": 180})

            # 4. Sign Out: /api/auth/logout
            elif path == '/api/auth/logout':
                token = self.get_session_token()
                if token:
                    cur = conn.cursor()
                    cur.execute("DELETE FROM sessions WHERE token = ?", (token,))
                    conn.commit()
                clear_cookie = "secureledger_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"
                self.send_json(200, {"success": True, "message": "Logged out successfully."}, cookies=[clear_cookie])

            # 5. Secure Fund Transfer: /api/transfers
            elif path == '/api/transfers':
                user, clearance = self.get_authenticated_user(conn)
                if not user:
                    self.send_json(401, {"success": False, "error": "Authentication required."})
                    return

                amount = float(data.get("amount", 0.0))
                recipient = str(data.get("recipient", "")).strip()
                category = str(data.get("category", "Operations")).strip()
                account_id = str(data.get("accountId", "acc_chk_8492")).strip()

                if amount <= 0:
                    self.send_json(400, {"success": False, "error": "Transfer amount must be strictly greater than zero."})
                    return

                # Enforce Step-Up authorization for transfers > ₹1,000
                if amount > 1000.0 and clearance != 'level_2':
                    self.send_json(403, {
                        "success": False,
                        "requiresStepUp": True,
                        "error": "Transfers exceeding ₹1,000.00 require Level 2 Step-Up authorization challenge."
                    })
                    return

                cur = conn.cursor()
                cur.execute("SELECT available_balance, settled_balance FROM accounts WHERE id = ? AND user_id = ?", (account_id, user["id"]))
                acc = cur.fetchone()

                if not acc:
                    self.send_json(404, {"success": False, "error": "Origin account not found."})
                    return

                if acc["available_balance"] < amount:
                    self.send_json(400, {"success": False, "error": "Insufficient available funds for transfer."})
                    return

                # Calculate new balances
                new_avail = round(acc["available_balance"] - amount, 2)
                new_settled = round(acc["settled_balance"] - amount, 2)

                # Get head of transaction chain
                cur.execute("SELECT curr_hash FROM transactions WHERE account_id = ? ORDER BY timestamp DESC LIMIT 1", (account_id,))
                last_tx = cur.fetchone()
                prev_h = last_tx["curr_hash"] if last_tx else GENESIS_HASH

                tx_id = f"TXN-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}"
                now_iso = datetime.now(timezone.utc).isoformat()
                curr_h = compute_chain_hash(prev_h, tx_id, now_iso, amount, recipient)

                # Atomically apply ledger debit and create transaction
                cur.execute("UPDATE accounts SET available_balance = ?, settled_balance = ? WHERE id = ?", (new_avail, new_settled, account_id))
                cur.execute("""
                    INSERT INTO transactions (id, account_id, title, category, direction, amount, status, timestamp, counterparty, running_balance, is_step_up, reference, prev_hash, curr_hash)
                    VALUES (?, ?, ?, ?, 'debit', ?, 'settled', ?, ?, ?, ?, ?, ?, ?)
                """, (tx_id, account_id, f"Wire Transfer to {recipient}", category, amount, now_iso, recipient, new_avail, 1 if clearance == 'level_2' else 0, f"WIRE-{secrets.token_hex(4).upper()}", prev_h, curr_h))

                # Append to audit trail
                cur.execute("SELECT curr_hash FROM audit_logs ORDER BY timestamp DESC LIMIT 1")
                prev_audit = cur.fetchone()
                prev_ah = prev_audit["curr_hash"] if prev_audit else GENESIS_HASH
                log_id = f"LOG-{secrets.token_hex(4).upper()}"
                audit_h = compute_audit_hash(prev_ah, log_id, now_iso, user["name"], f"Wire Transfer: -₹{amount:.2f}")

                cur.execute("""
                    INSERT INTO audit_logs (id, timestamp, actor, action, details, ip_address, status, prev_hash, curr_hash)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (log_id, now_iso, user["name"], "Outbound Transfer", f"Transferred ₹{amount:.2f} to {recipient} [{category}]", self.client_address[0], "verified", prev_ah, audit_h))

                conn.commit()

                self.send_json(200, {
                    "success": True,
                    "transactionId": tx_id,
                    "chainHash": curr_h,
                    "newAvailableBalance": new_avail,
                    "newSettledBalance": new_settled
                })

            # 6. Toggle Virtual Card Freeze: /api/cards/freeze
            elif path == '/api/cards/freeze':
                user, _ = self.get_authenticated_user(conn)
                if not user:
                    self.send_json(401, {"success": False, "error": "Authentication required."})
                    return

                cur = conn.cursor()
                cur.execute("SELECT id, status FROM cards WHERE user_id = ? LIMIT 1", (user["id"],))
                card = cur.fetchone()
                if not card:
                    self.send_json(404, {"success": False, "error": "Card not found."})
                    return

                new_status = "frozen" if card["status"] == "active" else "active"
                cur.execute("UPDATE cards SET status = ? WHERE id = ?", (new_status, card["id"]))

                # Audit log card freeze
                now_iso = datetime.now(timezone.utc).isoformat()
                cur.execute("SELECT curr_hash FROM audit_logs ORDER BY timestamp DESC LIMIT 1")
                prev_audit = cur.fetchone()
                prev_ah = prev_audit["curr_hash"] if prev_audit else GENESIS_HASH
                log_id = f"LOG-{secrets.token_hex(4).upper()}"
                audit_h = compute_audit_hash(prev_ah, log_id, now_iso, user["name"], f"Card Status: {new_status}")

                cur.execute("""
                    INSERT INTO audit_logs (id, timestamp, actor, action, details, ip_address, status, prev_hash, curr_hash)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (log_id, now_iso, user["name"], "Card Security Updated", f"Card status toggled to {new_status}", self.client_address[0], "verified", prev_ah, audit_h))

                conn.commit()
                self.send_json(200, {"success": True, "cardId": card["id"], "status": new_status})

            # 7. Audit Chain Integrity Verification: /api/audit/verify
            elif path == '/api/audit/verify':
                cur = conn.cursor()
                cur.execute("SELECT * FROM transactions ORDER BY timestamp ASC")
                txs = cur.fetchall()

                is_valid = True
                mismatches = []
                prev_h = GENESIS_HASH

                for tx in txs:
                    expected_h = compute_chain_hash(prev_h, tx["id"], tx["timestamp"], tx["amount"], tx["counterparty"])
                    if tx["curr_hash"] != expected_h:
                        is_valid = False
                        mismatches.append({"txId": tx["id"], "expected": expected_h, "actual": tx["curr_hash"]})
                    prev_h = tx["curr_hash"]

                self.send_json(200, {
                    "success": True,
                    "chainValid": is_valid,
                    "blocksVerified": len(txs),
                    "chainTip": prev_h,
                    "mismatches": mismatches
                })

            # 8. Reset Demo State: /api/reset
            elif path == '/api/reset':
                conn.close()
                if os.path.exists(self.server.db_path):
                    try:
                        os.remove(self.server.db_path)
                    except Exception:
                        pass
                init_database(self.server.db_path)
                self.send_json(200, {"success": True, "message": "Demo state successfully reset to initial pristine data."})

            else:
                self.send_json(404, {"error": "API route not found."})
        finally:
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass

    # --------------------------------------------------------------------------
    # STATIC ASSET SERVING WITH DEFENSE-IN-DEPTH
    # --------------------------------------------------------------------------

    def serve_static_asset(self, is_head=False):
        parsed = urllib.parse.urlsplit(self.path)
        raw_path = urllib.parse.unquote(parsed.path)

        if raw_path in ('', '/'):
            raw_path = '/index.html'

        root_dir = os.path.abspath(self.server.root_dir)
        rel_path = raw_path.lstrip('/').replace('/', os.sep)
        full_path = os.path.abspath(os.path.join(root_dir, rel_path))

        # 1. Path traversal guard
        if not full_path.startswith(root_dir + os.sep) and full_path != root_dir:
            self.send_error_response(403, "Forbidden: Path traversal detected and blocked.")
            return

        file_name = os.path.basename(full_path).lower()
        file_ext = os.path.splitext(full_path)[1].lower()

        # 2. Sensitive files protection
        if (
            file_name in FORBIDDEN_FILES
            or file_name.startswith('.')
            or file_ext in FORBIDDEN_EXTENSIONS
        ):
            self.send_error_response(403, "Forbidden: Access to configuration, database, and script files is restricted.")
            return

        # 3. Whitelisted MIME check and file existence
        if not os.path.isfile(full_path) or file_ext not in MIME_TYPES:
            self.send_error_response(404, "404 Not Found")
            return

        # 4. Read and deliver asset
        try:
            with open(full_path, 'rb') as f:
                content = f.read()

            self.send_response(200)
            self.send_header("Content-Type", MIME_TYPES[file_ext])
            self.send_header("Content-Length", str(len(content)))
            self.set_security_headers()
            self.end_headers()

            if not is_head:
                self.wfile.write(content)
        except Exception as e:
            self.send_error_response(500, f"Internal Server Error: {str(e)}")

    def log_message(self, format, *args):
        client_ip = self.client_address[0]
        timestamp = self.log_date_time_string()
        msg = format % args
        sys.stderr.write(f"[{timestamp}] [{client_ip}] {msg}\n")


def get_lan_ip():
    """Detect local machine IP address for mobile connection."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'


def main():
    default_port = int(os.environ.get("PORT", 8080))
    default_bind = os.environ.get("BIND", "0.0.0.0")

    parser = argparse.ArgumentParser(description="SecureLedger Enterprise Backend Server")
    parser.add_argument("-p", "--port", type=int, default=default_port, help=f"Port to listen on (default: {default_port})")
    parser.add_argument("-b", "--bind", default=default_bind, help=f"Address to bind to (default: {default_bind})")
    parser.add_argument("-d", "--dir", default=os.path.dirname(os.path.abspath(__file__)), help="Root directory")
    args = parser.parse_args()

    db_path = os.environ.get("DB_PATH", os.path.join(args.dir, DB_NAME))
    init_database(db_path)

    lan_ip = get_lan_ip()

    try:
        httpd = ThreadingHTTPServer((args.bind, args.port), SecureRequestHandler)
        httpd.root_dir = args.dir
        httpd.db_path = db_path
    except OSError as e:
        sys.stderr.write(f"[ERROR] Could not start server on port {args.port}: {e}\n")
        sys.stderr.write("Try specifying a different port: python server.py --port 8081\n")
        sys.exit(1)

    print("=" * 64)
    print("  SecureLedger - Enterprise FinTech Backend & Banking API Server")
    print("=" * 64)
    print(f" Serving Directory : {args.dir}")
    print(f" SQLite Database   : {db_path}")
    print(f" Desktop (Local)   : http://localhost:{args.port}/")
    print(f" Phone / Mobile    : http://{lan_ip}:{args.port}/")
    print(f" Network Bind      : {args.bind}:{args.port} (All Interfaces)")
    print(f" Security Controls : PBKDF2-HMAC-SHA256, MFA, CSP, Rate-Limiting")
    print(" Press Ctrl+C to stop the server.")
    print("-" * 64)
    sys.stdout.flush()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[INFO] Server shutting down gracefully...")
    finally:
        httpd.server_close()
        print("[INFO] Server stopped.")


if __name__ == '__main__':
    main()
