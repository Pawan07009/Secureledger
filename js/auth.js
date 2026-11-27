/**
 * Authentication, Cryptographic OTP & Session Clearance Manager
 * SecureLedger Simulation
 */

export class AuthManager {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.isAuthenticated = true;

    this.currentUser = {
      name: "Alex Sterling",
      email: "alex.sterling@secureledger.io",
      role: "Chief Treasury Officer",
      customerId: "CUST-90241"
    };

    this.securityLevel = 1; // Level 1 = Standard, Level 2 = Elevated Step-Up
    this.stepUpExpiresAt = null;

    this.sessionTotalSeconds = 240; // 4 minutes
    this.sessionRemaining = 240;
    this.timerInterval = null;

    // Active cryptographic OTP state (never persisted)
    this.activeOtp = null;
    this.otpExpiresAt = null;
    this.otpAttempts = 0;
    this.otpResendAvailableAt = 0;

    this.initSessionHeartbeat();
    this.setupUserActivityListeners();
  }

  generateSecureOtp() {
    if (window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return String(100000 + (array[0] % 900000));
    }
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  issueNewOtp() {
    this.activeOtp = this.generateSecureOtp();
    this.otpExpiresAt = Date.now() + 60000; // 60 seconds
    this.otpAttempts = 0;
    this.otpResendAvailableAt = Date.now() + 20000; // 20s cooldown
    return {
      code: this.activeOtp,
      expiresIn: 60
    };
  }

  canResendOtp() {
    return Date.now() >= this.otpResendAvailableAt;
  }

  getResendWaitSeconds() {
    return Math.max(0, Math.ceil((this.otpResendAvailableAt - Date.now()) / 1000));
  }

  verifyOtp(enteredCode) {
    if (!this.activeOtp) {
      return { success: false, error: "No active verification passcode found. Please request a new one." };
    }

    if (Date.now() > this.otpExpiresAt) {
      this.activeOtp = null;
      return { success: false, error: "Verification passcode has expired. Please request a new code." };
    }

    this.otpAttempts++;

    if (enteredCode.trim() === this.activeOtp) {
      // Invalidate immediately to prevent token reuse
      this.activeOtp = null;
      this.otpExpiresAt = null;
      return { success: true };
    }

    if (this.otpAttempts >= 3) {
      this.activeOtp = null;
      return {
        success: false,
        locked: true,
        error: "Maximum verification attempts (3) exceeded. Security challenge invalidated."
      };
    }

    const remaining = 3 - this.otpAttempts;
    return {
      success: false,
      error: `Invalid passcode. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
    };
  }

  initSessionHeartbeat() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      if (!this.isAuthenticated) return;

      this.sessionRemaining--;

      // Automatic downgrade of elevated Step-Up session upon expiration
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
      if (this.isAuthenticated && this.sessionRemaining > 30) {
        if (this.sessionRemaining < this.sessionTotalSeconds - 15) {
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
    this.stepUpExpiresAt = null;
    if (this.callbacks.onSessionExpire) {
      this.callbacks.onSessionExpire();
    }
  }

  elevateStepUp(method = "Biometric Passkey") {
    this.securityLevel = 2;
    this.stepUpExpiresAt = Date.now() + 180000; // 3 minutes

    if (this.callbacks.onSecurityLevelChange) {
      this.callbacks.onSecurityLevelChange(2, `Elevated to Level 2 via ${method}`);
    }
    return true;
  }

  login(customerId, password) {
    if (customerId && password && password.length >= 6) {
      const otp = this.issueNewOtp();
      return { success: true, requiresMfa: true, code: otp.code, expiresIn: otp.expiresIn };
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
