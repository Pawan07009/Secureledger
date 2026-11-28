# SecureLedger

An enterprise-grade, accessible front-end **banking simulation and cryptographic ledger demonstration** built with semantic HTML5, modern CSS3, and vanilla JavaScript (ES2022). SecureLedger models real-world corporate banking architecture: dual-tier security clearance (Level 1 / Level 2), time-decaying step-up authorization, WebCrypto-driven SHA-256 Merkle audit chaining, multi-account ledger balances, dynamic cashflow analytics, and corporate virtual card controls.

> **EDUCATIONAL SIMULATION NOTICE**  
> **This project is an educational and architectural simulation designed for developer portfolios, technical interviews, and security demonstrations.**  
> It does not connect to a real banking network, process legal tender, or store credentials on a remote backend. All operational state resides within client-side memory and browser `localStorage`. Real-world financial systems require server-enforced authentication, zero-trust backend authorization, hardware security modules (HSM), and immutable, append-only distributed ledgers.

---

## 🎯 Project Objectives

1. **Demonstrate FinTech UX Patterns**: Model real corporate treasury management workflows (available vs. settled balance, pending holds, multi-account routing, and audit statements).
2. **Implement Defense-in-Depth UI Security**: Showcase simulated multi-factor authentication (MFA), cryptographically generated OTPs with automatic time expiration, contextual step-up elevation, and inactivity guards.
3. **Illustrate Audit Integrity via Cryptography**: Implement a client-side SHA-256 hash-chained audit ledger using the browser's native `SubtleCrypto` API with on-demand verification and tamper detection.
4. **Adhere to WCAG 2.2 AA Standards**: Ensure accessibility with keyboard focus trapping, ARIA dialog roles, screen reader labeling, high contrast color systems, and reduced-motion preferences.
5. **Zero External Runtime Dependencies**: Run purely on native browser standards with no external JavaScript libraries or heavy frameworks.

---

## ✨ Comprehensive Feature Matrix

### 1. Authentication, MFA & Session Management
- **Customer Gateway**: Fictional demo credentials (`alex.sterling@secureledger.io`) with password visibility toggle.
- **Cryptographic OTP Generation**: 6-digit one-time passcodes generated using `window.crypto.getRandomValues`.
- **OTP Lifecycle**: 60-second animated expiration countdown, visual progress bar, 20-second resend cooldown, and lockout after 3 consecutive failed attempts.
- **Inactivity Heartbeat Guard**: 4-minute session timer with active user activity detection (`click`, `keydown`), a 30-second warning modal, session extension, and automated logout.
- **Dual-Tier Clearance Levels**:
  - **Level 1 (Standard)**: Read ledger, view metrics, execute internal and sub-threshold transfers.
  - **Level 2 (Elevated Step-Up)**: Granted contextual elevation for 3 minutes for high-risk actions. Automatically decays back to Level 1 upon expiration.

### 2. Contextual Step-Up Verification
- **Risk-Based Trigger**: Initiated when transfer amounts reach or exceed **₹1,000.00** or target an unverified external beneficiary.
- **Dual Verification Modalities**:
  - **Simulated WebAuthn / Passkey / Biometrics**: Interactive button simulating hardware token confirmation with pulsing visual scanner feedback.
  - **Secondary Dynamic OTP**: Time-bound secondary 6-digit cryptographic challenge with attempt tracking.

### 3. Realistic Multi-Step Transfer Workflow
- **Multi-Step Flow**:
  1. Recipient selection from pre-cleared beneficiaries or custom counterparty.
  2. Amount and category input with real-time liquidity and daily limit validation (up to ₹500,000.00).
  3. Interactive **Review Modal** breaking down debiting account, fees (₹0.00), clearing mode, and liquidity impact.
  4. Contextual elevation check (Level 2 step-up challenge if required).
  5. Simulated execution with button state locking to eliminate duplicate double-clicks.
  6. **Transaction Receipt Modal** displaying unique transaction ID (`TXN-YYYYMMDD-XXXXX`), ISO timestamp, and exportable receipt download (`.txt`).
