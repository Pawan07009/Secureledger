// Application Controller & Bootstrap

import { AuthManager } from "./auth.js";
import { LedgerEngine } from "./ledger.js";
import { UIRenderer } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
  const ui = new UIRenderer();
  
  let pendingTransferData = null; // Holds payload when waiting for step-up verification

  // Initialize Auth Manager
  const auth = new AuthManager({
    onSessionTick: (remaining, total) => {
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      const formatted = `INR{String(minutes).padStart(2, "0")}:INR{String(seconds).padStart(2, "0")}`;
      
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

      // Check if session warning modal should open at 30 seconds
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

  // Initialize Ledger Engine
  const ledger = new LedgerEngine(auth);

  // Helper: Update UI for Security Tier
  function updateSecurityTierUI(level) {
    const tierPill = document.getElementById("securityTierPill");
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

  // Refresh entire dashboard view
  function refreshDashboard() {
    const metrics = ledger.getMetrics();
    ui.renderMetrics(metrics);
    
    // Apply current filters
    const query = document.getElementById("searchInput")?.value || "";
    const category = document.getElementById("categoryFilter")?.value || "all";
    const type = document.getElementById("typeFilter")?.value || "all";
    const status = document.getElementById("statusFilter")?.value || "all";

    const filtered = ledger.filterTransactions({ query, category, type, status });
    ui.renderLedgerTable(filtered);
    ui.renderAuditLogs(ledger.auditLogs);
  }

  // Initial render
  updateSecurityTierUI(auth.securityLevel);
  refreshDashboard();

  // Populate Accounts dropdown
  const accountSelect = document.getElementById("accountSelect");
  if (accountSelect) {
    accountSelect.innerHTML = "";
    ledger.accounts.forEach(acc => {
      const opt = document.createElement("option");
      opt.value = acc.id;
      opt.textContent = `INR{acc.name} (INR{acc.number})`;
      if (acc.id === ledger.activeAccountId) opt.selected = true;
      accountSelect.appendChild(opt);
    });

    accountSelect.addEventListener("change", (e) => {
      ledger.setActiveAccount(e.target.value);
      ui.showToast("Switched Account", `Now viewing INR{ledger.getActiveAccount().name}`, "info");
      refreshDashboard();
    });
  }

  // Filter Listeners
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

  // Transfer Form & Step-up Interceptor
  const btnNewTransfer = document.getElementById("btnNewTransfer");
  if (btnNewTransfer) {
    btnNewTransfer.addEventListener("click", () => {
      document.getElementById("transferForm").reset();
      document.getElementById("transferStepUpNotice").style.display = "none";
      ui.openModal("transferModal");
    });
  }

  // Pre-check for step-up warning dynamically while user types amount
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

  // Handle Transfer Submission
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
        // Close transfer modal, open Step-Up verification challenge
        pendingTransferData = result.pendingTransferData;
        ui.closeModal("transferModal");
        
        document.getElementById("stepUpModalReason").textContent = result.reason;
        document.getElementById("stepUpModalAmount").textContent = ui.formatCurrency(amount);
        document.getElementById("stepUpModalRecipient").textContent = recipient;
        
        // Show demo step-up code for quick test
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
      ui.showToast("Transfer Successful", `Successfully debited INR{ui.formatCurrency(amount)} to INR{recipient}.`, "success");
      refreshDashboard();
    });
  }

  // Handle Step-Up Biometric Verification
  const btnBiometricAuth = document.getElementById("btnBiometricAuth");
  if (btnBiometricAuth) {
    btnBiometricAuth.addEventListener("click", () => {
      const box = btnBiometricAuth.closest(".biometric-box");
      if (box) box.classList.add("scanning");
      
      setTimeout(() => {
        if (box) box.classList.remove("scanning");
        auth.elevateStepUp("Biometric (Passkey/FaceID)");
        ui.closeModal("stepUpModal");

        // Complete the pending transfer if there was one
        if (pendingTransferData) {
          const res = ledger.executeTransfer(pendingTransferData);
          pendingTransferData = null;
          if (res.success) {
            ui.showToast("Authorized & Executed", `High-value transfer of INR{ui.formatCurrency(res.transaction.amount)} cleared!`, "success");
            refreshDashboard();
          }
        } else {
          ui.showToast("Elevated to Level 2", "You now have elevated administrative privileges for 3 minutes.", "success");
          refreshDashboard();
        }
      }, 1200);
    });
  }

  // Handle Step-Up OTP Code Submission
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

  // Quick Action Buttons
  const btnSimulateDeposit = document.getElementById("btnSimulateDeposit");
  if (btnSimulateDeposit) {
    btnSimulateDeposit.addEventListener("click", () => {
      const tx = ledger.simulateIncomingDeposit(2500.00, "Silicon Valley Angel Payout");
      ui.showToast("Incoming Funds", `Received +INR{ui.formatCurrency(2500)} into INR F{ledger.getActiveAccount().name}`, "success");
      refreshDashboard();
    });
  }

  const btnTriggerStepUpTest = document.getElementById("btnTriggerStepUpTest");
  if (btnTriggerStepUpTest) {
    btnTriggerStepUpTest.addEventListener("click", () => {
      // Simulate attempting a ₹5,000 wire to trigger step-up challenge
      pendingTransferData = {
        recipient: "Apex Global Logistics",
        amount: 5000.00,
        category: "Transfer",
        reference: "Wire Transfer Test",
        isPending: false
      };
      
      document.getElementById("stepUpModalReason").textContent = `Transfer of INR{ui.formatCurrency(5000)} exceeds the INR{ui.formatCurrency(1000)} unverified threshold.`;
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

  // Session Warning Modal Extension
  const btnExtendSession = document.getElementById("btnExtendSession");
  if (btnExtendSession) {
    btnExtendSession.addEventListener("click", () => {
      auth.extendSession();
      ui.closeModal("sessionWarningModal");
      ui.showToast("Session Extended", "Your session has been refreshed.", "success");
    });
  }

  // Login & Logout Controls
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
        ui.showToast("MFA Security Code Sent", "Verification code dispatched via SMS.", "info");
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

  // Close modal buttons (data-close="modalId")
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.getAttribute("data-close");
      ui.closeModal(modalId);
    });
  });

  // Mobile navigation toggle
  const mobileToggle = document.getElementById("mobileToggle");
  const sidebar = document.getElementById("sidebar");
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }
});
