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
- **Phone / Mobile**: Open `http://<YOUR-LAN-IP>:8080/` (the exact IP is displayed in the console on startup, e.g. `http://172.16.72.133:8080/`)
- **Default Credentials**:
  - Email: `alex.sterling@secureledger.io`
  - Password: `DemoSecure2026!`
  - Role: `Chief Treasury Officer` (Admin clearance)

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
The development server resolves all paths to their canonical absolute forms using `[System.IO.Path]::GetFullPath` and enforces that requests cannot escape the web root folder. Sensitive files (`server.ps1`, `README.md`, `.git`, `.env`) return `403 Forbidden`.

---

## 🧪 Testing and Verification Checklist

Execute the following test cases to verify the application:

- [x] **Path Traversal Protection**: Requesting `http://localhost:5500/../` or encoded equivalents returns `403 Forbidden`.
- [x] **Sensitive File Lockdown**: Requesting `http://localhost:5500/server.ps1` or `README.md` returns `403 Forbidden`.
- [x] **Cryptographic OTP Generation**: OTP values are random and change every 60 seconds.
- [x] **OTP Attempt Limiting**: 3 consecutive wrong entries invalidate the code and show a lockout message.
- [x] **OTP Expiration**: Waiting 60 seconds renders the code expired and prevents submission.
- [x] **Transfer Validation**: Submitting ₹0.00, negative numbers, or amounts exceeding available balance displays immediate inline validation errors.
- [x] **Contextual Step-Up**: Transferring ₹1,000.00+ or sending to an unverified counterparty opens the Level 2 Step-Up challenge.
- [x] **Level 2 Auto-Decay**: After 3 minutes of elevation, authorization clearance automatically reverts to Level 1.
- [x] **Audit Chain Integrity**: Clicking "Verify Log Integrity" confirms that all blocks have valid SHA-256 parent linkage.
- [x] **Tamper Detection**: Clicking "Simulate Tamper" followed by "Verify Log Integrity" detects data corruption and pinpoints the tampered block.
- [x] **CSV Injection Defense**: Exported CSV files prefix special characters (`=`, `+`, `-`, `@`) with single quotes.
- [x] **Inactivity Timeout**: At 00:30 remaining, the warning dialog appears; clicking "Extend My Session" resets the timer.
- [x] **Keyboard Accessibility**: Pressing `Escape` closes active modals; pressing `Tab` cycles within modal bounds.
- [x] **Theme Switcher**: Toggling Dark / Light mode updates styles smoothly and persists across page reloads.

---

## 🗺️ Roadmap & Future Architecture

- [ ] WebAuthn FIDO2 / hardware key integration with authentic challenge-response signing.
- [ ] Export statement as formatted vector PDF using client-side Canvas rendering.
- [ ] Multi-currency conversion rates with real-time foreign exchange simulation.
- [ ] Configurable spending categories and custom recurring scheduled wire rules.

---

## 📄 License

This project is released under the **MIT License**. Feel free to use, modify, and reference this project for personal portfolios, academic demonstrations, and interview showcases.