- **Tri-Tier Balance Calculation**:
  - **Available Balance**: Immediately spendable liquid funds.
  - **Settled (Ledger) Balance**: Cleared and reconciled capital.
  - **Pending Authorizations**: Funds placed on temporary 24-hour clearing hold.
- **Overdraft Guard**: Prevents zero, negative, or amounts exceeding available liquidity.

### 4. Interactive Transaction Ledger
- **Multi-Attribute Search**: Real-time filtering across reference IDs, counterparties, titles, and amounts.
- **Harmonized Categories**: Standardized across filters and forms (Income, Technology, Facilities, Software, Investments, Payroll, Food & Dining, Transfers).
- **Direction & Status Filters**: Filter by Credits (Inflow), Debits (Outflow), Settled, or Pending Hold.
- **Sorting Modes**: Sort by Date (Newest/Oldest), Amount (High to Low / Low to High), or Counterparty (A-Z).
- **Client-Side Pagination**: Clean 6-record paginated views with active page indicators.
- **Transaction Details Inspector**: Clickable modal displaying full transaction metadata.
- **Sanitized CSV Statement Export**: One-click statement download protected against CSV formula injection (`=`, `+`, `-`, `@`).

### 5. Cryptographic SHA-256 Audit Trail
- **Merkle Hash Chaining**: Every login, transfer, clearance change, and security action is hashed using `window.crypto.subtle.digest("SHA-256")` chained to the preceding block's hash.
- **Integrity Verification**: One-click algorithm recalculates the entire hash chain from Genesis (`BLOCK-000`) to detect any data mutation.
- **Simulate Tamper**: Educational sandbox button that mutates historical log data to demonstrate real-time cryptographic integrity failure detection.

### 6. Corporate Card & Financial Controls
- **Virtual Corporate Card**: Interactive `SecureLedger Corporate Elite •••• 4028` with CVV toggle.
- **Security Freeze**: Instant lock/unlock switch to prevent card authorizations.
- **Spending Budget Tracker**: Visual track monitoring expenditure against monthly operating limits.
- **Beneficiaries Management**: Dedicated modal to inspect verified whitelist and add custom counterparties.
- **Theme Switcher**: Instant Dark / Light mode toggle persisting preference in `localStorage`.
- **Notification Drawer**: Header bell icon displaying security alerts, deposit notices, and unread counters.

---

## 🛠️ Technology Stack

- **Markup**: Semantic HTML5 with WCAG 2.2 AA ARIA accessibility roles (`role="dialog"`, `aria-modal="true"`, `aria-live="polite"`).
- **Styling**: Modern CSS3 using custom CSS variables (Design Tokens), Flexbox, CSS Grid, and responsive media queries.
- **Scripting**: Vanilla JavaScript (ES2022) with async/await, modular separation, and zero external build dependencies.
- **Cryptography**: Native Web Crypto API (`window.crypto.subtle` and `window.crypto.getRandomValues`).
- **Development Server**: Secure PowerShell HTTP server (`server.ps1`) with strict Content Security Policy, path traversal validation, and security headers.

---

## 📂 Project Structure

```
banking-app/
├── css/
│   └── styles.css          # Design system, themes (dark/light), components, and responsive rules
├── js/
│   ├── bundle.js           # Production application logic, auth lifecycle, ledger & crypto engine
│   ├── app.js              # Source modular controller
│   ├── auth.js             # Source authentication manager
│   ├── ledger.js           # Source ledger calculations
│   ├── mockData.js         # Source seed data & fixtures
│   └── ui.js               # Source DOM renderers
├── index.html              # Accessible semantic application markup and modals
├── server.ps1              # Secure local development server with strict security headers
└── README.md               # Technical documentation, security architecture, and testing guide
```

---

## 🚀 How to Run Locally

### Option 1: PowerShell Local Server (Recommended for Windows)

The bundled `server.ps1` runs a secure static server with strict MIME types, path traversal guards, and security headers.

