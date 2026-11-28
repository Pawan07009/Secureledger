import crypto from "crypto";
import { db } from "./lib/db.js";
import { authenticateSession } from "./lib/session.js";

export default async function handler(req, res) {
  const authState = await authenticateSession(req);
  if (!authState) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const { user, session } = authState;

  if (req.method === "GET") {
    const transactions = await db.getTransactionsByUserId(user.id);
    return res.status(200).json({ success: true, transactions });
  }

  if (req.method === "POST") {
    try {
      const { amount, recipient, category, accountId, memo } = req.body || {};

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: "Invalid transfer amount." });
      }

      if (numAmount > 500000.0) {
        return res.status(400).json({ error: "Amount exceeds single-transfer ceiling (₹5,00,000)." });
      }

      if (!recipient || !recipient.trim()) {
        return res.status(400).json({ error: "Recipient name is required." });
      }

      // Step-Up Level 2 Security Enforcement for transfers >= ₹1,000
      if (numAmount >= 1000.0 && session.clearance !== "level_2") {
        return res.status(403).json({
          requiresStepUp: true,
          error: "High-value transfers (≥ ₹1,000) require Step-Up Level 2 authorization."
        });
      }

      // Fetch source account
      const accounts = await db.getAccountsByUserId(user.id);
      const targetAcc = accountId
        ? accounts.find((a) => a.id === accountId)
        : accounts[0];

      if (!targetAcc) {
        return res.status(404).json({ error: "Selected corporate account not found." });
      }

      if (targetAcc.availableBalance < numAmount) {
        return res.status(400).json({ error: "Insufficient available liquidity for this transfer." });
      }

      // Deduct balance
      const newAvailable = targetAcc.availableBalance - numAmount;
      const newSettled = targetAcc.settledBalance - numAmount;
      await db.updateAccountBalances(targetAcc.id, newAvailable, newSettled);

      // Generate dynamic institutional reference and ID
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      const transactionId = `TXN-${dateStr}-${randomSuffix}`;
      const timestamp = new Date().toISOString();

      // Retrieve previous Merkle chain hash
      const prevHash = await db.getLatestTransactionHash(targetAcc.id);

      // Calculate SHA-256 Merkle chain block hash
      const rawPayload = `${prevHash}|${transactionId}|${timestamp}|${numAmount.toFixed(2)}|${recipient.trim()}`;
      const currHash = crypto.createHash("sha256").update(rawPayload).digest("hex");

      const transaction = {
        id: transactionId,
        accountId: targetAcc.id,
        userId: user.id,
        title: `Outward Wire: ${recipient.trim()}`,
        category: category || "Transfers",
        direction: "debit",
        amount: numAmount,
        status: "settled",
        timestamp,
        counterparty: recipient.trim(),
        runningBalance: newAvailable,
        memo: memo ? memo.trim() : "",
        isStepUp: numAmount >= 1000.0,
        reference: `WIRE-${dateStr}-${randomSuffix}`,
        prevHash,
        currHash
      };

      await db.createTransaction(transaction);

      // Record to immutable audit log
      await db.appendAuditLog({
        id: `LOG-${Date.now().toString().slice(-6)}`,
        timestamp,
        actor: user.name,
        action: "Authorized Outward Transfer",
        details: `Dispatched ₹${numAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} to ${recipient.trim()} [Block Hash: ${currHash.slice(0, 16)}...]`,
        ipAddress: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1",
        status: "verified"
      });

      return res.status(200).json({
        success: true,
        transactionId,
        reference: transaction.reference,
        amount: numAmount,
        newBalance: newAvailable,
        currHash,
        timestamp
      });
    } catch (err) {
      console.error("[Transfers Handler Error]:", err);
      return res.status(500).json({ error: "Internal error executing transfer." });
    }
  }

  return res.status(405).json({ error: "Method not allowed." });
}
