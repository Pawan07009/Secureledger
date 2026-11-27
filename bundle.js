// Meridian Treasury OS - Core Bundle
// Self-contained architecture supporting both HTTP and local file:// execution

// ==========================================
// 1. MOCK DATA & SEED STATE
// ==========================================
const DEFAULT_ACCOUNTS = [
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

const INITIAL_TRANSACTIONS = [
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

const KNOWN_PAYEES = [
  { id: "p_1", name: "Apex Global Logistics", isVerified: true },
  { id: "p_2", name: "CyberDefend Security LLC", isVerified: true },
  { id: "p_3", name: "Venture Real Estate Trust", isVerified: true },
  { id: "p_4", name: "Custom Contractor (Unverified)", isVerified: false }
];

const INITIAL_AUDIT_LOGS = [
  { id: "log_1", action: "User Login", details: "MFA Token Verified (2FA Level 1)", time: "Just now" },
  { id: "log_2", action: "Session Initialized", details: "TLS 1.3 / AES-256 Validated", time: "2 mins ago" },
  { id: "log_3", action: "Step-Up Escalation", details: "Wire Transfer #tx_99810 approved via Biometrics", time: "1 day ago" }
];

// ==========================================
// 2. AUTHENTICATION & MFA ENGINE
// ==========================================
class AuthManager {
  constructor(callbacks = {}) {
    this.isAuthenticated = true;
    this.currentUser = {
      name: "Alex Sterling",
      email: "alex.sterling@meridianbank.io",
      role: "Enterprise Treasury Admin",
      customerId: "CUST-90241"
    };
    
    this.securityLevel = 1; // Level 1 = Standard, Level 2 = Step-Up Elevated
    this.stepUpExpiresAt = null;
    
    this.sessionTotalSeconds = 240;
    this.sessionRemaining = 240;
    this.timerInterval = null;
    
    this.currentMfaCode = this.generate6DigitCode();
    this.mfaCodeExpiresAt = Date.now() + 60000;
    
    this.callbacks = callbacks;
    this.initSessionTimer();
    this.setupActivityListener();
  }

  generate6DigitCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  refreshMfaCode() {
    this.currentMfaCode = this.generate6DigitCode();
    this.mfaCodeExpiresAt = Date.now() + 60000;
    return this.currentMfaCode;
  }

  initSessionTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    this.timerInterval = setInterval(() => {
      if (!this.isAuthenticated) return;
      
      this.sessionRemaining--;
      
      if (this.securityLevel === 2 && this.stepUpExpiresAt && Date.now() > this.stepUpExpiresAt) {
        this.securityLevel = 1;
        this.stepUpExpiresAt = null;
        if (this.callbacks.onSecurityLevelChange) {
          this.callbacks.onSecurityLevelChange(this.securityLevel, "Step-Up token expired. Reverted to Level 1.");
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

  setupActivityListener() {
    const resetIdle = () => {
      if (this.isAuthenticated && this.sessionRemaining > 15) {
        if (this.sessionRemaining < this.sessionTotalSeconds - 30) {
          this.sessionRemaining = this.sessionTotalSeconds;
        }
      }
    };
    window.addEventListener("click", resetIdle, { passive: true });
    window.addEventListener("keydown", resetIdle, { passive: true });
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
    if (this.callbacks.onSessionExpire) {
      this.callbacks.onSessionExpire();
    }
  }

  login(customerId, password) {
    if (customerId && password) {
      this.isAuthenticated = false;
      this.refreshMfaCode();
      return { success: true, requiresMfa: true, code: this.currentMfaCode };
    }
    return { success: false, error: "Invalid credentials." };
  }

  verifyMfa(enteredCode) {
    if (enteredCode === this.currentMfaCode) {
      this.isAuthenticated = true;
      this.securityLevel = 1;
      this.sessionRemaining = this.sessionTotalSeconds;
      this.initSessionTimer();
      if (this.callbacks.onAuditLog) {
        this.callbacks.onAuditLog("Login MFA Verified", "Multi-Factor Authentication completed successfully.");
      }
      return { success: true };
    }
    return { success: false, error: "Invalid verification code. Please check your simulated OTP code." };
  }

  elevateStepUp(method = "biometric") {
    this.securityLevel = 2;
    this.stepUpExpiresAt = Date.now() + 180000;
    
    if (this.callbacks.onSecurityLevelChange) {
      this.callbacks.onSecurityLevelChange(2, `Elevated to Level 2 via ${method}`);
    }
    if (this.callbacks.onAuditLog) {
      this.callbacks.onAuditLog("Step-Up Elevated", `Contextual authorization granted using ${method}.`);
    }
    return true;
  }

  logout() {
    this.isAuthenticated = false;
    this.securityLevel = 1;
    clearInterval(this.timerInterval);
    if (this.callbacks.onSessionExpire) {
      this.callbacks.onSessionExpire();
    }
  }
}

// ==========================================
// 3. LEDGER & BALANCE COMPUTATION ENGINE
// ==========================================
class LedgerEngine {
  constructor(authManager) {
    this.authManager = authManager;
    this.STORAGE_KEY = "meridian_banking_ledger_state_v2";
    this.STEP_UP_THRESHOLD = 1000.00;
    this.loadState();
  }

  loadState() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.accounts = parsed.accounts || JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
        this.transactions = parsed.transactions || JSON.parse(JSON.stringify(INITIAL_TRANSACTIONS));
        this.auditLogs = parsed.auditLogs || JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
        this.activeAccountId = parsed.activeAccountId || this.accounts[0].id;
        return;
      } catch (e) {
        console.error("Failed to parse saved state, resetting:", e);
      }
    }
    this.resetToDefault();
  }

  saveState() {
    const data = {
      accounts: this.accounts,
      transactions: this.transactions,
      auditLogs: this.auditLogs,
      activeAccountId: this.activeAccountId
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  resetToDefault() {
    this.accounts = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
    this.transactions = JSON.parse(JSON.stringify(INITIAL_TRANSACTIONS));
    this.auditLogs = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
    this.activeAccountId = this.accounts[0].id;
    this.saveState();
  }

  getActiveAccount() {
    return this.accounts.find(a => a.id === this.activeAccountId) || this.accounts[0];
  }

  setActiveAccount(accountId) {
    if (this.accounts.some(a => a.id === accountId)) {
      this.activeAccountId = accountId;
      this.saveState();
    }
  }

  getMetrics() {
    const acc = this.getActiveAccount();
    const accountTxs = this.transactions.filter(t => t.accountId === acc.id);
    
    let totalInflow = 0;
    let totalOutflow = 0;

    accountTxs.forEach(tx => {
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

  checkStepUpRequired(amount, payeeName) {
    const knownPayee = KNOWN_PAYEES.find(p => p.name.toLowerCase() === payeeName.toLowerCase());
    const isUnverifiedPayee = !knownPayee || !knownPayee.isVerified;
    const isHighValue = amount >= this.STEP_UP_THRESHOLD;

    return {
      required: (isHighValue || isUnverifiedPayee) && this.authManager.securityLevel < 2,
      reason: isHighValue 
        ? `Transfer of ₹${amount.toFixed(2)} exceeds the unverified threshold (₹${this.STEP_UP_THRESHOLD.toFixed(2)}).`
        : `Payee "${payeeName}" is not on your pre-cleared whitelist.`
    };
  }

  executeTransfer({ recipient, amount, category, reference, isPending = false }) {
    const acc = this.getActiveAccount();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      return { success: false, error: "Please enter a valid transfer amount." };
    }

    if (numAmount > acc.availableBalance) {
      return { 
        success: false, 
        error: `Insufficient available funds. Available: ₹${acc.availableBalance.toFixed(2)}, Requested: ₹${numAmount.toFixed(2)}` 
      };
    }

    const stepUpCheck = this.checkStepUpRequired(numAmount, recipient);
    if (stepUpCheck.required) {
      return {
        success: false,
        requiresStepUp: true,
        reason: stepUpCheck.reason,
        pendingTransferData: { recipient, amount: numAmount, category, reference, isPending }
      };
    }

    acc.availableBalance -= numAmount;
    if (isPending) {
      acc.pendingHold += numAmount;
    } else {
      acc.settledBalance -= numAmount;
    }

    const newTx = {
      id: "tx_" + Math.floor(10000 + Math.random() * 90000),
      accountId: acc.id,
      title: recipient,
      category: category || "Transfer",
      direction: "debit",
      amount: numAmount,
      status: isPending ? "pending" : "settled",
      timestamp: new Date().toISOString(),
      counterparty: recipient,
      runningBalance: acc.availableBalance,
      isStepUpAuthorized: this.authManager.securityLevel >= 2
    };

    this.transactions.unshift(newTx);
    this.addAuditLog(
      `Transfer Executed: ₹${numAmount.toFixed(2)}`,
      `Debited to ${recipient}. Authorization: Level ${this.authManager.securityLevel}`
    );

    this.saveState();
    return { success: true, transaction: newTx };
  }

  simulateIncomingDeposit(amount = 2500.00, sender = "TechCorp Enterprise Wire") {
    const acc = this.getActiveAccount();
    const numAmount = parseFloat(amount);

    acc.availableBalance += numAmount;
    acc.settledBalance += numAmount;

    const newTx = {
      id: "tx_" + Math.floor(10000 + Math.random() * 90000),
      accountId: acc.id,
      title: sender,
      category: "Income",
      direction: "credit",
      amount: numAmount,
      status: "settled",
      timestamp: new Date().toISOString(),
      counterparty: sender,
      runningBalance: acc.availableBalance,
      isStepUpAuthorized: false
    };

    this.transactions.unshift(newTx);
    this.addAuditLog(`Incoming Wire Received: +₹${numAmount.toFixed(2)}`, `From ${sender}`);
    this.saveState();
    return newTx;
  }

  addAuditLog(action, details) {
    const log = {
      id: "log_" + Date.now(),
      action,
      details,
      time: "Just now"
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 20) this.auditLogs.pop();
    this.saveState();
  }

  filterTransactions({ query = "", category = "all", type = "all", status = "all" }) {
    const acc = this.getActiveAccount();
    return this.transactions.filter(tx => {
      if (tx.accountId !== acc.id) return false;

      if (query.trim()) {
        const q = query.toLowerCase();
        const matchesTitle = tx.title.toLowerCase().includes(q);
        const matchesCounterparty = tx.counterparty.toLowerCase().includes(q);
        const matchesCategory = tx.category.toLowerCase().includes(q);
        const matchesAmount = tx.amount.toString().includes(q);
        if (!matchesTitle && !matchesCounterparty && !matchesCategory && !matchesAmount) {
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
  }

  exportToCSV() {
    const acc = this.getActiveAccount();
    const txs = this.transactions.filter(t => t.accountId === acc.id);
    
    const headers = ["Transaction ID", "Date", "Description", "Category", "Type", "Amount (INR)", "Status", "Running Balance (INR)"];
    const rows = txs.map(t => [
      t.id,
      new Date(t.timestamp).toLocaleDateString(),
      `"${t.title.replace(/"/g, '""')}"`,
      t.category,
      t.direction.toUpperCase(),
      t.amount.toFixed(2),
      t.status.toUpperCase(),
      t.runningBalance.toFixed(2)
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Meridian_Ledger_Statement_${acc.number.replace(/\s+/g, '')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// ==========================================
// 4. UI RENDERER & INTERACTION SYSTEM
// ==========================================
class UIRenderer {
  constructor() {
    this.toastContainer = document.getElementById("toastContainer");
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
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  animateValue(element, start, end, duration = 800) {
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
    this.animateValue(availEl, prevAvail, metrics.availableBalance);

    if (settledEl) settledEl.textContent = this.formatCurrency(metrics.settledBalance);
    if (pendingEl) pendingEl.textContent = this.formatCurrency(metrics.pendingHold);
    if (inflowEl) inflowEl.textContent = this.formatCurrency(metrics.totalInflow);
    if (outflowEl) outflowEl.textContent = this.formatCurrency(metrics.totalOutflow);

    const totalVolume = metrics.totalInflow + metrics.totalOutflow;
    if (totalVolume > 0 && cashflowFillIn && cashflowFillOut) {
      const inPct = (metrics.totalInflow / totalVolume) * 100;
      const outPct = (metrics.totalOutflow / totalVolume) * 100;
      cashflowFillIn.style.width = `${inPct}%`;
      cashflowFillOut.style.width = `${outPct}%`;
    }
  }

  renderLedgerTable(transactions) {
    const tbody = document.getElementById("ledgerTableBody");
    const countBadge = document.getElementById("ledgerCountBadge");
    
    if (countBadge) {
      countBadge.textContent = `${transactions.length} records`;
    }

    if (!tbody) return;
    tbody.innerHTML = "";

    if (transactions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-ledger">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <p>No transactions match your search or filter criteria.</p>
          </td>
        </tr>
      `;
      return;
    }

    transactions.forEach(tx => {
      const tr = document.createElement("tr");
      
      const isCredit = tx.direction === "credit";
      const sign = isCredit ? "+" : "-";
      const iconClass = isCredit ? "income" : (tx.category === "Transfer" ? "transfer" : "expense");
      const iconSymbol = isCredit ? "↓" : (tx.category === "Transfer" ? "⇄" : "↑");
      
      const statusBadge = tx.status === "settled" 
        ? `<span class="tx-badge badge-settled">Settled</span>`
        : `<span class="tx-badge badge-pending">Pending Hold</span>`;

      const stepUpBadge = tx.isStepUpAuthorized 
        ? `<span class="tx-badge badge-stepup" title="Level 2 Step-Up Verified">🛡️ Level 2</span>` 
        : "";

      tr.innerHTML = `
        <td>
          <div class="tx-main">
            <div class="tx-icon ${iconClass}">${iconSymbol}</div>
            <div class="tx-details">
              <span class="tx-title">${tx.title}</span>
              <span class="tx-meta">
                <span>${tx.counterparty}</span>
                <span>•</span>
                <span>${tx.category}</span>
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
            ${statusBadge}
            ${stepUpBadge}
          </div>
        </td>
        <td>
          <span class="tx-amount ${isCredit ? 'credit' : 'debit'}">
            ${sign}${this.formatCurrency(tx.amount)}
          </span>
        </td>
        <td>
          <span class="tx-running-balance">
            ${this.formatCurrency(tx.runningBalance)}
          </span>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderAuditLogs(logs) {
    const container = document.getElementById("auditLogList");
    if (!container) return;
    container.innerHTML = "";

    logs.slice(0, 5).forEach(log => {
      const item = document.createElement("div");
      item.className = "audit-item";
      item.innerHTML = `
        <div class="audit-desc">
          <span style="font-weight: 600; color: var(--text-primary);">${log.action}</span>
          <span style="font-size: 0.72rem; color: var(--text-secondary);">${log.details}</span>
        </div>
        <span class="audit-time">${log.time}</span>
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
      <div style="font-size: 1.1rem; line-height: 1;">${iconSvg}</div>
      <div class="toast-content">
        <h4>${title}</h4>
        <p>${message}</p>
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
    if (modal) {
      modal.classList.add("active");
      const firstInput = modal.querySelector("input:not([type=hidden]), button.btn-primary");
      if (firstInput) setTimeout(() => firstInput.focus(), 50);
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("active");
    }
  }
}

// ==========================================
// 5. APPLICATION INITIALIZATION & EVENT WIRING
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const ui = new UIRenderer();
  let pendingTransferData = null;

  const auth = new AuthManager({
    onSessionTick: (remaining, total) => {
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      
      const sessionCountdown = document.getElementById("sessionCountdown");
      const sessionPulse = document.getElementById("sessionPulse");
      if (sessionCountdown) sessionCountdown.textContent = formatted;
      
      if (sessionPulse) {
        if (remaining <= 30) {
          sessionPulse.classList.add("warning");
        } else {
          sessionPulse.classList.remove("warning");
        }
      }

      if (remaining === 30) {
        ui.openModal("sessionWarningModal");
        ui.showToast("Session Inactivity Warning", "Your secure session will terminate in 30 seconds.", "warning");
      }
    },
    onSessionExpire: () => {
      ui.closeModal("sessionWarningModal");
      ui.showToast("Session Expired", "You have been logged out due to inactivity.", "danger");
      showLoginView();
    },
    onSecurityLevelChange: (level, reason) => {
      updateSecurityTierUI(level);
      if (reason) {
        ui.showToast("Security Tier Updated", reason, level === 2 ? "success" : "info");
      }
    },
    onAuditLog: (action, details) => {
      ledger.addAuditLog(action, details);
      ui.renderAuditLogs(ledger.auditLogs);
    }
  });

  const ledger = new LedgerEngine(auth);

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
    
    const query = document.getElementById("searchInput")?.value || "";
    const category = document.getElementById("categoryFilter")?.value || "all";
    const type = document.getElementById("typeFilter")?.value || "all";
    const status = document.getElementById("statusFilter")?.value || "all";

    const filtered = ledger.filterTransactions({ query, category, type, status });
    ui.renderLedgerTable(filtered);
    ui.renderAuditLogs(ledger.auditLogs);
  }

  updateSecurityTierUI(auth.securityLevel);
  refreshDashboard();

  const accountSelect = document.getElementById("accountSelect");
  if (accountSelect) {
    accountSelect.innerHTML = "";
    ledger.accounts.forEach(acc => {
      const opt = document.createElement("option");
      opt.value = acc.id;
      opt.textContent = `${acc.name} (${acc.number})`;
      if (acc.id === ledger.activeAccountId) opt.selected = true;
      accountSelect.appendChild(opt);
    });

    accountSelect.addEventListener("change", (e) => {
      ledger.setActiveAccount(e.target.value);
      ui.showToast("Switched Account", `Now viewing ${ledger.getActiveAccount().name}`, "info");
      refreshDashboard();
    });
  }

  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const typeFilter = document.getElementById("typeFilter");
  const statusFilter = document.getElementById("statusFilter");

  [searchInput, categoryFilter, typeFilter, statusFilter].forEach(el => {
    if (!el) return;
    el.addEventListener(el.tagName === "INPUT" ? "input" : "change", () => {
      const query = searchInput.value;
      const category = categoryFilter.value;
      const type = typeFilter.value;
      const status = statusFilter.value;
      const filtered = ledger.filterTransactions({ query, category, type, status });
      ui.renderLedgerTable(filtered);
    });
  });

  const btnNewTransfer = document.getElementById("btnNewTransfer");
  if (btnNewTransfer) {
    btnNewTransfer.addEventListener("click", () => {
      document.getElementById("transferForm").reset();
      document.getElementById("transferStepUpNotice").style.display = "none";
      ui.openModal("transferModal");
    });
  }

  const transferAmountInput = document.getElementById("transferAmount");
  const transferRecipientInput = document.getElementById("transferRecipient");
  const transferStepUpNotice = document.getElementById("transferStepUpNotice");
  const stepUpReasonText = document.getElementById("stepUpReasonText");

  function evaluateTransferRisk() {
    const amount = parseFloat(transferAmountInput.value) || 0;
    const recipient = transferRecipientInput.value || "";
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

  if (transferAmountInput && transferRecipientInput) {
    transferAmountInput.addEventListener("input", evaluateTransferRisk);
    transferRecipientInput.addEventListener("input", evaluateTransferRisk);
  }

  const transferForm = document.getElementById("transferForm");
  if (transferForm) {
    transferForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const recipient = transferRecipientInput.value.trim();
      const amount = parseFloat(transferAmountInput.value);
      const category = document.getElementById("transferCategory").value;
      const reference = document.getElementById("transferReference").value.trim();
      const isPending = document.getElementById("transferPendingHold").checked;

      const result = ledger.executeTransfer({ recipient, amount, category, reference, isPending });

      if (result.requiresStepUp) {
        pendingTransferData = result.pendingTransferData;
        ui.closeModal("transferModal");
        
        document.getElementById("stepUpModalReason").textContent = result.reason;
        document.getElementById("stepUpModalAmount").textContent = ui.formatCurrency(amount);
        document.getElementById("stepUpModalRecipient").textContent = recipient;
        
        const stepUpCode = auth.refreshMfaCode();
        const demoOtpDisplay = document.getElementById("stepUpDemoOtp");
        if (demoOtpDisplay) demoOtpDisplay.textContent = stepUpCode;

        ui.openModal("stepUpModal");
        ui.showToast("Step-Up Verification Required", "This sensitive action requires Level 2 Authorization.", "warning");
        return;
      }

      if (!result.success) {
        ui.showToast("Transfer Failed", result.error, "danger");
        return;
      }

      ui.closeModal("transferModal");
      ui.showToast("Transfer Successful", `Successfully debited ${ui.formatCurrency(amount)} to ${recipient}.`, "success");
      refreshDashboard();
    });
  }

  const btnBiometricAuth = document.getElementById("btnBiometricAuth");
  if (btnBiometricAuth) {
    btnBiometricAuth.addEventListener("click", () => {
      btnBiometricAuth.classList.add("scanning");
      
      setTimeout(() => {
        btnBiometricAuth.classList.remove("scanning");
        auth.elevateStepUp("Biometric (Passkey/FaceID)");
        ui.closeModal("stepUpModal");

        if (pendingTransferData) {
          const res = ledger.executeTransfer(pendingTransferData);
          pendingTransferData = null;
          if (res.success) {
            ui.showToast("Authorized & Executed", `High-value transfer of ${ui.formatCurrency(res.transaction.amount)} cleared!`, "success");
            refreshDashboard();
          }
        } else {
          ui.showToast("Elevated to Level 2", "You now have elevated administrative privileges for 3 minutes.", "success");
          refreshDashboard();
        }
      }, 1200);
    });
  }

  const stepUpOtpForm = document.getElementById("stepUpOtpForm");
  if (stepUpOtpForm) {
    stepUpOtpForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const codeInput = document.getElementById("stepUpOtpInput");
      const code = codeInput.value.trim();

      const verify = auth.verifyMfa(code);
      if (verify.success) {
        auth.elevateStepUp("SMS/TOTP Passcode");
        ui.closeModal("stepUpModal");

        if (pendingTransferData) {
          const res = ledger.executeTransfer(pendingTransferData);
          pendingTransferData = null;
          if (res.success) {
            ui.showToast("Authorized & Executed", `Transfer completed with Level 2 Authorization.`, "success");
            refreshDashboard();
          }
        }
      } else {
        ui.showToast("Verification Failed", verify.error, "danger");
      }
    });
  }

  const btnSimulateDeposit = document.getElementById("btnSimulateDeposit");
  if (btnSimulateDeposit) {
    btnSimulateDeposit.addEventListener("click", () => {
      ledger.simulateIncomingDeposit(2500.00, "Silicon Valley Angel Payout");
      ui.showToast("Incoming Funds", `Received +${ui.formatCurrency(2500)} into ${ledger.getActiveAccount().name}`, "success");
      refreshDashboard();
    });
  }

  const btnTriggerStepUpTest = document.getElementById("btnTriggerStepUpTest");
  if (btnTriggerStepUpTest) {
    btnTriggerStepUpTest.addEventListener("click", () => {
      pendingTransferData = {
        recipient: "Apex Global Logistics",
        amount: 5000.00,
        category: "Transfer",
        reference: "Wire Transfer Test",
        isPending: false
      };
      
      document.getElementById("stepUpModalReason").textContent = `Transfer of ${ui.formatCurrency(5000)} exceeds the ${ui.formatCurrency(1000)} unverified threshold.`;
      document.getElementById("stepUpModalAmount").textContent = ui.formatCurrency(5000);
      document.getElementById("stepUpModalRecipient").textContent = "Apex Global Logistics";
      
      const stepUpCode = auth.refreshMfaCode();
      const demoOtpDisplay = document.getElementById("stepUpDemoOtp");
      if (demoOtpDisplay) demoOtpDisplay.textContent = stepUpCode;

      ui.openModal("stepUpModal");
      ui.showToast("Security Challenge", "Step-up challenge simulation opened.", "info");
    });
  }

  const btnResetDemoState = document.getElementById("btnResetDemoState");
  if (btnResetDemoState) {
    btnResetDemoState.addEventListener("click", () => {
      ledger.resetToDefault();
      auth.securityLevel = 1;
      updateSecurityTierUI(1);
      refreshDashboard();
      ui.showToast("Ledger Reset", "Balances and transactions reset to their initial state.", "info");
    });
  }

  const btnExportCSV = document.getElementById("btnExportCSV");
  if (btnExportCSV) {
    btnExportCSV.addEventListener("click", () => {
      ledger.exportToCSV();
      ui.showToast("Statement Exported", "Ledger transactions downloaded as CSV statement.", "success");
    });
  }

  const btnExtendSession = document.getElementById("btnExtendSession");
  if (btnExtendSession) {
    btnExtendSession.addEventListener("click", () => {
      auth.extendSession();
      ui.closeModal("sessionWarningModal");
      ui.showToast("Session Extended", "Your session has been refreshed.", "success");
    });
  }

  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      auth.logout();
      showLoginView();
    });
  }

  function showLoginView() {
    ui.openModal("loginModal");
    document.getElementById("loginCredentialsStep").style.display = "block";
    document.getElementById("loginMfaStep").style.display = "none";
  }

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const custId = document.getElementById("loginCustomerId").value;
      const pass = document.getElementById("loginPassword").value;
      const res = auth.login(custId, pass);
      if (res.requiresMfa) {
        document.getElementById("loginCredentialsStep").style.display = "none";
        document.getElementById("loginMfaStep").style.display = "block";
        document.getElementById("loginDemoMfaCode").textContent = res.code;
        ui.showToast("MFA Passcode Sent", `Simulated OTP: ${res.code}`, "info");
      }
    });
  }

  const mfaLoginForm = document.getElementById("mfaLoginForm");
  if (mfaLoginForm) {
    mfaLoginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const code = document.getElementById("loginMfaInput").value.trim();
      const res = auth.verifyMfa(code);
      if (res.success) {
        ui.closeModal("loginModal");
        ui.showToast("Authentication Complete", "Welcome back, Alex Sterling.", "success");
        refreshDashboard();
      } else {
        ui.showToast("MFA Verification Failed", res.error, "danger");
      }
    });
  }

  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.getAttribute("data-close");
      ui.closeModal(modalId);
    });
  });

  const mobileToggle = document.getElementById("mobileToggle");
  const sidebar = document.getElementById("sidebar");
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }
});
