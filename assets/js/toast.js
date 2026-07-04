"use strict";

/**
 * toast.js
 * ─────────────────────────────────────────────
 * 操作通知（Toast）
 * 職責：顯示短暫操作回饋訊息，支援成功、警告、錯誤類型，
 *       自動消失，允許手動關閉。
 * ─────────────────────────────────────────────
 */

window.CanopyToast = {
  _container: null,

  _getContainer() {
    if (!this._container) {
      this._container = document.querySelector(".toast-container");
      if (!this._container) {
        this._container = document.createElement("div");
        this._container.className = "toast-container";
        this._container.setAttribute("aria-live", "polite");
        this._container.setAttribute("aria-atomic", "false");
        document.body.appendChild(this._container);
      }
    }
    return this._container;
  },

  /**
   * 顯示一則 Toast
   * @param {string} message - 訊息文字
   * @param {'success'|'warning'|'error'|'info'} type - 類型
   * @param {number} duration - 顯示毫秒數，預設 3500
   */
  show(message, type = "info", duration = 3500) {
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.setAttribute("role", "status");
    toast.innerHTML = `
      <span class="toast__message">${message}</span>
      <button class="toast__close" aria-label="關閉通知">✕</button>
    `;

    toast.querySelector(".toast__close").addEventListener("click", () => {
      this._dismiss(toast);
    });

    this._getContainer().appendChild(toast);

    setTimeout(() => this._dismiss(toast), duration);
  },

  _dismiss(toast) {
    if (!toast.parentNode) return;
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    toast.style.transition = "opacity 200ms, transform 200ms";
    setTimeout(() => toast.remove(), 220);
  },

  success(message, duration) { this.show(message, "success", duration); },
  warning(message, duration) { this.show(message, "warning", duration); },
  error(message, duration)   { this.show(message, "error",   duration); },
};
