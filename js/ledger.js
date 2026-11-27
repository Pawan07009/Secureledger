// Transaction Ledger & Balance Management Engine

import { DEFAULT_ACCOUNTS, INITIAL_TRANSACTIONS, KNOWN_PAYEES, INITIAL_AUDIT_LOGS } from "./mockData.js";

export class LedgerEngine {
  constructor(authManager) {
    this.authManager = authManager;
    this.STORAGE_KEY = "secureledger_banking_ledger_state_v2";
    this.STEP_UP_THRESHOLD = 1000.00; // Transactions over ₹1,000 require Step-up
    
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
    // Requires step-up if amount exceeds threshold OR payee is unknown/unverified
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

    // Step-up check
    const stepUpCheck = this.checkStepUpRequired(numAmount, recipient);
    if (stepUpCheck.required) {
      return {
        success: false,
        requiresStepUp: true,
        reason: stepUpCheck.reason,
        pendingTransferData: { recipient, amount: numAmount, category, reference, isPending }
      };
    }

    // Process debit
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

    // Prepend to transaction list
    this.transactions.unshift(newTx);

    // Add audit log
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

      // Text search
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

      // Category filter
      if (category !== "all" && tx.category.toLowerCase() !== category.toLowerCase()) {
        return false;
      }

      // Type filter (credit / debit)
      if (type !== "all" && tx.direction !== type) {
        return false;
      }

      // Status filter
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
    link.setAttribute("download", `SecureLedger_Ledger_Statement_${acc.number.replace(/\s+/g, '')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
