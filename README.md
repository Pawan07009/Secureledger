# Meridian Treasury

A front-end banking dashboard **demo** built with plain HTML, CSS and JavaScript. It simulates a secure treasury portal: multi-factor sign-in, step-up verification for high-value transfers, a three-balance ledger, and a session audit log.

> **This is a simulation.** There is no backend, no real authentication and no real money. All data lives in your browser's `localStorage`. Never enter real credentials or financial details.

<!-- Add screenshots here, e.g. docs/dashboard.png, docs/step-up.png -->

---

## Features

**Sign-in and session**
- Customer ID and password step, followed by a simulated 6-digit MFA code
- Inactivity timer (4 minutes) with a 30-second warning dialog and "Extend session"
- Two authorization levels shown in the sidebar: Level 1 (Standard) and Level 2 (Elevated)

**Step-up verification**
- Transfers of ₹1,000 or more, or payments to unverified counterparties, trigger a Level 2 challenge
- Simulated passkey / FaceID confirmation, or a one-time passcode fallback
- Each elevation is recorded in the audit log

**Balances and ledger**
- Available, Settled (ledger) and Pending-hold balances, plus inflow vs outflow for the month
- Overdraft guard: a debit larger than the available balance is rejected
- Running balance on every transaction
- Search, category / direction / status filters, and CSV export
- Two accounts to switch between: Operating Checking (•••• 8492) and Treasury Reserve (•••• 1024)
- State persists across reloads; "Reset Data" restores the starting data

---

## Run locally

No build step or dependencies. Use a local server rather than opening the file directly, so behavior matches a real deployment.

**Windows (PowerShell)**
```powershell
.\server.ps1                 # http://localhost:5500
.\server.ps1 -Port 8080      # another port
```
If PowerShell blocks the script: `powershell -ExecutionPolicy Bypass -File .\server.ps1`

**Any OS**
```bash
python -m http.server 5500   # then open http://localhost:5500
# or: npx serve -l 5500
# or: VS Code "Live Server" extension
```

The page loads the Inter and JetBrains Mono fonts from Google Fonts, so fonts need an internet connection. Everything else is local.

---

## Project structure

```
index.html        Page markup and modals
css/styles.css    Styles
js/bundle.js      Application logic
server.ps1        Local development server (Windows)
```

---

## Try the security flows

1. **Sign in:** use the pre-filled form, then enter the MFA code shown on screen.
2. **Step-up:** click **New Transfer**, enter ₹1,500, then confirm with the passkey button or the on-screen passcode. The sidebar changes to Level 2 and the ledger row is tagged.
3. **Overdraft guard:** enter an amount larger than the available balance. The transfer is rejected.
4. **Session timeout:** watch the timer in the header. At 00:30 the warning dialog appears.
5. **Sandbox bar:** use "Simulate Inflow", "Test Step-Up Escalation" and "Reset Data" to set up scenarios quickly.

### Manual test checklist
- [ ] Wrong MFA code is rejected with a clear message
- [ ] Transfer below ₹1,000 completes without step-up
- [ ] Transfer of ₹1,000 or more requires step-up and can be cancelled
- [ ] Transfer above available balance is rejected
- [ ] Filters and search combine correctly and show an empty state
- [ ] CSV export opens correctly in Excel (₹ symbol, no formula injection)
- [ ] Reload keeps data; Reset Data restores the defaults
- [ ] Layout works at 360 px, 768 px and 1280 px widths
- [ ] Every control can be reached and used with the keyboard only

---

## Security model and limitations

This project demonstrates UI patterns. It does not provide security:

- Sign-in and MFA are checked in the browser, so anyone can bypass them with dev tools.
- The MFA and step-up codes are displayed on screen on purpose, for testing.
- Balances and transactions in `localStorage` can be edited by the user.
- The audit log is a plain list, not tamper-proof.

A real system needs server-side authentication, server-enforced limits, signed or hash-chained audit records, and transaction processing that never trusts the client.

---

## Roadmap

- Review-and-confirm screen and a receipt after each transfer
- Sorting, pagination and a date-range filter on the ledger
- Step-up elevation that expires after a few minutes
- Focus-trapped, screen-reader-friendly modals
- Amounts stored as integer paise, formatted with `Intl.NumberFormat('en-IN')`
- Self-hosted fonts and a strict Content-Security-Policy

---

## License

Add a license (for example MIT) before publishing.