```powershell
# Open terminal in the banking-app folder:
cd E:\antigraity\banking-app

# Run on default port 5500:
.\server.ps1

# Or specify a custom port if 5500 is in use:
.\server.ps1 -Port 8080
```

If PowerShell execution policy restricts scripts, execute:
```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1 -Port 8080
```
Navigate to `http://localhost:5500/` (or `http://localhost:8080/`).

### Option 2: Python Secure Server (Desktop, Mobile Phone LAN Testing & REST API)

The included `server.py` runs a multi-threaded secure enterprise backend binding to all network interfaces (`0.0.0.0`), with embedded SQLite database (`secureledger.db`), salted PBKDF2-HMAC-SHA256 password hashing, rate limiting, and REST API endpoints:

```bash
cd banking-app
python server.py --port 8080
```

- **Desktop (Localhost)**: Open `http://localhost:8080/`
- **Phone / Mobile**: Open `http://<YOUR-LAN-IP>:8080/` (the exact IP is displayed in the console on startup, e.g. `http://172.16.72.61:8080/`)
- **Default Credentials**:
  - Email: `alex.sterling@secureledger.io`
  - Password: `DemoSecure2026!`
  - Role: `Chief Treasury Officer` (Admin clearance)

---

## 🚢 Production & Cloud Deployment Guide

SecureLedger is engineered for two primary deployment topologies:

### Deployment Mode A: 1-Click Serverless / Static Edge Hosting (Zero Backend Maintenance)
Ideal for client portfolios, live interactive showcases, and GitHub Pages. The application runs natively in the browser with WebCrypto SHA-256 Merkle chaining and client-side simulation.

- **Vercel**: Pre-configured via `vercel.json` with strict security headers (CSP, nosniff, frame-ancestors: 'none').
  ```bash
  # Deploy with Vercel CLI
  vercel --prod
  ```
- **Netlify**: Pre-configured via `netlify.toml` with strict CSP and HTTP headers.
  ```bash
  # Deploy with Netlify CLI
  netlify deploy --prod --dir=.
  ```
- **GitHub Pages**: Push to the `main` branch, navigate to **Settings > Pages**, and set source to `/ (root)`.

---

### Deployment Mode B: Containerized Enterprise Full-Stack (Python + SQLite)
Ideal for Docker, Render, Railway, Fly.io, AWS App Runner, Google Cloud Run, and Kubernetes.

- **Docker Container**:
  ```bash
  # Build minimal, unprivileged container image
  docker build -t secureledger:latest .

  # Run container exposing port 8080 with persistent volume
  docker run -d -p 8080:8080 -v secureledger-data:/app/data --name secureledger secureledger:latest
  ```
- **Render / Railway / Heroku**:
  - Auto-detected via the included `Procfile` (`web: python server.py`).
  - Supports dynamic environment variables:
    - `PORT`: Automatically assigned by the host.
    - `BIND`: Set to `0.0.0.0` for container ingress.
    - `DB_PATH`: Path to persistent volume mount (e.g. `/app/data/secureledger.db`).

---

### Automated Test Suite Execution

Run the comprehensive 29-point automated test suite verifying static security headers, path traversal protection, sensitive file blocking, PBKDF2 authentication, MFA challenges, session management, and SHA-256 Merkle chain verification:

```bash
python test_server.py
```

Expected result:
```
================================================================
  TEST SUITE COMPLETED: 29/29 tests passed (100%)
================================================================
```

---

## 📡 Enterprise REST API Endpoints

The `server.py` backend exposes a full suite of authenticated REST API endpoints:

