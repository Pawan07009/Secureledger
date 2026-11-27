// Seed data for Banking State & Ledger Simulation

export const DEFAULT_ACCOUNTS = [
  {
    id: "acc_chk_8492",
    name: "Primary Operating Checking",
    number: "•••• 8492",
    type: "Checking",
    availableBalance: 24850.75,
    settledBalance: 25450.75,
    pendingHold: 600.00,
    currency: "INR"
  },
  {
    id: "acc_sav_1024",
    name: "High-Yield Treasury Reserve",
    number: "•••• 1024",
    type: "Savings",
    availableBalance: 118400.00,
    settledBalance: 118400.00,
    pendingHold: 0.00,
    currency: "INR"
  }
];

export const INITIAL_TRANSACTIONS = [
  {
    id: "tx_99812",
    accountId: "acc_chk_8492",
    title: "Global Stripe Payout",
    category: "Income",
    direction: "credit",
    amount: 5400.00,
    status: "settled",
    timestamp: "2026-10-31T09:15:00Z",
    counterparty: "Stripe Payments Ltd",
    runningBalance: 24850.75,
    isStepUpAuthorized: false
  },
  {
    id: "tx_99811",
    accountId: "acc_chk_8492",
    title: "AWS Cloud Infrastructure",
    category: "Technology",
    direction: "debit",
    amount: 600.00,
    status: "pending",
    timestamp: "2026-10-31T07:30:00Z",
    counterparty: "Amazon Web Services",
    runningBalance: 19450.75,
    isStepUpAuthorized: false
  },
  {
    id: "tx_99810",
    accountId: "acc_chk_8492",
    title: "Executive Wire: Silicon Valley Lease",
    category: "Facilities",
    direction: "debit",
    amount: 3200.00,
    status: "settled",
    timestamp: "2026-10-30T14:40:00Z",
    counterparty: "Venture Real Estate Trust",
    runningBalance: 20050.75,
    isStepUpAuthorized: true
  },
  {
    id: "tx_99809",
    accountId: "acc_chk_8492",
    title: "Angel Investor Dividend",
    category: "Investments",
    direction: "credit",
    amount: 8500.00,
    status: "settled",
    timestamp: "2026-10-29T11:20:00Z",
    counterparty: "Horizons Capital Fund",
    runningBalance: 23250.75,
    isStepUpAuthorized: true
  },
  {
    id: "tx_99808",
    accountId: "acc_chk_8492",
    title: "Figma Enterprise License",
    category: "Software",
    direction: "debit",
    amount: 180.00,
    status: "settled",
    timestamp: "2026-10-28T16:05:00Z",
    counterparty: "Figma Inc",
    runningBalance: 14750.75,
    isStepUpAuthorized: false
  },
  {
    id: "tx_99807",
    accountId: "acc_chk_8492",
    title: "Blue Bottle Coffee Supply",
    category: "Food & Dining",
    direction: "debit",
    amount: 45.20,
    status: "settled",
    timestamp: "2026-10-27T08:12:00Z",
    counterparty: "Blue Bottle Coffee",
    runningBalance: 14930.75,
    isStepUpAuthorized: false
  }
];

export const KNOWN_PAYEES = [
  { id: "p_1", name: "Apex Global Logistics", isVerified: true },
  { id: "p_2", name: "CyberDefend Security LLC", isVerified: true },
  { id: "p_3", name: "Venture Real Estate Trust", isVerified: true },
  { id: "p_4", name: "Custom Contractor (Unverified)", isVerified: false }
];

export const INITIAL_AUDIT_LOGS = [
  { id: "log_1", action: "User Login", details: "MFA Token Verified (2FA Level 1)", time: "Just now" },
  { id: "log_2", action: "Session Initialized", details: "TLS 1.3 / AES-256 Validated", time: "2 mins ago" },
  { id: "log_3", action: "Step-Up Escalation", details: "Wire Transfer #tx_99810 approved via Biometrics", time: "1 day ago" }
];
