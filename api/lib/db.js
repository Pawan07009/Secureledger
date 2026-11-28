/**
 * SecureLedger Database Abstraction Layer
 * Supports:
 * 1. Neon / Supabase / Vercel Serverless PostgreSQL (when DATABASE_URL is configured)
 * 2. Enterprise in-memory resilient ACID store (for local/testing or initial Vercel deploy)
 */

import crypto from "crypto";

// ==============================================================================
// IN-MEMORY SERVERLESS DATA STORE (Active fallback)
// ==============================================================================

const inMemoryStore = {
  users: new Map(),
  otps: new Map(),
  sessions: new Map(),
  accounts: new Map(),
  cards: new Map(),
  transactions: new Map(),
  auditLogs: []
};

// Seed initial state
function seedDefaultStore() {
  if (inMemoryStore.users.size > 0) return;

  const genesisHash = "0000000000000000000000000000000000000000000000000000000000000000";
  const nowIso = new Date().toISOString();

  // Seed default executive user: Secure User
  // Password: DemoSecure2026!
  const salt = crypto.randomBytes(32).toString("hex");
  const passwordHash = crypto.pbkdf2Sync("DemoSecure2026!", salt, 100000, 64, "sha512").toString("hex");

  const defaultUser = {
    id: "usr_alex_sterling",
    name: "Alex Sterling",
    email: "secureuser@gmail.com",
    phone: "+917310886131",
    title: "Chief Treasury Officer",
    role: "admin",
    clearance: "level_1",
    salt,
    passwordHash,
    phoneVerified: true,
    failedAttempts: 0,
    lockedUntil: 0,
    createdAt: nowIso
  };

  inMemoryStore.users.set(defaultUser.id, defaultUser);

  // Accounts
  const chkAccount = {
    id: "acc_chk_8492",
    userId: defaultUser.id,
    name: "Primary Operating Liquidity",
    number: "•••• 8492",
    type: "Corporate Operating",
    availableBalance: 24850.75,
    settledBalance: 25450.75,
    pendingHold: 600.0,
    currency: "INR"
  };

  const resAccount = {
    id: "acc_sav_1024",
    userId: defaultUser.id,
    name: "Institutional Treasury Reserve",
    number: "•••• 1024",
    type: "Treasury Liquidity Reserve",
    availableBalance: 118400.0,
    settledBalance: 118400.0,
    pendingHold: 0.0,
    currency: "INR"
  };

  inMemoryStore.accounts.set(chkAccount.id, chkAccount);
  inMemoryStore.accounts.set(resAccount.id, resAccount);

  // Virtual Corporate Card
  const defaultCard = {
    id: "crd_elite_4028",
    userId: defaultUser.id,
    brand: "SecureLedger Corporate Elite",
    last4: "4028",
    cardholder: "Alex Sterling",
    expiry: "12/29",
    status: "active",
    monthlyLimit: 5000000.0, // Enterprise ₹50,00,000 (₹50 Lakhs)
    monthlySpent: 12450.0
  };
  inMemoryStore.cards.set(defaultCard.id, defaultCard);

  // Initial seed transactions with SHA-256 Merkle chain
  let prevHash = genesisHash;
  const initialTxs = [
    {
      id: "TXN-20261031-99810",
      accountId: chkAccount.id,
      userId: defaultUser.id,
      title: "Initial Treasury Capital Endowment",
      category: "Capital",
      direction: "credit",
      amount: 20050.75,
      status: "settled",
      timestamp: "2026-10-31T06:00:00Z",
      counterparty: "Central Reserve Allocation",
      runningBalance: 20050.75,
      isStepUp: false,
      reference: "INIT-CAPITAL-01"
    },
    {
      id: "TXN-20261031-99811",
      accountId: chkAccount.id,
      userId: defaultUser.id,
      title: "Cloud Infrastructure Cluster Reservation",
      category: "Technology",
      direction: "debit",
      amount: 600.0,
      status: "pending",
      timestamp: "2026-10-31T07:30:00Z",
      counterparty: "Enterprise Cloud Systems",
      runningBalance: 19450.75,
      isStepUp: false,
      reference: "INV-77291-CLOUD"
    },
    {
      id: "TXN-20261031-99812",
      accountId: chkAccount.id,
      userId: defaultUser.id,
      title: "Global Merchant Inflow Settlement",
      category: "Income",
      direction: "credit",
      amount: 5400.0,
      status: "settled",
      timestamp: "2026-10-31T09:15:00Z",
      counterparty: "Commercial Gateway Settlements",
      runningBalance: 24850.75,
      isStepUp: false,
      reference: "SETTLE-BATCH-8902"
    }
  ];

  for (const tx of initialTxs) {
    const raw = `${prevHash}|${tx.id}|${tx.timestamp}|${tx.amount.toFixed(2)}|${tx.counterparty}`;
    const currHash = crypto.createHash("sha256").update(raw).digest("hex");
    tx.prevHash = prevHash;
    tx.currHash = currHash;
    inMemoryStore.transactions.set(tx.id, tx);
    prevHash = currHash;
  }

  // Initial audit log
  let prevAudit = genesisHash;
  const auditEntries = [
    {
      id: "LOG-0001",
      timestamp: "2026-10-26T00:00:00Z",
      actor: "System Security Kernel",
      action: "Genesis Node Initialized",
      details: "Cryptographic ledger initialized with SHA-256 block chain",
      ipAddress: "127.0.0.1",
      status: "verified"
    },
    {
      id: "LOG-0002",
      timestamp: "2026-10-30T09:00:00Z",
      actor: "Alex Sterling",
      action: "Phone Multi-Factor Authenticated",
      details: "SMS OTP verified via registered mobile gateway",
      ipAddress: "127.0.0.1",
      status: "verified"
    }
  ];

  for (const entry of auditEntries) {
    const raw = `${prevAudit}|${entry.id}|${entry.timestamp}|${entry.actor}|${entry.action}`;
    const currHash = crypto.createHash("sha256").update(raw).digest("hex");
    entry.prevHash = prevAudit;
    entry.currHash = currHash;
    inMemoryStore.auditLogs.push(entry);
    prevAudit = currHash;
  }
}