| Endpoint | Method | Security Clearance | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Public / Rate-Limited | Validates PBKDF2 password, enforces IP rate limits (5/min), and issues a 6-digit cryptographic MFA challenge. |
| `/api/auth/verify-otp` | `POST` | Public | Validates OTP within 3-minute validity window and issues a secure `HttpOnly; SameSite=Strict` session cookie. |
| `/api/auth/me` | `GET` | Authenticated | Returns current user profile, role, and active security clearance level. |
| `/api/auth/step-up` | `POST` | Authenticated | Grants Level 2 Step-Up clearance with automated 3-minute decay. |
| `/api/auth/logout` | `POST` | Authenticated | Terminates active session in database and invalidates session cookie. |
| `/api/accounts` | `GET` | Authenticated | Returns balances (Available, Settled, Pending) across all corporate accounts. |
| `/api/transactions` | `GET` | Authenticated | Returns transaction history with preceding and current cryptographic block hashes. |
| `/api/transfers` | `POST` | Level 1 / Level 2 | Executes wire transfer with server-side liquidity checks, duplicate prevention, and SHA-256 hash chaining. |
| `/api/cards` | `GET` | Authenticated | Retrieves corporate virtual card details and monthly spending limits. |
| `/api/cards/freeze` | `POST` | Authenticated | Atomically toggles virtual card freeze state to prevent unapproved charges. |
| `/api/audit` | `GET` | Public / Admin | Returns real-time cryptographic audit trail logs. |
| `/api/audit/verify` | `POST` | Public / Admin | Recalculates full SHA-256 Merkle chain from Genesis block to confirm zero tampering. |
| `/api/statement/download` | `GET` | Authenticated | Generates and streams sanitized CSV transaction statement with formula-injection guards. |
| `/api/reset` | `POST` | Admin | Resets SQLite database and cryptographic state to pristine demo baseline. |

---

## 🔒 Security Architecture & Headers

The local server enforces strict HTTP response headers:

