/**
 * SecureLedger OS - Enterprise Banking Access & Cryptographic Ledger
 * Comprehensive, production-grade simulation script.
 * Zero external dependencies. Fully CSP compliant (no inline scripts).
 */

(function () {
  "use strict";

  // ========================================================
  // 1. CONSTANTS, INITIAL DATA & CRYPTO HELPERS
  // ========================================================

  const STORAGE_KEY = "secureledger_treasury_ledger_v3";
  const THEME_STORAGE_KEY = "secureledger_theme";
  const STEP_UP_THRESHOLD = 1000.0;
  const SINGLE_TRANSFER_LIMIT = 500000.0;
  const LEVEL_2_DURATION_MS = 180000; // 3 minutes
  const SESSION_TOTAL_SECONDS = 240; // 4 minutes
  const OTP_VALIDITY_SECONDS = 60;
  const OTP_RESEND_COOLDOWN_SECONDS = 20;
  const MAX_OTP_ATTEMPTS = 3;

  const GENESIS_PREV_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

  // Cryptographic SHA-256 calculation via Web Crypto API
  async function computeSha256(message) {
    if (!window.crypto || !window.crypto.subtle) {
      // Fallback pseudo-hash for non-secure contexts if WebCrypto is unavailable
      let hash = 0;
      for (let i = 0; i < message.length; i++) {
        hash = (hash << 5) - hash + message.charCodeAt(i);
        hash |= 0;
      }
      return ("00000000" + (hash >>> 0).toString(16)).slice(-8).repeat(8);
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Cryptographically secure random 6-digit OTP generator
  function generateSecureOtp() {
    if (window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      const code = 100000 + (array[0] % 900000);
      return String(code);
    }
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  // Generate unique transaction reference IDs: TXN-YYYYMMDD-XXXXX
  function generateTxnRef() {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = Math.floor(10000 + Math.random() * 90000).toString(16).toUpperCase();
    return `TXN-${dateStr}-${randomHex}`;
  }

  // Fictional Initial Accounts
  const DEFAULT_ACCOUNTS = [
    {
      id: "acc_chk_8492",
      name: "Primary Operating Checking",
      number: "•••• 8492",
      type: "Checking",
      availableBalance: 24850.75,
      settledBalance: 25450.75,
      pendingHold: 600.0,
      currency: "INR"
    },
    {
      id: "acc_sav_1024",
      name: "High-Yield Treasury Reserve",
      number: "•••• 1024",
      type: "Savings",
      availableBalance: 118400.0,
      settledBalance: 118400.0,
      pendingHold: 0.0,
      currency: "INR"
    }
  ];

  // Pre-cleared Beneficiaries Whitelist
  const DEFAULT_BENEFICIARIES = [
    { id: "ben_1", name: "Apex Global Logistics", isVerified: true, category: "Operations", routing: "HDFC0001024" },
    { id: "ben_2", name: "CyberDefend Security LLC", isVerified: true, category: "Technology", routing: "ICIC0008492" },
    { id: "ben_3", name: "Venture Real Estate Trust", isVerified: true, category: "Facilities", routing: "UTIB0003921" },
    { id: "ben_4", name: "Acme Cloud Systems", isVerified: true, category: "Software", routing: "SBIN0004920" },
    { id: "ben_5", name: "Custom External Vendor", isVerified: false, category: "Operations", routing: "UNVERIFIED" }
  ];

  // Initial Seed Transactions
  const INITIAL_TRANSACTIONS = [
    {
      id: "TXN-20261031-99812",
      accountId: "acc_chk_8492",
      title: "Global Stripe Payout",
      category: "Income",
      direction: "credit",
      amount: 5400.0,
      status: "settled",
      timestamp: "2026-10-31T09:15:00Z",
      counterparty: "Stripe Payments Ltd",
      runningBalance: 24850.75,
      isStepUpAuthorized: false,
      reference: "STRIPE-BATCH-8902"
    },
    {
      id: "TXN-20261031-99811",
      accountId: "acc_chk_8492",
      title: "AWS Cloud Infrastructure",
      category: "Technology",
      direction: "debit",
      amount: 600.0,
      status: "pending",
      timestamp: "2026-10-31T07:30:00Z",
      counterparty: "Amazon Web Services",
      runningBalance: 19450.75,
      isStepUpAuthorized: false,
      reference: "AWS-INV-99201"
    },
    {
      id: "TXN-20261030-99810",
      accountId: "acc_chk_8492",
      title: "Silicon Valley Office Lease",
      category: "Facilities",
      direction: "debit",
      amount: 3200.0,
      status: "settled",
      timestamp: "2026-10-30T14:40:00Z",
      counterparty: "Venture Real Estate Trust",
      runningBalance: 20050.75,
      isStepUpAuthorized: true,
      reference: "LEASE-OCT-2026"
    },
    {
      id: "TXN-20261029-99809",
      accountId: "acc_chk_8492",
      title: "Angel Investor Dividend",
      category: "Investments",
      direction: "credit",
      amount: 8500.0,
      status: "settled",
      timestamp: "2026-10-29T11:20:00Z",
      counterparty: "Horizons Capital Fund",
      runningBalance: 23250.75,
      isStepUpAuthorized: true,
      reference: "DIVIDEND-Q3"
    },
    {
      id: "TXN-20261028-99808",
      accountId: "acc_chk_8492",
      title: "Figma Enterprise License",
      category: "Software",
      direction: "debit",
      amount: 180.0,
      status: "settled",
      timestamp: "2026-10-28T16:05:00Z",
      counterparty: "Figma Inc",
      runningBalance: 14750.75,
      isStepUpAuthorized: false,
      reference: "SUB-FIGMA-ENT"
    },
    {
      id: "TXN-20261027-99807",
      accountId: "acc_chk_8492",
      title: "Executive Staff Catering",
      category: "Food & Dining",
      direction: "debit",
      amount: 145.0,
      status: "settled",
      timestamp: "2026-10-27T12:30:00Z",
      counterparty: "Blue Bottle Coffee Supply",
      runningBalance: 14930.75,
      isStepUpAuthorized: false,
      reference: "CATERING-4091"
    },
    {
      id: "TXN-20261026-99806",
      accountId: "acc_chk_8492",
      title: "Contractor Payroll Disbursal",
      category: "Payroll",
      direction: "debit",
      amount: 4200.0,
      status: "settled",
      timestamp: "2026-10-26T08:00:00Z",
      counterparty: "Remote Workforce Network",
      runningBalance: 15075.75,
      isStepUpAuthorized: true,
      reference: "PAYROLL-2026-10B"
    }
  ];

  // Seed Notifications
  const INITIAL_NOTIFICATIONS = [
    { id: "notif_1", title: "Security Clearance Standardized", time: "10m ago", type: "info" },
    { id: "notif_2", title: "Corporate Virtual Card Active", time: "1h ago", type: "success" },
    { id: "notif_3", title: "Automated Monthly Audit Reconciled", time: "1d ago", type: "info" }
  ];

  // ========================================================
  // 2. AUTHENTICATION & SESSION LIFECYCLE MANAGER
  // ========================================================

  class AuthManager {
    constructor(callbacks = {}) {
      this.callbacks = callbacks;
      this.isAuthenticated = true;

      this.currentUser = {
        name: "Alex Sterling",
        email: "alex.sterling@secureledger.io",
        role: "Chief Treasury Officer",
        customerId: "CUST-90241"
      };

      this.securityLevel = 1; // 1 = Standard, 2 = Elevated
      this.stepUpExpiresAt = null;

      this.sessionTotalSeconds = SESSION_TOTAL_SECONDS;
      this.sessionRemaining = SESSION_TOTAL_SECONDS;
      this.timerInterval = null;

      // Active OTP state (never written to localStorage)
      this.activeOtp = null;
      this.otpExpiresAt = null;
      this.otpAttempts = 0;
      this.otpResendAvailableAt = 0;

      this.initSessionHeartbeat();
      this.setupUserActivityListeners();
    }

    initSessionHeartbeat() {
      if (this.timerInterval) clearInterval(this.timerInterval);

      this.timerInterval = setInterval(() => {
        if (!this.isAuthenticated) return;

        this.sessionRemaining--;

        // Check Step-Up Level 2 expiration
        if (this.securityLevel === 2 && this.stepUpExpiresAt && Date.now() > this.stepUpExpiresAt) {
          this.securityLevel = 1;
          this.stepUpExpiresAt = null;
          if (this.callbacks.onSecurityLevelChange) {
            this.callbacks.onSecurityLevelChange(
              1,
              "Step-Up authorization period (3 minutes) expired. Reverted to Level 1."
            );
          }
        }

        if (this.callbacks.onSessionTick) {
          this.callbacks.onSessionTick(this.sessionRemaining, this.sessionTotalSeconds);
        }

        if (this.sessionRemaining <= 0) {
          this.expireSession();
        }
      }, 1000);
    }

    setupUserActivityListeners() {
      const resetIdle = () => {
        // Reset timer if authenticated and not in the critical 30-second warning zone
        if (this.isAuthenticated && this.sessionRemaining > 30) {
          if (this.sessionRemaining < this.sessionTotalSeconds - 15) {
            this.sessionRemaining = this.sessionTotalSeconds;
          }
        }
      };
      window.addEventListener("click", resetIdle, { passive: true });
      window.addEventListener("keydown", resetIdle, { passive: true });
      window.addEventListener("touchstart", resetIdle, { passive: true });
    }

    extendSession() {
      this.sessionRemaining = this.sessionTotalSeconds;
      if (this.callbacks.onSessionTick) {
        this.callbacks.onSessionTick(this.sessionRemaining, this.sessionTotalSeconds);
      }
    }

    expireSession() {
      clearInterval(this.timerInterval);
      this.isAuthenticated = false;
      this.securityLevel = 1;
      this.stepUpExpiresAt = null;
      if (this.callbacks.onSessionExpire) {
        this.callbacks.onSessionExpire();
      }
    }

    issueNewOtp() {
      this.activeOtp = generateSecureOtp();
      this.otpExpiresAt = Date.now() + OTP_VALIDITY_SECONDS * 1000;
      this.otpAttempts = 0;
      this.otpResendAvailableAt = Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1000;
      return {
        code: this.activeOtp,
        expiresIn: OTP_VALIDITY_SECONDS
      };
    }

    canResendOtp() {
      return Date.now() >= this.otpResendAvailableAt;
    }

    getResendWaitSeconds() {
      const diff = Math.ceil((this.otpResendAvailableAt - Date.now()) / 1000);
      return Math.max(0, diff);
    }

    verifyOtp(enteredCode) {
      if (!this.activeOtp) {
        return { success: false, error: "No active verification code. Please request a new code." };
      }

      if (Date.now() > this.otpExpiresAt) {
        this.activeOtp = null;
        return { success: false, error: "Verification passcode has expired. Please click 'Resend Code'." };
      }

      this.otpAttempts++;

      if (enteredCode.trim() === this.activeOtp) {
        // Invalidate OTP immediately to prevent reuse
        this.activeOtp = null;
        this.otpExpiresAt = null;
        return { success: true };
      }

      if (this.otpAttempts >= MAX_OTP_ATTEMPTS) {
        this.activeOtp = null;
        return {
          success: false,
          locked: true,
          error: "Maximum verification attempts (3) exceeded. Security challenge invalidated."
        };
      }

      const remaining = MAX_OTP_ATTEMPTS - this.otpAttempts;
      return {
        success: false,
        error: `Incorrect security passcode. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
      };
    }

    elevateStepUp(methodName = "Biometric Passkey") {
      this.securityLevel = 2;
      this.stepUpExpiresAt = Date.now() + LEVEL_2_DURATION_MS;

      if (this.callbacks.onSecurityLevelChange) {
        this.callbacks.onSecurityLevelChange(2, `Elevated to Level 2 via ${methodName}`);
      }
      return true;
    }

    login(customerId, password) {
      if (customerId && password && password.length >= 6) {
        const otpData = this.issueNewOtp();
        return {
          success: true,
          requiresMfa: true,
          code: otpData.code,
          expiresIn: otpData.expiresIn
        };
      }
      return { success: false, error: "Please enter a valid customer identifier and password (min 6 characters)." };
    }

    completeLoginMfa(enteredCode) {
      const verification = this.verifyOtp(enteredCode);
      if (verification.success) {
        this.isAuthenticated = true;
        this.securityLevel = 1;
        this.sessionRemaining = this.sessionTotalSeconds;
        this.initSessionHeartbeat();
        return { success: true };
      }
      return verification;
    }

    logout() {
      this.isAuthenticated = false;
      this.securityLevel = 1;
      this.stepUpExpiresAt = null;
      clearInterval(this.timerInterval);
      if (this.callbacks.onSessionExpire) {
        this.callbacks.onSessionExpire();
      }
    }
  }

  // ========================================================
  // 3. CRYPTOGRAPHIC AUDIT LOG ENGINE (SHA-256 HASH CHAIN)
  // ========================================================

  class AuditChainEngine {
    constructor() {
      this.logs = [];
    }

    async init(savedLogs) {
      if (savedLogs && savedLogs.length > 0) {
        this.logs = savedLogs;
      } else {
        await this.createGenesisBlock();
      }
    }

    async createGenesisBlock() {
      const timestamp = new Date("2026-10-26T00:00:00Z").toISOString();
      const action = "Genesis Node Initialized";
      const details = "SecureLedger genesis block minted with SHA-256 WebCrypto.";
      const user = "SYSTEM_NODE_01";
      const prevHash = GENESIS_PREV_HASH;

      const payload = `${prevHash}|${timestamp}|${action}|${details}|${user}`;
      const hash = await computeSha256(payload);

      this.logs = [
        {
          id: "BLOCK-000",
          timestamp,
          action,
          details,
          user,
          prevHash,
          hash
        }
      ];
    }

    async appendLog(action, details, user = "Alex Sterling (CUST-90241)") {
      const prevBlock = this.logs[this.logs.length - 1];
      const prevHash = prevBlock ? prevBlock.hash : GENESIS_PREV_HASH;
      const blockNum = String(this.logs.length).padStart(3, "0");
      const timestamp = new Date().toISOString();

      const payload = `${prevHash}|${timestamp}|${action}|${details}|${user}`;
      const hash = await computeSha256(payload);

      const newBlock = {
        id: `BLOCK-${blockNum}`,
        timestamp,
        action,
        details,
        user,
        prevHash,
        hash
      };

      this.logs.push(newBlock);
      return newBlock;
    }

    async verifyIntegrity() {
      if (this.logs.length === 0) return { isValid: true, brokenIndex: -1 };

      for (let i = 0; i < this.logs.length; i++) {
        const block = this.logs[i];
        const expectedPrev = i === 0 ? GENESIS_PREV_HASH : this.logs[i - 1].hash;

        // Verify previous hash chain linkage
        if (block.prevHash !== expectedPrev) {
          return {
            isValid: false,
            brokenIndex: i,
            reason: `Linkage break at ${block.id}: prevHash does not match preceding block's hash.`
          };
        }

        // Verify SHA-256 block hash computation
        const payload = `${block.prevHash}|${block.timestamp}|${block.action}|${block.details}|${block.user}`;
        const recomputed = await computeSha256(payload);

        if (recomputed !== block.hash) {
          return {
            isValid: false,
            brokenIndex: i,
            reason: `Tampering detected at ${block.id}: stored hash differs from recomputed SHA-256 value.`
          };
        }
      }

      return { isValid: true, brokenIndex: -1, count: this.logs.length };
    }

    tamperBlockForDemo(index = 1) {
      if (this.logs.length > index) {
        this.logs[index].details = "[TAMPERED CONTENT: Unauthorized ledger manipulation simulation]";
        return true;
      }
      return false;
    }
  }

  // ========================================================
  // 4. LEDGER & BALANCE COMPUTATION ENGINE
  // ========================================================

  class LedgerEngine {
    constructor(authManager, auditChain) {
      this.authManager = authManager;
      this.auditChain = auditChain;
      this.cardFrozen = false;
      this.loadState();
    }

    loadState() {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          this.accounts = parsed.accounts || JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
          this.transactions = parsed.transactions || JSON.parse(JSON.stringify(INITIAL_TRANSACTIONS));
          this.beneficiaries = parsed.beneficiaries || JSON.parse(JSON.stringify(DEFAULT_BENEFICIARIES));
          this.activeAccountId = parsed.activeAccountId || this.accounts[0].id;
          this.cardFrozen = !!parsed.cardFrozen;
          return;
        } catch (e) {
          console.error("Failed to parse saved ledger state, restoring defaults:", e);
        }
      }
      this.resetToDefaults();
    }

    saveState() {
      const data = {
        accounts: this.accounts,
        transactions: this.transactions,
        beneficiaries: this.beneficiaries,
        auditLogs: this.auditChain.logs,
        activeAccountId: this.activeAccountId,
        cardFrozen: this.cardFrozen
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    resetToDefaults() {
      this.accounts = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
      this.transactions = JSON.parse(JSON.stringify(INITIAL_TRANSACTIONS));
      this.beneficiaries = JSON.parse(JSON.stringify(DEFAULT_BENEFICIARIES));
      this.activeAccountId = this.accounts[0].id;
      this.cardFrozen = false;
    }

    getActiveAccount() {
      return this.accounts.find((a) => a.id === this.activeAccountId) || this.accounts[0];
    }

    setActiveAccount(accountId) {
      if (this.accounts.some((a) => a.id === accountId)) {
        this.activeAccountId = accountId;
        this.saveState();
      }
    }

    getMetrics() {
      const acc = this.getActiveAccount();
      const accountTxs = this.transactions.filter((t) => t.accountId === acc.id);

      let totalInflow = 0;
      let totalOutflow = 0;

      accountTxs.forEach((tx) => {
        if (tx.direction === "credit") {
          totalInflow += tx.amount;
        } else {
          totalOutflow += tx.amount;
        }
      });

      return {
        availableBalance: acc.availableBalance,
        settledBalance: acc.settledBalance,
        pendingHold: acc.pendingHold,
        totalInflow,
        totalOutflow,
        txCount: accountTxs.length
      };
    }

    getCategoryBreakdown() {
      const acc = this.getActiveAccount();
      const accountTxs = this.transactions.filter((t) => t.accountId === acc.id && t.direction === "debit");
      const breakdown = {};
      let totalSpent = 0;

      accountTxs.forEach((tx) => {
        const cat = tx.category || "General";
        breakdown[cat] = (breakdown[cat] || 0) + tx.amount;
        totalSpent += tx.amount;
      });

      return { breakdown, totalSpent };
    }

    checkStepUpRequired(amount, payeeName) {
      const knownPayee = this.beneficiaries.find((b) => b.name.toLowerCase() === payeeName.toLowerCase());
      const isUnverifiedPayee = !knownPayee || !knownPayee.isVerified;
      const isHighValue = amount >= STEP_UP_THRESHOLD;

      const required = (isHighValue || isUnverifiedPayee) && this.authManager.securityLevel < 2;

      let reason = "";
      if (isHighValue && isUnverifiedPayee) {
        reason = `Transfer exceeds ₹${STEP_UP_THRESHOLD.toFixed(2)} threshold AND payee "${payeeName}" is unverified.`;
      } else if (isHighValue) {
        reason = `Transfer amount (₹${amount.toFixed(2)}) meets or exceeds Level 2 threshold of ₹${STEP_UP_THRESHOLD.toFixed(2)}.`;
      } else if (isUnverifiedPayee) {
        reason = `Payee "${payeeName}" is not on your pre-cleared whitelist.`;
      }

      return { required, reason };
    }

    async executeTransfer({ recipient, amount, category, reference, isPending = false }) {
      const acc = this.getActiveAccount();
      const numAmount = parseFloat(amount);

      if (isNaN(numAmount) || numAmount <= 0) {
        return { success: false, error: "Please enter a valid transfer amount greater than zero." };
      }

      if (numAmount > SINGLE_TRANSFER_LIMIT) {
        return {
          success: false,
          error: `Amount exceeds the single transaction limit of ₹${SINGLE_TRANSFER_LIMIT.toLocaleString("en-IN")}.`
        };
      }

      if (numAmount > acc.availableBalance) {
        return {
          success: false,
          error: `Insufficient available funds. Available: ₹${acc.availableBalance.toFixed(2)}, Requested: ₹${numAmount.toFixed(2)}`
        };
      }

      const stepUp = this.checkStepUpRequired(numAmount, recipient);
      if (stepUp.required) {
        return {
          success: false,
          requiresStepUp: true,
          reason: stepUp.reason,
          pendingTransferData: { recipient, amount: numAmount, category, reference, isPending }
        };
      }

      // Deduct available liquid balance
      acc.availableBalance -= numAmount;

      if (isPending) {
        acc.pendingHold += numAmount;
      } else {
        acc.settledBalance -= numAmount;
      }

      const refId = generateTxnRef();
      const newTx = {
        id: refId,
        accountId: acc.id,
        title: recipient,
        category: category || "Transfer",
        direction: "debit",
        amount: numAmount,
        status: isPending ? "pending" : "settled",
        timestamp: new Date().toISOString(),
        counterparty: recipient,
        runningBalance: acc.availableBalance,
        isStepUpAuthorized: this.authManager.securityLevel >= 2,
        reference: reference || "Direct Treasury Transfer"
      };

      this.transactions.unshift(newTx);

      await this.auditChain.appendLog(
        `Transfer Executed: ₹${numAmount.toFixed(2)}`,
        `Debited to ${recipient}. Ref: ${refId}. Auth: Level ${this.authManager.securityLevel}`
      );

      this.saveState();
      return { success: true, transaction: newTx };
    }

    async simulateDeposit(amount = 2500.0, sender = "TechCorp Enterprise Wire") {
      const acc = this.getActiveAccount();
      const numAmount = parseFloat(amount);

      acc.availableBalance += numAmount;
      acc.settledBalance += numAmount;

      const refId = generateTxnRef();
      const newTx = {
        id: refId,
        accountId: acc.id,
        title: sender,
        category: "Income",
        direction: "credit",
        amount: numAmount,
        status: "settled",
        timestamp: new Date().toISOString(),
        counterparty: sender,
        runningBalance: acc.availableBalance,
        isStepUpAuthorized: false,
        reference: "INCOMING-RTGS-WIRE"
      };

      this.transactions.unshift(newTx);

      await this.auditChain.appendLog(
        `Incoming Deposit: +₹${numAmount.toFixed(2)}`,
        `Received from ${sender}. Ref: ${refId}`
      );

      this.saveState();
      return newTx;
    }

    async toggleCardFreeze() {
      this.cardFrozen = !this.cardFrozen;
      const statusText = this.cardFrozen ? "Card Frozen" : "Card Unfrozen";

      await this.auditChain.appendLog(
        statusText,
        `Corporate card •••• 4028 status set to ${this.cardFrozen ? "FROZEN" : "ACTIVE"}`
      );

      this.saveState();
      return this.cardFrozen;
    }

    addBeneficiary(name, category = "Operations", routing = "AUTOGEN", isVerified = false) {
      const newBen = {
        id: `ben_${Date.now()}`,
        name: name.trim(),
        isVerified: !!isVerified,
        category,
        routing
      };
      this.beneficiaries.push(newBen);
      this.saveState();
      return newBen;
    }

    filterTransactions({ query = "", category = "all", type = "all", status = "all", sort = "date-desc" }) {
      const acc = this.getActiveAccount();
      let list = this.transactions.filter((tx) => {
        if (tx.accountId !== acc.id) return false;

        if (query.trim()) {
          const q = query.toLowerCase();
          const matchesTitle = (tx.title || "").toLowerCase().includes(q);
          const matchesCounterparty = (tx.counterparty || "").toLowerCase().includes(q);
          const matchesCategory = (tx.category || "").toLowerCase().includes(q);
          const matchesRef = (tx.id || "").toLowerCase().includes(q);
          const matchesAmount = tx.amount.toString().includes(q);
          if (!matchesTitle && !matchesCounterparty && !matchesCategory && !matchesRef && !matchesAmount) {
            return false;
          }
        }

        if (category !== "all" && tx.category.toLowerCase() !== category.toLowerCase()) {
          return false;
        }

        if (type !== "all" && tx.direction !== type) {
          return false;
        }

        if (status !== "all" && tx.status !== status) {
          return false;
        }

        return true;
      });

      // Sorting
      list.sort((a, b) => {
        if (sort === "date-desc") return new Date(b.timestamp) - new Date(a.timestamp);
        if (sort === "date-asc") return new Date(a.timestamp) - new Date(b.timestamp);
        if (sort === "amount-desc") return b.amount - a.amount;
        if (sort === "amount-asc") return a.amount - b.amount;
        if (sort === "payee-asc") return (a.counterparty || "").localeCompare(b.counterparty || "");
        return 0;
      });

      return list;
    }

    exportToCSV() {
      const acc = this.getActiveAccount();
      const txs = this.transactions.filter((t) => t.accountId === acc.id);

      const headers = [
        "Transaction Reference",
        "Timestamp (ISO)",
        "Description",
        "Category",
        "Direction",
        "Amount (INR)",
        "Clearing Status",
        "Auth Clearance",
        "Running Balance (INR)"
      ];

      // Sanitize fields against CSV Formula Injection (=, +, -, @, |, leading spaces)
      const sanitizeCell = (val) => {
        let str = String(val == null ? "" : val);
        if (/^\s*[=+\-@\t\r|]/.test(str)) {
          str = "'" + str;
        }
        return `"${str.replace(/"/g, '""')}"`;
      };

      const rows = txs.map((t) => [
        sanitizeCell(t.id),
        sanitizeCell(t.timestamp),
        sanitizeCell(t.title),
        sanitizeCell(t.category),
        sanitizeCell(t.direction.toUpperCase()),
        sanitizeCell(t.amount.toFixed(2)),
        sanitizeCell(t.status.toUpperCase()),
        sanitizeCell(t.isStepUpAuthorized ? "LEVEL 2 (ELEVATED)" : "LEVEL 1 (STANDARD)"),
        sanitizeCell(t.runningBalance.toFixed(2))
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `SecureLedger_Ledger_${acc.number.replace(/\s+/g, "")}_Statement.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // ========================================================
  // 5. UI RENDERER & INTERACTION CONTROLLER
  // ========================================================

  class UIRenderer {
    constructor() {
      this.toastContainer = document.getElementById("toastContainer");
      this.activeModal = null;
      this.lastFocusedElement = null;
      this.currentPage = 1;
      this.pageSize = 6;
    }

    formatCurrency(amount) {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2
      }).format(amount);
    }

    formatDate(isoString) {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }

    animateCounter(element, start, end, duration = 600) {
      if (!element) return;
      let startTimestamp = null;
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = start + progress * (end - start);
        element.textContent = this.formatCurrency(current);
        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          element.textContent = this.formatCurrency(end);
        }
      };
      window.requestAnimationFrame(step);
    }

    renderMetrics(metrics, prevMetrics = null) {
      const availEl = document.getElementById("metricAvailableBalance");
      const settledEl = document.getElementById("metricSettledBalance");
      const pendingEl = document.getElementById("metricPendingHold");
      const inflowEl = document.getElementById("metricTotalInflow");
      const outflowEl = document.getElementById("metricTotalOutflow");
      const cashflowFillIn = document.getElementById("cashflowFillIn");
      const cashflowFillOut = document.getElementById("cashflowFillOut");

      const prevAvail = prevMetrics ? prevMetrics.availableBalance : metrics.availableBalance * 0.95;
      this.animateCounter(availEl, prevAvail, metrics.availableBalance);

      if (settledEl) settledEl.textContent = this.formatCurrency(metrics.settledBalance);
      if (pendingEl) pendingEl.textContent = this.formatCurrency(metrics.pendingHold);
      if (inflowEl) inflowEl.textContent = this.formatCurrency(metrics.totalInflow);
      if (outflowEl) outflowEl.textContent = this.formatCurrency(metrics.totalOutflow);

      const totalVolume = metrics.totalInflow + metrics.totalOutflow;
      if (totalVolume > 0 && cashflowFillIn && cashflowFillOut) {
        const inPct = Math.min(100, (metrics.totalInflow / totalVolume) * 100);
        const outPct = Math.min(100, (metrics.totalOutflow / totalVolume) * 100);
        cashflowFillIn.style.width = `${inPct}%`;
        cashflowFillOut.style.width = `${outPct}%`;
      }
    }

    renderCategoryBreakdown(data) {
      const container = document.getElementById("categoryBreakdownList");
      if (!container) return;

      container.innerHTML = "";
      const categories = Object.keys(data.breakdown);

      if (categories.length === 0) {
        container.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted);">No recorded outflow this period.</p>`;
        return;
      }

      categories.forEach((cat) => {
        const amount = data.breakdown[cat];
        const pct = data.totalSpent > 0 ? Math.round((amount / data.totalSpent) * 100) : 0;

        const item = document.createElement("div");
        item.className = "cat-item";

        const header = document.createElement("div");
        header.className = "cat-header";

        const nameSpan = document.createElement("span");
        nameSpan.className = "cat-name";
        nameSpan.textContent = `${cat} (${pct}%)`;

        const amtSpan = document.createElement("span");
        amtSpan.className = "cat-amount";
        amtSpan.textContent = this.formatCurrency(amount);

        header.appendChild(nameSpan);
        header.appendChild(amtSpan);

        const track = document.createElement("div");
        track.className = "cat-track";

        const bar = document.createElement("div");
        bar.className = "cat-bar";
        bar.style.width = `${pct}%`;

        track.appendChild(bar);
        item.appendChild(header);
        item.appendChild(track);
        container.appendChild(item);
      });
    }

    renderLedgerTable(transactions, onRowClick) {
      const tbody = document.getElementById("ledgerTableBody");
      const countBadge = document.getElementById("ledgerCountBadge");
      const paginationInfo = document.getElementById("paginationInfo");
      const paginationPageNum = document.getElementById("paginationCurrentPage");
      const btnPrev = document.getElementById("btnPrevPage");
      const btnNext = document.getElementById("btnNextPage");

      if (countBadge) {
        countBadge.textContent = `${transactions.length} record${transactions.length === 1 ? "" : "s"}`;
      }

      if (!tbody) return;
      tbody.innerHTML = "";

      if (transactions.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="empty-ledger">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <p>No transactions match the selected filters or search terms.</p>
            </td>
          </tr>
        `;
        if (paginationInfo) paginationInfo.textContent = "Showing 0 records";
        if (btnPrev) btnPrev.disabled = true;
        if (btnNext) btnNext.disabled = true;
        return;
      }

      // Pagination slice
      const totalPages = Math.ceil(transactions.length / this.pageSize) || 1;
      if (this.currentPage > totalPages) this.currentPage = totalPages;
      if (this.currentPage < 1) this.currentPage = 1;

      const startIdx = (this.currentPage - 1) * this.pageSize;
      const endIdx = Math.min(startIdx + this.pageSize, transactions.length);
      const pageItems = transactions.slice(startIdx, endIdx);

      if (paginationInfo) {
        paginationInfo.textContent = `Showing ${startIdx + 1}-${endIdx} of ${transactions.length} records`;
      }
      if (paginationPageNum) {
        paginationPageNum.textContent = `Page ${this.currentPage} of ${totalPages}`;
      }
      if (btnPrev) btnPrev.disabled = this.currentPage <= 1;
      if (btnNext) btnNext.disabled = this.currentPage >= totalPages;

      pageItems.forEach((tx) => {
        const tr = document.createElement("tr");

        const isCredit = tx.direction === "credit";
        const sign = isCredit ? "+" : "-";
        const iconClass = isCredit ? "income" : tx.category === "Transfer" ? "transfer" : "expense";
        const iconSymbol = isCredit ? "↓" : tx.category === "Transfer" ? "⇄" : "↑";

        const statusBadgeClass = tx.status === "settled" ? "badge-settled" : "badge-pending";
        const statusText = tx.status === "settled" ? "Settled" : "Pending Hold";

        const stepUpBadge = tx.isStepUpAuthorized
          ? `<span class="tx-badge badge-stepup" title="Level 2 Step-Up Verified">🛡️ Level 2</span>`
          : "";

        tr.innerHTML = `
          <td>
            <div class="tx-main">
              <div class="tx-icon ${iconClass}" aria-hidden="true">${iconSymbol}</div>
              <div class="tx-details">
                <span class="tx-title">${escapeHtml(tx.title)}</span>
                <span class="tx-meta">
                  <span>${escapeHtml(tx.counterparty)}</span>
                  <span>•</span>
                  <span>${escapeHtml(tx.category)}</span>
                </span>
              </div>
            </div>
          </td>
          <td>
            <span style="color: var(--text-secondary); font-size: 0.8rem;">
              ${this.formatDate(tx.timestamp)}
            </span>
          </td>
          <td>
            <div style="display: flex; gap: 6px; align-items: center;">
              <span class="tx-badge ${statusBadgeClass}">${statusText}</span>
              ${stepUpBadge}
            </div>
          </td>
          <td>
            <span class="tx-amount ${isCredit ? "credit" : "debit"}">
              ${sign}${this.formatCurrency(tx.amount)}
            </span>
          </td>
          <td>
            <span class="tx-running-balance">
              ${this.formatCurrency(tx.runningBalance)}
            </span>
          </td>
          <td class="text-right">
            <button type="button" class="btn btn-secondary btn-sm tx-inspect-btn" data-txid="${tx.id}">Inspect</button>
          </td>
        `;

        const inspectBtn = tr.querySelector(".tx-inspect-btn");
        if (inspectBtn && onRowClick) {
          inspectBtn.addEventListener("click", () => onRowClick(tx));
        }

        tbody.appendChild(tr);
      });
    }

    renderAuditTable(logs) {
      const tbody = document.getElementById("auditTableBody");
      if (!tbody) return;

      tbody.innerHTML = "";

      logs.slice(-8).reverse().forEach((log) => {
        const tr = document.createElement("tr");

        const shortPrev = log.prevHash ? log.prevHash.substring(0, 8) + "..." : "GENESIS";
        const shortHash = log.hash ? log.hash.substring(0, 10) + "..." : "NONE";

        tr.innerHTML = `
          <td><strong>${escapeHtml(log.id)}</strong></td>
          <td style="color: var(--text-secondary);">${this.formatDate(log.timestamp)}</td>
          <td><strong>${escapeHtml(log.action)}</strong></td>
          <td style="color: var(--text-secondary); max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(log.details)}</td>
          <td class="hash-cell">${shortPrev}</td>
          <td class="hash-cell ${log.isCorrupt ? "tampered" : ""}">${shortHash}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    renderNotifications(notifications, onMarkRead) {
      const container = document.getElementById("notificationList");
      const badge = document.getElementById("notificationBadge");

      if (badge) {
        badge.textContent = String(notifications.length);
        badge.style.display = notifications.length > 0 ? "flex" : "none";
      }

      if (!container) return;
      container.innerHTML = "";

      if (notifications.length === 0) {
        container.innerHTML = `<p style="font-size: 0.78rem; color: var(--text-muted); text-align: center; padding: 12px;">No new alerts.</p>`;
        return;
      }

      notifications.forEach((n) => {
        const item = document.createElement("div");
        item.className = `notification-item ${n.type || ""}`;
        item.innerHTML = `
          <div class="notification-title">${escapeHtml(n.title)}</div>
          <div class="notification-time">${escapeHtml(n.time)}</div>
        `;
        container.appendChild(item);
      });
    }

    showToast(title, message, type = "info", duration = 4000) {
      if (!this.toastContainer) return;

      const toast = document.createElement("div");
      toast.className = `toast toast-${type}`;

      let iconSvg = "ℹ️";
      if (type === "success") iconSvg = "✓";
      if (type === "warning") iconSvg = "⚠️";
      if (type === "danger") iconSvg = "✕";

      toast.innerHTML = `
        <div style="font-size: 1.1rem; line-height: 1;" aria-hidden="true">${iconSvg}</div>
        <div class="toast-content">
          <h4>${escapeHtml(title)}</h4>
          <p>${escapeHtml(message)}</p>
        </div>
      `;

      this.toastContainer.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
        setTimeout(() => toast.remove(), 250);
      }, duration);
    }

    openModal(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;

      this.lastFocusedElement = document.activeElement;
      this.activeModal = modal;

      modal.removeAttribute("hidden");
      modal.classList.add("active");

      // Trap focus
      const focusable = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        setTimeout(() => focusable[0].focus(), 50);
      }

      // Key listener for Escape and Tab trapping
      modal.onkeydown = (e) => {
        if (e.key === "Escape") {
          this.closeModal(modalId);
        } else if (e.key === "Tab") {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
    }

    closeModal(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;

      modal.classList.remove("active");
      modal.setAttribute("hidden", "true");
      modal.onkeydown = null;

      if (this.lastFocusedElement) {
        this.lastFocusedElement.focus();
        this.lastFocusedElement = null;
      }
      this.activeModal = null;
    }
  }

  // Basic HTML Entity Escaper for DOM injection prevention
  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ========================================================
  // 6. MAIN APPLICATION INITIALIZATION
  // ========================================================

  document.addEventListener("DOMContentLoaded", async () => {
    const ui = new UIRenderer();
    const audit = new AuditChainEngine();

    // Load persisted state or bootstrap
    const rawState = localStorage.getItem(STORAGE_KEY);
    let parsedState = null;
    if (rawState) {
      try {
        parsedState = JSON.parse(rawState);
      } catch (e) {
        console.error(e);
      }
    }

    await audit.init(parsedState ? parsedState.auditLogs : null);

    let pendingReviewTransfer = null;
    let pendingStepUpTransfer = null;
    let otpCountdownInterval = null;
    let notifications = [...INITIAL_NOTIFICATIONS];

    // Theme initialization
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    const auth = new AuthManager({
      onSessionTick: (remaining, total) => {
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

        const countdownEl = document.getElementById("sessionCountdown");
        const pulseEl = document.getElementById("sessionPulse");
        if (countdownEl) countdownEl.textContent = formatted;

        if (pulseEl) {
          if (remaining <= 30) {
            pulseEl.classList.add("warning");
          } else {
            pulseEl.classList.remove("warning");
          }
        }

        if (remaining === 30) {
          ui.openModal("sessionWarningModal");
          ui.showToast(
            "Session Inactivity Warning",
            "Your secure workstation session will automatically expire in 30 seconds.",
            "warning"
          );
        }
      },
      onSessionExpire: () => {
        ui.closeModal("sessionWarningModal");
        ui.showToast("Session Terminated", "You have been logged out due to inactivity.", "danger");
        showLoginModal();
      },
      onSecurityLevelChange: (level, reason) => {
        updateSecurityTierUI(level);
        if (reason) {
          ui.showToast("Security Tier Updated", reason, level === 2 ? "success" : "info");
        }
        refreshDashboard();
      }
    });

    const ledger = new LedgerEngine(auth, audit);

    function updateSecurityTierUI(level) {
      const tierVal = document.getElementById("securityTierVal");
      if (tierVal) {
        if (level === 2) {
          tierVal.textContent = "Level 2 (Elevated)";
          tierVal.className = "tier-val level-2";
        } else {
          tierVal.textContent = "Level 1 (Standard)";
          tierVal.className = "tier-val level-1";
        }
      }
    }

    function refreshDashboard() {
      const metrics = ledger.getMetrics();
      ui.renderMetrics(metrics);

      const categoryData = ledger.getCategoryBreakdown();
      ui.renderCategoryBreakdown(categoryData);

      const query = document.getElementById("searchInput")?.value || "";
      const category = document.getElementById("categoryFilter")?.value || "all";
      const type = document.getElementById("typeFilter")?.value || "all";
      const status = document.getElementById("statusFilter")?.value || "all";
      const sort = document.getElementById("sortFilter")?.value || "date-desc";

      const filtered = ledger.filterTransactions({ query, category, type, status, sort });
      ui.renderLedgerTable(filtered, openTxDetailsModal);
      ui.renderAuditTable(ledger.auditChain.logs);

      // Card widget status
      const cardDisplay = document.getElementById("virtualCardDisplay");
      const cardBadge = document.getElementById("cardStatusBadge");
      const freezeBtn = document.getElementById("btnToggleFreezeCard");

      if (cardDisplay && cardBadge && freezeBtn) {
        if (ledger.cardFrozen) {
          cardDisplay.classList.add("frozen");
          cardBadge.textContent = "Frozen";
          cardBadge.className = "card-status-badge frozen-status";
          freezeBtn.textContent = "Unfreeze Card";
        } else {
          cardDisplay.classList.remove("frozen");
          cardBadge.textContent = "Active";
          cardBadge.className = "card-status-badge active-status";
          freezeBtn.textContent = "Freeze Card";
        }
      }
    }

    // Initialize UI
    updateSecurityTierUI(auth.securityLevel);
    refreshDashboard();
    ui.renderNotifications(notifications);

    // ========================================================
    // EVENT WIRING & CONTROLS
    // ========================================================

    // 1. Account Selection Dropdown
    const accountSelect = document.getElementById("accountSelect");
    if (accountSelect) {
      accountSelect.innerHTML = "";
      ledger.accounts.forEach((acc) => {
        const opt = document.createElement("option");
        opt.value = acc.id;
        opt.textContent = `${acc.name} (${acc.number})`;
        if (acc.id === ledger.activeAccountId) opt.selected = true;
        accountSelect.appendChild(opt);
      });

      accountSelect.addEventListener("change", (e) => {
        ledger.setActiveAccount(e.target.value);
        ui.showToast("Account Switched", `Active view: ${ledger.getActiveAccount().name}`, "info");
        refreshDashboard();
      });
    }

    // 2. Navigation Item Clicks
    const navDashboardLink = document.getElementById("navDashboardLink");
    const navCardsLink = document.getElementById("navCardsLink");
    const navBeneficiariesLink = document.getElementById("navBeneficiariesLink");
    const navAuditLink = document.getElementById("navAuditLink");
    const navTransferLink = document.getElementById("navTransferLink");

    const navItems = [navDashboardLink, navCardsLink, navBeneficiariesLink, navAuditLink, navTransferLink];

    function setActiveNav(selected) {
      navItems.forEach((btn) => {
        if (btn) btn.classList.toggle("active", btn === selected);
      });
    }

    if (navDashboardLink) {
      navDashboardLink.addEventListener("click", () => {
        setActiveNav(navDashboardLink);
        document.getElementById("mainContent").scrollIntoView({ behavior: "smooth" });
      });
    }

    if (navCardsLink) {
      navCardsLink.addEventListener("click", () => {
        setActiveNav(navCardsLink);
        document.getElementById("cardsSection").scrollIntoView({ behavior: "smooth" });
      });
    }

    if (navBeneficiariesLink) {
      navBeneficiariesLink.addEventListener("click", () => {
        setActiveNav(navBeneficiariesLink);
        openBeneficiariesModal();
      });
    }

    if (navAuditLink) {
      navAuditLink.addEventListener("click", () => {
        setActiveNav(navAuditLink);
        document.getElementById("auditSection").scrollIntoView({ behavior: "smooth" });
      });
    }

    if (navTransferLink) {
      navTransferLink.addEventListener("click", () => {
        document.getElementById("btnNewTransfer").click();
      });
    }

    // 3. Search and Filters
    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");
    const typeFilter = document.getElementById("typeFilter");
    const statusFilter = document.getElementById("statusFilter");
    const sortFilter = document.getElementById("sortFilter");

    [searchInput, categoryFilter, typeFilter, statusFilter, sortFilter].forEach((el) => {
      if (!el) return;
      el.addEventListener(el.tagName === "INPUT" ? "input" : "change", () => {
        ui.currentPage = 1;
        const query = searchInput.value;
        const category = categoryFilter.value;
        const type = typeFilter.value;
        const status = statusFilter.value;
        const sort = sortFilter.value;
        const filtered = ledger.filterTransactions({ query, category, type, status, sort });
        ui.renderLedgerTable(filtered, openTxDetailsModal);
      });
    });

    // Pagination controls
    const btnPrevPage = document.getElementById("btnPrevPage");
    const btnNextPage = document.getElementById("btnNextPage");

    if (btnPrevPage) {
      btnPrevPage.addEventListener("click", () => {
        if (ui.currentPage > 1) {
          ui.currentPage--;
          refreshDashboard();
        }
      });
    }
    if (btnNextPage) {
      btnNextPage.addEventListener("click", () => {
        ui.currentPage++;
        refreshDashboard();
      });
    }

    // 4. Transfer Workflow
    const btnNewTransfer = document.getElementById("btnNewTransfer");
    const transferModal = document.getElementById("transferModal");
    const transferForm = document.getElementById("transferForm");
    const transferRecipient = document.getElementById("transferRecipient");
    const transferAmount = document.getElementById("transferAmount");
    const transferCategory = document.getElementById("transferCategory");
    const transferReference = document.getElementById("transferReference");
    const transferPendingHold = document.getElementById("transferPendingHold");
    const transferStepUpNotice = document.getElementById("transferStepUpNotice");
    const stepUpReasonText = document.getElementById("stepUpReasonText");

    function evaluateTransferRisk() {
      const amount = parseFloat(transferAmount.value) || 0;
      const recipient = (transferRecipient.value || "").trim();
      const errorMsg = document.getElementById("amountError");

      const acc = ledger.getActiveAccount();
      if (amount > acc.availableBalance) {
        if (errorMsg) errorMsg.textContent = `Amount exceeds available liquid balance (₹${acc.availableBalance.toFixed(2)})`;
        transferAmount.classList.add("is-invalid");
      } else {
        if (errorMsg) errorMsg.textContent = "";
        transferAmount.classList.remove("is-invalid");
      }

      if (amount > 0 && recipient) {
        const check = ledger.checkStepUpRequired(amount, recipient);
        if (check.required) {
          stepUpReasonText.textContent = check.reason;
          transferStepUpNotice.style.display = "flex";
          return;
        }
      }
      transferStepUpNotice.style.display = "none";
    }

    if (btnNewTransfer) {
      btnNewTransfer.addEventListener("click", () => {
        transferForm.reset();
        document.getElementById("recipientError").textContent = "";
        document.getElementById("amountError").textContent = "";
        transferRecipient.classList.remove("is-invalid");
        transferAmount.classList.remove("is-invalid");
        transferStepUpNotice.style.display = "none";
        ui.openModal("transferModal");
      });
    }

    if (transferRecipient) transferRecipient.addEventListener("input", evaluateTransferRisk);
    if (transferAmount) transferAmount.addEventListener("input", evaluateTransferRisk);

    if (transferForm) {
      transferForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const recipient = transferRecipient.value.trim();
        const amount = parseFloat(transferAmount.value);
        const category = transferCategory.value;
        const reference = transferReference.value.trim();
        const isPending = transferPendingHold.checked;

        let hasError = false;
        if (!recipient) {
          document.getElementById("recipientError").textContent = "Recipient counterparty name is required.";
          transferRecipient.classList.add("is-invalid");
          hasError = true;
        } else {
          document.getElementById("recipientError").textContent = "";
          transferRecipient.classList.remove("is-invalid");
        }

        const acc = ledger.getActiveAccount();
        if (isNaN(amount) || amount <= 0) {
          document.getElementById("amountError").textContent = "Please enter a valid amount greater than zero.";
          transferAmount.classList.add("is-invalid");
          hasError = true;
        } else if (amount > acc.availableBalance) {
          document.getElementById("amountError").textContent = "Insufficient funds in active operating account.";
          transferAmount.classList.add("is-invalid");
          hasError = true;
        } else {
          document.getElementById("amountError").textContent = "";
          transferAmount.classList.remove("is-invalid");
        }

        if (hasError) return;

        // Transition to Review Modal
        pendingReviewTransfer = { recipient, amount, category, reference, isPending };
        ui.closeModal("transferModal");

        document.getElementById("reviewDebitAccount").textContent = `${acc.name} (${acc.number})`;
        document.getElementById("reviewRecipient").textContent = recipient;
        document.getElementById("reviewAmount").textContent = ui.formatCurrency(amount);
        document.getElementById("reviewCategory").textContent = category;
        document.getElementById("reviewReference").textContent = reference || "None";
        document.getElementById("reviewClearingType").textContent = isPending
          ? "24-Hour Hold (Pending Settlement)"
          : "Instant Real-Time Settlement";
        document.getElementById("reviewTotalImpact").textContent = `-${ui.formatCurrency(amount)}`;

        ui.openModal("transferReviewModal");
      });
    }

    const btnBackToTransferEdit = document.getElementById("btnBackToTransferEdit");
    if (btnBackToTransferEdit) {
      btnBackToTransferEdit.addEventListener("click", () => {
        ui.closeModal("transferReviewModal");
        ui.openModal("transferModal");
      });
    }

    const btnConfirmExecuteTransfer = document.getElementById("btnConfirmExecuteTransfer");
    if (btnConfirmExecuteTransfer) {
      btnConfirmExecuteTransfer.addEventListener("click", async () => {
        if (!pendingReviewTransfer) return;

        btnConfirmExecuteTransfer.disabled = true;
        btnConfirmExecuteTransfer.textContent = "Authorizing...";

        const result = await ledger.executeTransfer(pendingReviewTransfer);
        btnConfirmExecuteTransfer.disabled = false;
        btnConfirmExecuteTransfer.textContent = "Confirm & Authorize";

        if (result.requiresStepUp) {
          pendingStepUpTransfer = result.pendingTransferData;
          ui.closeModal("transferReviewModal");

          // Open Step-Up Modal
          document.getElementById("stepUpModalReason").textContent = result.reason;
          document.getElementById("stepUpModalAmount").textContent = ui.formatCurrency(pendingReviewTransfer.amount);
          document.getElementById("stepUpModalRecipient").textContent = pendingReviewTransfer.recipient;

          startStepUpOtpFlow();
          ui.openModal("stepUpModal");
          ui.showToast("Step-Up Challenge", "Level 2 Authorization required to clear this transfer.", "warning");
          return;
        }

        if (!result.success) {
          ui.showToast("Transfer Rejected", result.error, "danger");
          return;
        }

        ui.closeModal("transferReviewModal");
        openReceiptModal(result.transaction);
        refreshDashboard();
      });
    }

    // Step-Up OTP flow timer handler
    function startStepUpOtpFlow() {
      const otpData = auth.issueNewOtp();
      const codeDisplay = document.getElementById("stepUpDemoOtp");
      const timerDisplay = document.getElementById("stepUpOtpTimer");
      const progressBar = document.getElementById("stepUpOtpBar");
      const attemptsDisplay = document.getElementById("stepUpAttemptsLeft");
      const otpInput = document.getElementById("stepUpOtpInput");
      const errorMsg = document.getElementById("stepUpOtpError");

      if (codeDisplay) codeDisplay.textContent = otpData.code;
      if (otpInput) otpInput.value = "";
      if (errorMsg) errorMsg.textContent = "";
      if (attemptsDisplay) attemptsDisplay.textContent = "3 attempts remaining";

      let remainingSecs = OTP_VALIDITY_SECONDS;
      if (otpCountdownInterval) clearInterval(otpCountdownInterval);

      otpCountdownInterval = setInterval(() => {
        remainingSecs--;
        if (timerDisplay) timerDisplay.textContent = `Expires in ${remainingSecs}s`;
        if (progressBar) {
          const pct = Math.max(0, (remainingSecs / OTP_VALIDITY_SECONDS) * 100);
          progressBar.style.width = `${pct}%`;
        }

        if (remainingSecs <= 0) {
          clearInterval(otpCountdownInterval);
          if (timerDisplay) timerDisplay.textContent = "Code Expired";
          if (codeDisplay) codeDisplay.textContent = "EXPIRED";
        }
      }, 1000);
    }

    // 5. Biometric Authenticator Simulation
    const btnBiometricAuth = document.getElementById("btnBiometricAuth");
    if (btnBiometricAuth) {
      btnBiometricAuth.addEventListener("click", () => {
        btnBiometricAuth.classList.add("scanning");
        btnBiometricAuth.disabled = true;

        setTimeout(async () => {
          btnBiometricAuth.classList.remove("scanning");
          btnBiometricAuth.disabled = false;
          auth.elevateStepUp("Biometric (Simulated Passkey/TouchID)");
          ui.closeModal("stepUpModal");

          if (pendingStepUpTransfer) {
            const transferToExecute = pendingStepUpTransfer;
            pendingStepUpTransfer = null;
            const res = await ledger.executeTransfer(transferToExecute);
            if (res.success) {
              openReceiptModal(res.transaction);
              refreshDashboard();
            } else {
              ui.showToast("Execution Error", res.error, "danger");
            }
          } else {
            ui.showToast(
              "Clearance Elevated",
              "You now have Level 2 authorization privileges for 3 minutes.",
              "success"
            );
            refreshDashboard();
          }
        }, 1200);
      });
    }

    // Step-Up OTP Form
    const stepUpOtpForm = document.getElementById("stepUpOtpForm");
    if (stepUpOtpForm) {
      stepUpOtpForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = document.getElementById("stepUpOtpInput");
        const errorMsg = document.getElementById("stepUpOtpError");
        const code = input.value.trim();

        const verifyResult = auth.verifyOtp(code);
        if (!verifyResult.success) {
          errorMsg.textContent = verifyResult.error;
          input.classList.add("is-invalid");
          const attemptsLeft = MAX_OTP_ATTEMPTS - auth.otpAttempts;
          document.getElementById("stepUpAttemptsLeft").textContent =
            attemptsLeft > 0 ? `${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining` : "Locked";
          return;
        }

        auth.elevateStepUp("Cryptographic SMS/TOTP Passcode");
        ui.closeModal("stepUpModal");

        if (pendingStepUpTransfer) {
          const transferToExecute = pendingStepUpTransfer;
          pendingStepUpTransfer = null;
          const res = await ledger.executeTransfer(transferToExecute);
          if (res.success) {
            openReceiptModal(res.transaction);
            refreshDashboard();
          }
        }
      });
    }

    const btnResendStepUpOtp = document.getElementById("btnResendStepUpOtp");
    if (btnResendStepUpOtp) {
      btnResendStepUpOtp.addEventListener("click", () => {
        if (!auth.canResendOtp()) {
          ui.showToast("Cooldown Active", `Please wait ${auth.getResendWaitSeconds()}s before requesting a new code.`, "warning");
          return;
        }
        startStepUpOtpFlow();
        ui.showToast("Passcode Re-issued", "A new cryptographic verification code has been generated.", "info");
      });
    }

    // Receipt Modal Renderer
    function openReceiptModal(tx) {
      const acc = ledger.getActiveAccount();
      document.getElementById("receiptRefId").textContent = `REF: ${tx.id}`;
      document.getElementById("receiptTimestamp").textContent = ui.formatDate(tx.timestamp);
      document.getElementById("receiptRecipient").textContent = tx.counterparty;
      document.getElementById("receiptAccount").textContent = `${acc.name} (${acc.number})`;
      document.getElementById("receiptAmount").textContent = `-${ui.formatCurrency(tx.amount)}`;
      document.getElementById("receiptCategory").textContent = tx.category;
      document.getElementById("receiptAuthLevel").textContent = tx.isStepUpAuthorized
        ? "Level 2 (Step-Up Authenticated)"
        : "Level 1 (Standard Verification)";
      document.getElementById("receiptStatus").textContent = tx.status.toUpperCase();
      document.getElementById("receiptNewBalance").textContent = ui.formatCurrency(tx.runningBalance);

      ui.openModal("receiptModal");
    }

    // Download Receipt action
    const btnDownloadReceipt = document.getElementById("btnDownloadReceipt");
    if (btnDownloadReceipt) {
      btnDownloadReceipt.addEventListener("click", () => {
        const text = `
==================================================
        SECURELEDGER TRANSACTION RECEIPT
==================================================
Reference ID : ${document.getElementById("receiptRefId").textContent}
Timestamp    : ${document.getElementById("receiptTimestamp").textContent}
Beneficiary  : ${document.getElementById("receiptRecipient").textContent}
Source Acct  : ${document.getElementById("receiptAccount").textContent}
Amount       : ${document.getElementById("receiptAmount").textContent}
Category     : ${document.getElementById("receiptCategory").textContent}
Status       : ${document.getElementById("receiptStatus").textContent}
Clearance    : ${document.getElementById("receiptAuthLevel").textContent}
New Balance  : ${document.getElementById("receiptNewBalance").textContent}
--------------------------------------------------
Cryptographic Integrity: Verified via WebCrypto SHA-256
SIMULATED FINTECH LEDGER • EDUCATIONAL DEMONSTRATION
==================================================
        `.trim();

        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `SecureLedger_Receipt_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        ui.showToast("Receipt Downloaded", "Transaction record exported as text statement.", "success");
      });
    }

    // Transaction Details Inspector Modal
    function openTxDetailsModal(tx) {
      const grid = document.getElementById("txDetailGrid");
      if (!grid) return;

      grid.innerHTML = `
        <div class="detail-item">
          <span class="detail-label">Reference ID</span>
          <span class="detail-val" style="font-family: var(--font-mono); color: var(--accent-cyan);">${escapeHtml(tx.id)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Status</span>
          <span class="detail-val">${tx.status === "settled" ? "Cleared & Settled" : "Pending Authorization Hold"}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Timestamp</span>
          <span class="detail-val">${ui.formatDate(tx.timestamp)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Counterparty</span>
          <span class="detail-val">${escapeHtml(tx.counterparty)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Category</span>
          <span class="detail-val">${escapeHtml(tx.category)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Direction</span>
          <span class="detail-val">${tx.direction.toUpperCase()}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Amount</span>
          <span class="detail-val" style="font-family: var(--font-mono); font-size: 1.1rem; color: ${tx.direction === "credit" ? "var(--color-success)" : "var(--text-primary)"}">
            ${tx.direction === "credit" ? "+" : "-"}${ui.formatCurrency(tx.amount)}
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Running Balance</span>
          <span class="detail-val" style="font-family: var(--font-mono);">${ui.formatCurrency(tx.runningBalance)}</span>
        </div>
        <div class="detail-item" style="grid-column: span 2;">
          <span class="detail-label">Payment Memo / Reference</span>
          <span class="detail-val">${escapeHtml(tx.reference || "None")}</span>
        </div>
        <div class="detail-item" style="grid-column: span 2;">
          <span class="detail-label">Security Authorization Level</span>
          <span class="detail-val">${tx.isStepUpAuthorized ? "Level 2 (Elevated Step-Up Challenge Passed)" : "Level 1 (Standard Clearance)"}</span>
        </div>
      `;

      ui.openModal("txDetailsModal");
    }

    // 6. Beneficiaries Management Modal
    function openBeneficiariesModal() {
      const container = document.getElementById("beneficiaryList");
      if (!container) return;

      container.innerHTML = "";
      ledger.beneficiaries.forEach((ben) => {
        const item = document.createElement("div");
        item.className = "beneficiary-item";

        const badgeClass = ben.isVerified ? "badge-settled" : "badge-pending";
        const badgeLabel = ben.isVerified ? "Verified" : "Unverified";

        item.innerHTML = `
          <div>
            <strong>${escapeHtml(ben.name)}</strong>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(ben.category)} • Routing: ${escapeHtml(ben.routing)}</div>
          </div>
          <span class="tx-badge ${badgeClass}">${badgeLabel}</span>
        `;
        container.appendChild(item);
      });

      ui.openModal("beneficiariesModal");
    }

    const btnOpenBeneficiaries = document.getElementById("btnOpenBeneficiaries");
    if (btnOpenBeneficiaries) {
      btnOpenBeneficiaries.addEventListener("click", openBeneficiariesModal);
    }

    const addBeneficiaryForm = document.getElementById("addBeneficiaryForm");
    if (addBeneficiaryForm) {
      addBeneficiaryForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const nameInput = document.getElementById("newPayeeName");
        const catInput = document.getElementById("newPayeeCategory");
        const name = nameInput.value.trim();

        if (name) {
          ledger.addBeneficiary(name, catInput.value, `HDFC000${Math.floor(1000 + Math.random() * 9000)}`, false);
          nameInput.value = "";
          openBeneficiariesModal();
          ui.showToast("Payee Added", `"${name}" added as unverified payee. High-value wires will require Level 2 Step-Up.`, "info");
        }
      });
    }

    // 7. Virtual Corporate Card Controls
    const btnToggleFreezeCard = document.getElementById("btnToggleFreezeCard");
    if (btnToggleFreezeCard) {
      btnToggleFreezeCard.addEventListener("click", async () => {
        if (auth.securityLevel < 2) {
          document.getElementById("stepUpModalReason").textContent =
            "Modifying corporate card security lock status requires Level 2 Step-Up clearance.";
          document.getElementById("stepUpModalAmount").textContent = "N/A (Card Security)";
          document.getElementById("stepUpModalRecipient").textContent = "Corporate Card •••• 4028";
          startStepUpOtpFlow();
          ui.openModal("stepUpModal");
          ui.showToast("Security Clearance Required", "Level 2 Step-Up required to alter card freeze status.", "warning");
          return;
        }

        const isFrozen = await ledger.toggleCardFreeze();
        refreshDashboard();
        ui.showToast(
          isFrozen ? "Card Locked" : "Card Unfrozen",
          isFrozen
            ? "Corporate Virtual Card •••• 4028 has been locked against all debits."
            : "Corporate Virtual Card •••• 4028 is active.",
          isFrozen ? "warning" : "success"
        );
      });
    }

    // 8. Cryptographic Hash Chain Verification & Tamper Simulation
    async function runChainVerification() {
      const banner = document.getElementById("auditStatusBanner");
      const title = document.getElementById("auditBannerTitle");
      const desc = document.getElementById("auditBannerDesc");

      const check = await ledger.auditChain.verifyIntegrity();

      if (check.isValid) {
        banner.className = "audit-status-banner status-verified";
        title.textContent = `Cryptographic Verification Passed: All ${check.count} Blocks Valid`;
        desc.textContent = "Every block's SHA-256 hash matches the previous block linkage perfectly.";
        ui.showToast("Integrity Verified", "Cryptographic chain is unbroken and 100% authentic.", "success");
      } else {
        banner.className = "audit-status-banner status-compromised";
        title.textContent = "INTEGRITY ALERT: Cryptographic Tampering Detected!";
        desc.textContent = `${check.reason} (Failed at block index ${check.brokenIndex})`;
        ui.showToast("Integrity Failure", check.reason, "danger");
      }
      ui.renderAuditTable(ledger.auditChain.logs);
    }

    const btnVerifyChain = document.getElementById("btnVerifyChain");
    if (btnVerifyChain) btnVerifyChain.addEventListener("click", runChainVerification);

    const btnVerifyChainTop = document.getElementById("btnVerifyChainTop");
    if (btnVerifyChainTop) btnVerifyChainTop.addEventListener("click", runChainVerification);

    const btnSimulateTamper = document.getElementById("btnSimulateTamper");
    if (btnSimulateTamper) {
      btnSimulateTamper.addEventListener("click", () => {
        const tampered = ledger.auditChain.tamperBlockForDemo(1);
        if (tampered) {
          ui.showToast(
            "Block Mutated",
            "Block-001 payload modified without recomputing hashes. Click 'Verify Log Integrity' to observe detection.",
            "warning"
          );
          runChainVerification();
        }
      });
    }

    // 9. Simulation & Sandbox Actions (Top Banner & Sidebar Toolkit)
    const handleDepositSim = async () => {
      await ledger.simulateDeposit(2500.0, "TechCorp Enterprise Wire");
      ui.showToast("Inflow Received", `Received +${ui.formatCurrency(2500)} via RTGS Wire.`, "success");
      refreshDashboard();
    };

    const handleStepUpSim = () => {
      pendingStepUpTransfer = {
        recipient: "Apex Global Logistics",
        amount: 5000.0,
        category: "Transfer",
        reference: "Sandbox Step-Up Test Wire",
        isPending: false
      };

      document.getElementById("stepUpModalReason").textContent =
        "Simulated high-value transfer (₹5,000.00) exceeds standard authorization threshold.";
      document.getElementById("stepUpModalAmount").textContent = ui.formatCurrency(5000);
      document.getElementById("stepUpModalRecipient").textContent = "Apex Global Logistics";

      startStepUpOtpFlow();
      ui.openModal("stepUpModal");
      ui.showToast("Security Challenge", "Step-up challenge simulation opened.", "info");
    };

    const handleResetSim = async () => {
      localStorage.removeItem(STORAGE_KEY);
      ledger.resetToDefaults();
      await audit.createGenesisBlock();
      auth.securityLevel = 1;
      updateSecurityTierUI(1);
      refreshDashboard();
      ui.showToast("Data Reset", "All balances, transactions, and audit records restored to factory defaults.", "info");
    };

    // Wire Top Banner Controls
    const btnSimulateDeposit = document.getElementById("btnSimulateDeposit");
    if (btnSimulateDeposit) btnSimulateDeposit.addEventListener("click", handleDepositSim);

    const btnTriggerStepUpTest = document.getElementById("btnTriggerStepUpTest");
    if (btnTriggerStepUpTest) btnTriggerStepUpTest.addEventListener("click", handleStepUpSim);

    const btnResetDemoState = document.getElementById("btnResetDemoState");
    if (btnResetDemoState) btnResetDemoState.addEventListener("click", handleResetSim);

    // Wire Sidebar Toolkit Controls
    const btnSidebarDeposit = document.getElementById("btnSidebarDeposit");
    if (btnSidebarDeposit) btnSidebarDeposit.addEventListener("click", handleDepositSim);

    const btnSidebarStepUp = document.getElementById("btnSidebarStepUp");
    if (btnSidebarStepUp) btnSidebarStepUp.addEventListener("click", handleStepUpSim);

    const btnSidebarVerifyChain = document.getElementById("btnSidebarVerifyChain");
    if (btnSidebarVerifyChain) btnSidebarVerifyChain.addEventListener("click", runChainVerification);

    const btnSidebarReset = document.getElementById("btnSidebarReset");
    if (btnSidebarReset) btnSidebarReset.addEventListener("click", handleResetSim);

    const btnExportCSV = document.getElementById("btnExportCSV");
    if (btnExportCSV) {
      btnExportCSV.addEventListener("click", () => {
        ledger.exportToCSV();
        ui.showToast("Statement Exported", "Sanitized transaction records downloaded as CSV.", "success");
      });
    }

    // 11. Notifications Dropdown
    const btnNotificationBell = document.getElementById("btnNotificationBell");
    const notificationDropdown = document.getElementById("notificationDropdown");
    const btnMarkAllRead = document.getElementById("btnMarkAllRead");

    if (btnNotificationBell && notificationDropdown) {
      btnNotificationBell.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = notificationDropdown.hasAttribute("hidden");
        if (isHidden) {
          notificationDropdown.removeAttribute("hidden");
          btnNotificationBell.setAttribute("aria-expanded", "true");
        } else {
          notificationDropdown.setAttribute("hidden", "true");
          btnNotificationBell.setAttribute("aria-expanded", "false");
        }
      });

      document.addEventListener("click", (e) => {
        if (!notificationDropdown.contains(e.target) && e.target !== btnNotificationBell) {
          notificationDropdown.setAttribute("hidden", "true");
          btnNotificationBell.setAttribute("aria-expanded", "false");
        }
      });
    }

    if (btnMarkAllRead) {
      btnMarkAllRead.addEventListener("click", () => {
        notifications = [];
        ui.renderNotifications(notifications);
        ui.showToast("Notifications Cleared", "All alerts marked as read.", "info");
      });
    }

    // 11. Theme Switcher (Dark / Light)
    const btnThemeToggle = document.getElementById("btnThemeToggle");
    if (btnThemeToggle) {
      btnThemeToggle.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
        ui.showToast("Theme Changed", `Switched to ${newTheme} mode.`, "info");
      });
    }

    // 12. Session Inactivity Modal Action
    const btnExtendSession = document.getElementById("btnExtendSession");
    if (btnExtendSession) {
      btnExtendSession.addEventListener("click", () => {
        auth.extendSession();
        ui.closeModal("sessionWarningModal");
        ui.showToast("Session Refreshed", "Your security timeout has been reset to 4 minutes.", "success");
      });
    }

    // 13. Sign-Out & Sign-In Modals
    const btnLogout = document.getElementById("btnLogout");
    if (btnLogout) {
      btnLogout.addEventListener("click", () => {
        auth.logout();
        showLoginModal();
      });
    }

    function showLoginModal() {
      ui.openModal("loginModal");
      document.getElementById("loginCredentialsStep").style.display = "block";
      document.getElementById("loginMfaStep").style.display = "none";
    }

    const btnTogglePassword = document.getElementById("btnTogglePassword");
    const loginPassword = document.getElementById("loginPassword");
    if (btnTogglePassword && loginPassword) {
      btnTogglePassword.addEventListener("click", () => {
        const isPassword = loginPassword.type === "password";
        loginPassword.type = isPassword ? "text" : "password";
      });
    }

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const custId = document.getElementById("loginCustomerId").value.trim();
        const pass = loginPassword.value.trim();

        const res = auth.login(custId, pass);
        if (res.requiresMfa) {
          document.getElementById("loginCredentialsStep").style.display = "none";
          document.getElementById("loginMfaStep").style.display = "block";
          document.getElementById("loginDemoMfaCode").textContent = res.code;
          startLoginOtpTimer();
          ui.showToast("MFA Security Code Sent", `Simulated passcode: ${res.code}`, "info");
        } else {
          ui.showToast("Sign-In Error", res.error, "danger");
        }
      });
    }

    let loginOtpInterval = null;
    function startLoginOtpTimer() {
      let remaining = OTP_VALIDITY_SECONDS;
      const timerEl = document.getElementById("loginMfaTimer");
      const barEl = document.getElementById("loginMfaBar");
      const codeEl = document.getElementById("loginDemoMfaCode");

      if (loginOtpInterval) clearInterval(loginOtpInterval);
      loginOtpInterval = setInterval(() => {
        remaining--;
        if (timerEl) timerEl.textContent = `Expires in ${remaining}s`;
        if (barEl) barEl.style.width = `${Math.max(0, (remaining / OTP_VALIDITY_SECONDS) * 100)}%`;

        if (remaining <= 0) {
          clearInterval(loginOtpInterval);
          if (timerEl) timerEl.textContent = "Expired";
          if (codeEl) codeEl.textContent = "EXPIRED";
        }
      }, 1000);
    }

    const btnResendLoginMfa = document.getElementById("btnResendLoginMfa");
    if (btnResendLoginMfa) {
      btnResendLoginMfa.addEventListener("click", () => {
        if (!auth.canResendOtp()) {
          ui.showToast("Cooldown Active", `Please wait ${auth.getResendWaitSeconds()}s.`, "warning");
          return;
        }
        const newOtp = auth.issueNewOtp();
        document.getElementById("loginDemoMfaCode").textContent = newOtp.code;
        startLoginOtpTimer();
        ui.showToast("Code Resent", "A new passcode has been issued.", "info");
      });
    }

    const mfaLoginForm = document.getElementById("mfaLoginForm");
    if (mfaLoginForm) {
      mfaLoginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById("loginMfaInput");
        const code = input.value.trim();

        const res = auth.completeLoginMfa(code);
        if (res.success) {
          if (loginOtpInterval) clearInterval(loginOtpInterval);
          ui.closeModal("loginModal");
          ui.showToast("Authentication Successful", `Welcome back, ${auth.currentUser.name}.`, "success");
          refreshDashboard();
        } else {
          document.getElementById("loginMfaError").textContent = res.error;
          input.classList.add("is-invalid");
          const remainingAttempts = MAX_OTP_ATTEMPTS - auth.otpAttempts;
          document.getElementById("loginAttemptsLeft").textContent =
            remainingAttempts > 0 ? `${remainingAttempts} attempts remaining` : "Session Locked";
          ui.showToast("MFA Verification Failed", res.error, "danger");
        }
      });
    }

    // Modal Close Button Delegation
    document.querySelectorAll("[data-close]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const modalId = btn.getAttribute("data-close");
        ui.closeModal(modalId);
      });
    });

    // Mobile Sidebar Drawer
    const mobileToggle = document.getElementById("mobileToggle");
    const sidebar = document.getElementById("sidebar");
    const sidebarBackdrop = document.getElementById("sidebarBackdrop");

    if (mobileToggle && sidebar && sidebarBackdrop) {
      const toggleSidebar = () => {
        const isOpen = sidebar.classList.toggle("open");
        sidebarBackdrop.classList.toggle("active", isOpen);
      };

      mobileToggle.addEventListener("click", toggleSidebar);
      sidebarBackdrop.addEventListener("click", toggleSidebar);

      // Close mobile drawer when a navigation item or tool is tapped
      const closeSidebarOnMobile = () => {
        if (window.innerWidth <= 1024 && sidebar.classList.contains("open")) {
          sidebar.classList.remove("open");
          sidebarBackdrop.classList.remove("active");
        }
      };

      document.querySelectorAll(".nav-item, .sidebar-tool-btn").forEach((el) => {
        el.addEventListener("click", closeSidebarOnMobile);
      });
    }
  });
})();