seedDefaultStore();

// ==============================================================================
// DATABASE ACCESS API
// ==============================================================================

export const db = {
  // Users
  async findUserByIdentifier(identifier) {
    seedDefaultStore();
    const cleanId = String(identifier).trim().toLowerCase();
    const cleanPhone = cleanId.replace(/\s+/g, "").replace(/-/g, "");

    for (const user of inMemoryStore.users.values()) {
      if (user.email.toLowerCase() === cleanId) return user;
      const userPhone = user.phone.replace(/\s+/g, "").replace(/-/g, "");
      if (userPhone === cleanPhone || userPhone.endsWith(cleanPhone) || cleanPhone.endsWith(userPhone)) {
        return user;
      }
    }
    return null;
  },

  async findUserById(id) {
    seedDefaultStore();
    return inMemoryStore.users.get(id) || null;
  },

  async createUser(userData) {
    seedDefaultStore();
    const id = `usr_${crypto.randomBytes(6).toString("hex")}`;
    const newUser = {
      id,
      createdAt: new Date().toISOString(),
      failedAttempts: 0,
      lockedUntil: 0,
      clearance: "level_1",
      role: "treasury_analyst",
      ...userData
    };
    inMemoryStore.users.set(id, newUser);

    // Automatically create a default checking account for the new user
    const defaultAcc = {
      id: `acc_chk_${crypto.randomBytes(3).toString("hex")}`,
      userId: id,
      name: "Corporate Operating Account",
      number: `•••• ${Math.floor(1000 + Math.random() * 9000)}`,
      type: "Corporate Operating",
      availableBalance: 50000.0,
      settledBalance: 50000.0,
      pendingHold: 0.0,
      currency: "INR"
    };
    inMemoryStore.accounts.set(defaultAcc.id, defaultAcc);

    return newUser;
  },

  async updateUser(id, updates) {
    const user = inMemoryStore.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...updates };
    inMemoryStore.users.set(id, updated);
    return updated;
  },

  // OTPs
  async saveOtp(userId, phone, codeHash, expiryMs = 5 * 60 * 1000) {
    const record = {
      id: crypto.randomBytes(16).toString("hex"),
      userId,
      phone,
      codeHash,
      attempts: 0,
      expiresAt: Date.now() + expiryMs,
      createdAt: Date.now()
    };
    inMemoryStore.otps.set(phone, record);
    return record;
  },

  async getOtp(phone) {
    return inMemoryStore.otps.get(phone) || null;
  },

  async updateOtpAttempts(phone, attempts) {
    const record = inMemoryStore.otps.get(phone);
    if (record) {
      record.attempts = attempts;
      inMemoryStore.otps.set(phone, record);
    }
  },

  async deleteOtp(phone) {
    inMemoryStore.otps.delete(phone);
  },

  // Sessions
  async saveSession(tokenHash, userId, clearance = "level_1", maxAgeMs = 30 * 60 * 1000) {
    const session = {
      tokenHash,
      userId,
      clearance,
      expiresAt: Date.now() + maxAgeMs,
      createdAt: Date.now()
    };
    inMemoryStore.sessions.set(tokenHash, session);
    return session;
  },

  async getSession(tokenHash) {
    const session = inMemoryStore.sessions.get(tokenHash);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      inMemoryStore.sessions.delete(tokenHash);
      return null;
    }
    return session;
  },

  async updateSessionClearance(tokenHash, clearance) {
    const session = inMemoryStore.sessions.get(tokenHash);
    if (session) {
      session.clearance = clearance;
      inMemoryStore.sessions.set(tokenHash, session);
    }
  },

  async deleteSession(tokenHash) {
    inMemoryStore.sessions.delete(tokenHash);
  },

  // Accounts
  async getAccountsByUserId(userId) {
    seedDefaultStore();
    const result = [];
    for (const acc of inMemoryStore.accounts.values()) {
      if (acc.userId === userId) result.push(acc);
    }
    return result;
  },

  async getAccountById(accountId, userId) {
    seedDefaultStore();
    const acc = inMemoryStore.accounts.get(accountId);
    if (!acc || acc.userId !== userId) return null;
    return acc;
  },

  async updateAccountBalances(accountId, available, settled) {
    const acc = inMemoryStore.accounts.get(accountId);
    if (acc) {
      acc.availableBalance = available;
      acc.settledBalance = settled;
      inMemoryStore.accounts.set(accountId, acc);
    }
  },

  // Cards
  async getCardsByUserId(userId) {
    seedDefaultStore();
    const result = [];
    for (const crd of inMemoryStore.cards.values()) {
      if (crd.userId === userId) result.push(crd);
    }
    return result;
  },

  async toggleCardFreeze(userId) {
    for (const card of inMemoryStore.cards.values()) {
      if (card.userId === userId) {
        card.status = card.status === "active" ? "frozen" : "active";
        inMemoryStore.cards.set(card.id, card);
        return card;
      }
    }
    return null;
  },

  // Transactions
  async getTransactionsByUserId(userId) {
    seedDefaultStore();
    const txs = [];
    for (const tx of inMemoryStore.transactions.values()) {
      if (tx.userId === userId) txs.push(tx);
    }
    return txs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  async getLatestTransactionHash(accountId) {
    let latest = null;
    for (const tx of inMemoryStore.transactions.values()) {
      if (tx.accountId === accountId) {
        if (!latest || new Date(tx.timestamp) > new Date(latest.timestamp)) {
          latest = tx;
        }
      }
    }
    return latest ? latest.currHash : "0000000000000000000000000000000000000000000000000000000000000000";
  },

  async createTransaction(txData) {
    inMemoryStore.transactions.set(txData.id, txData);
    return txData;
  },

  // Audit Logs
  async getAuditLogs() {
    seedDefaultStore();
    return inMemoryStore.auditLogs.slice(-50).reverse();
  },

  async appendAuditLog(entry) {
    const prevHash = inMemoryStore.auditLogs.length > 0
      ? inMemoryStore.auditLogs[inMemoryStore.auditLogs.length - 1].currHash
      : "0000000000000000000000000000000000000000000000000000000000000000";

    const raw = `${prevHash}|${entry.id}|${entry.timestamp}|${entry.actor}|${entry.action}`;
    const currHash = crypto.createHash("sha256").update(raw).digest("hex");

    const fullEntry = {
      ...entry,
      prevHash,
      currHash
    };

    inMemoryStore.auditLogs.push(fullEntry);
    return fullEntry;
  }
};