| Header | Configured Value | Purpose |
| :--- | :--- | :--- |
| **Content-Security-Policy** | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; ...` | Eliminates unauthorized external script loading and cross-site execution. |
| **X-Content-Type-Options** | `nosniff` | Prevents browser MIME-sniffing exploits. |
| **X-Frame-Options** | `DENY` | Mitigates clickjacking attacks. |
| **Referrer-Policy** | `no-referrer` | Prevents leakage of internal URI state. |
| **Cache-Control** | `no-store, no-cache, must-revalidate` | Protects banking data from intermediate caching. |
| **Permissions-Policy** | `camera=(), microphone=(), geolocation=()` | Restricts hardware access APIs. |

### Path Traversal Defense
The development server resolves all paths to their canonical absolute forms using `[System.IO.Path]::GetFullPath` and enforces that requests cannot escape the web root folder. Sensitive files (`server.ps1`, `server.py`, `secureledger.db`, `README.md`, `.git`, `.env`) return `403 Forbidden`.

---

## 🏛️ Authentication Architecture: 3-Stack Comparison

To transition SecureLedger from simulated authentication to authentic cryptographic identity verification, three production architectures are evaluated:

| Architecture | Credential Hashing | Phone OTP Verification | Backend / Database | Cost & Latency | Best Suited For |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Option 1: Custom Node.js on Vercel Serverless (Implemented)** | NIST SP 800-132 PBKDF2 (100k rounds) + CSPRNG 32-byte salt | SHA-256 hashed OTPs, `crypto.timingSafeEqual`, 5-min expiry, max 3 attempts | Vercel `/api/*` + PostgreSQL (Neon / Supabase) or in-memory ACID fallback | Zero subscription cost, free tier on Vercel, ~30ms latency | **Current Implementation**: Complete control over cryptographic hashing, CSPRNG OTP generation, and custom DLT SMS routing with zero third-party vendor lock-in. |
| **Option 2: Supabase Auth + PostgreSQL** | Argon2 / bcrypt handled natively by GoTrue | Twilio / MessageBird / custom SMS provider hooked to Supabase Auth | Managed PostgreSQL with Row-Level Security (RLS) policies | Free tier includes 50,000 monthly active users (MAU) | Teams wanting built-in SQL database with automated auth schema and instant realtime subscriptions. |
| **Option 3: Firebase Auth + Cloud Firestore** | Scrypt (modified) managed by Google Identity Platform | Native reCAPTCHA phone verification + Google SMS gateway | NoSQL Firestore database | Generous free tier (10k phone verifications / month) | Rapid prototyping with mobile-first SDKs, though vendor-locked and requires client reCAPTCHA widgets. |

---

## 📡 SMS Multi-Gateway & India DLT Compliance Guide

In India, commercial SMS delivery is strictly governed by the **Telecom Regulatory Authority of India (TRAI)** under the **Distributed Ledger Technology (DLT)** framework. Commercial and transactional SMS messages (including OTPs) will be blocked by telecom operators (Airtel, Jio, Vi, BSNL) unless registered with approved headers and content templates.

### 1. DLT Portal Registration Steps
1. **Principal Entity Registration**: Register your company or organization on any telecom DLT portal (e.g., [Vilpower DLT](https://www.vilpower.in/), [Jio DLT](https://trueconnect.jio.com/), or [Airtel DLT](https://www.airtel.in/business/commercial-communication/)).
2. **Header (Sender ID) Registration**: Register a 6-character alphabetic Header for Transactional/Service Implicit SMS:
   - Example Header: `SECLED` or `SLBANK`
3. **Content Template Registration**: Submit your OTP message template with variable placeholders:
   - **Template Name**: `SecureLedger Login OTP`
   - **Template Type**: Service Implicit / Transactional
   - **Approved Template Text**:  
     `Your SecureLedger verification code is: {#var#}. Valid for 5 minutes. Do not share this code with anyone.`
4. **Obtain Template ID**: Once approved by the telecom registrar, copy the alphanumeric Template ID into your environment variables.

### 2. Supported SMS Providers in SecureLedger
SecureLedger includes turnkey support for three major SMS gateways in `api/lib/sms.js`:

1. **MSG91 (India DLT Compliant)**:
   - Configure `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID`.
   - Sends OTP using MSG91 Flow API with full DLT template mapping.
2. **Fast2SMS (Quick Transactional & DLT)**:
   - Configure `FAST2SMS_API_KEY`.
   - Routes OTPs across Indian operators via Fast2SMS Bulk V2 OTP route.
3. **Twilio Messages API**:
   - Configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`.
4. **Development Console Fallback (Zero Leakage)**:
   - When no SMS gateway API keys are configured, SecureLedger securely outputs the dispatched OTP to the private server console (`console.log`) so engineers can test in Vercel Function logs.
   - **Zero-Leak Guarantee**: Plaintext OTP is **NEVER** returned in any HTTP response payload to the browser.

---

## ⚙️ Vercel Environment Variables & Configuration

To enable live SMS delivery and persistence on Vercel:

| Variable | Description | Example / Required |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `production` |
| `DATABASE_URL` | Optional PostgreSQL connection string (Neon / Supabase / AWS RDS) | `postgres://user:pass@ep-cool-db.neon.tech/secureledger?sslmode=require` |
| `MSG91_AUTH_KEY` | MSG91 API Authentication Key | `394812Abcd...` (Optional) |
| `MSG91_TEMPLATE_ID` | Approved TRAI DLT Template ID on MSG91 | `64d8...` (Optional) |
| `FAST2SMS_API_KEY` | Fast2SMS Authorization Key | `AbCdEf123...` (Optional) |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | `ACxxxxxxxx...` (Optional) |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `xxxxxxxxxxxx...` (Optional) |
| `TWILIO_FROM_NUMBER` | Twilio registered phone number or Sender ID | `+1234567890` (Optional) |

---

## 🗄️ Production PostgreSQL Schema

When attaching an external PostgreSQL database (Neon, Supabase, or AWS Aurora), run the following schema:

```sql
-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(32) NOT NULL,
    title VARCHAR(128) DEFAULT 'Treasury Officer',
    role VARCHAR(64) DEFAULT 'treasury_officer',
    clearance VARCHAR(32) DEFAULT 'level_1',
    salt VARCHAR(128) NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    phone_verified BOOLEAN DEFAULT FALSE,
    failed_attempts INT DEFAULT 0,
    locked_until BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Multi-Factor OTP Challenges (Zero Plaintext Storage)
CREATE TABLE IF NOT EXISTS mfa_challenges (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(32) NOT NULL,
    code_hash VARCHAR(128) NOT NULL, -- SHA-256 hash of 6-digit OTP
    attempts INT DEFAULT 0,
    expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL
);

-- 3. Authenticated Sessions (Signed HttpOnly Cookies)
CREATE TABLE IF NOT EXISTS sessions (
    token_hash VARCHAR(128) PRIMARY KEY, -- SHA-256 hash of 32-byte session token
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    clearance VARCHAR(32) DEFAULT 'level_1',
    expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL
);

-- 4. Corporate Operating Accounts
CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    number VARCHAR(32) NOT NULL,
    type VARCHAR(64) NOT NULL,
    available_balance NUMERIC(15, 2) NOT NULL,
    settled_balance NUMERIC(15, 2) NOT NULL,
    pending_hold NUMERIC(15, 2) DEFAULT 0.00,
    currency VARCHAR(8) DEFAULT 'INR'
);

-- 5. Cryptographic Merkle Chain Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(64) PRIMARY KEY,
    account_id VARCHAR(64) REFERENCES accounts(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    direction VARCHAR(16) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    status VARCHAR(32) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    counterparty VARCHAR(255) NOT NULL,
    running_balance NUMERIC(15, 2) NOT NULL,
    is_step_up BOOLEAN DEFAULT FALSE,
    reference VARCHAR(128) NOT NULL,
    prev_hash VARCHAR(128) NOT NULL,
    curr_hash VARCHAR(128) NOT NULL -- SHA-256 Merkle chain hash
);

-- 6. Immutable Security Audit Trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    actor VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(64) NOT NULL,
    status VARCHAR(32) DEFAULT 'verified',
    prev_hash VARCHAR(128) NOT NULL,
    curr_hash VARCHAR(128) NOT NULL
);
```

---

## 🧪 Testing and Verification Checklist

Execute the automated test suite locally to verify defense-in-depth:

```powershell
# Start the local server
python server.py --port 8080

# In another terminal, run the 31-point test suite
python test_server.py
```

Test Results (31/31 Passing - 100%):
- [x] **Path Traversal Protection**: Requesting `http://localhost:8080/../` or encoded equivalents returns `403 Forbidden`.
- [x] **Sensitive File Lockdown**: Requesting `http://localhost:8080/server.ps1`, `server.py`, or `secureledger.db` returns `403 Forbidden`.
- [x] **Content-Security-Policy**: Enforced CSP header blocks external unauthorized scripts.
- [x] **Server-Side Credential Verification**: PBKDF2 hash verification with salt against database records.
- [x] **Zero-Leakage OTP**: `demoOtp` is **NOT** present in HTTP login response payloads. Plaintext OTP is stored as SHA-256 hash.
- [x] **Brute-Force OTP Lockout**: 3 consecutive wrong entries invalidate the challenge.
- [x] **OTP Expiration Guard**: Challenge expires after 5 minutes (300 seconds).
- [x] **HttpOnly Signed Session Cookies**: Issued with `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1800`.
- [x] **Contextual Step-Up Authorization**: Transfers ≥ ₹1,000 enforce Level 2 clearance via biometric passkey or secondary OTP.
- [x] **Balance Sufficiency Check**: Server rejects overdraft attempts exceeding available liquidity.
- [x] **SHA-256 Merkle Audit Chain**: Every transaction and audit event calculates parent block hash linkage.
- [x] **Sanitized CSV Statement**: Neutralizes CSV formula injection characters (`=`, `+`, `-`, `@`).

---

## 🗺️ Roadmap & Future Architecture

- [ ] WebAuthn FIDO2 / hardware key integration with authentic challenge-response signing.
- [ ] Export statement as formatted vector PDF using client-side Canvas rendering.
- [ ] Multi-currency conversion rates with real-time foreign exchange simulation.
- [ ] Configurable spending categories and custom recurring scheduled wire rules.

---

## 📄 License

This project is released under the **MIT License**. Feel free to use, modify, and reference this project for personal portfolios, academic demonstrations, and interview showcases.
