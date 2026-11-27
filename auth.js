// Authentication, MFA Simulator & Step-Up Security Engine

export class AuthManager {
  constructor(callbacks = {}) {
    this.isAuthenticated = true; // start authenticated in demo mode or login prompt
    this.currentUser = {
      name: "Alex Sterling",
      email: "alex.sterling@meridianbank.io",
      role: "Enterprise Treasury Admin",
      customerId: "CUST-90241"
    };
    
    this.securityLevel = 1; // Level 1 = Standard Auth, Level 2 = Step-Up Elevated
    this.stepUpExpiresAt = null;
    
    // Session countdown (in seconds for demo visibility, e.g. 240s = 4 mins)
    this.sessionTotalSeconds = 240;
    this.sessionRemaining = 240;
    this.timerInterval = null;
    
    // MFA state
    this.currentMfaCode = this.generate6DigitCode();
    this.mfaCodeExpiresAt = Date.now() + 60000;
    
    this.callbacks = callbacks; // onSessionTick, onSessionExpire, onSecurityLevelChange, onAuditLog
    
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
      
      // Check step-up expiration
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
      // Don't reset if less than 15s to let user witness warning if they want, but normal activity resets
      if (this.isAuthenticated && this.sessionRemaining > 15) {
        // slight top-up on active interaction
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
      this.isAuthenticated = false; // Next step requires MFA verification
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
    // Step-up elevated privilege valid for 3 minutes
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
