// UI Renderer, Formatters, Count-up Animations & Modal Controllers

export class UIRenderer {
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

    // Cashflow ratio calculation
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
