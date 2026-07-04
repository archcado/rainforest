"use strict";

/**
 * modal.js
 * ─────────────────────────────────────────────
 * Modal 開關與焦點管理
 * 職責：開啟、關閉 Modal，焦點捕捉（focus trap），
 *       背景捲動鎖定，ARIA 屬性管理。
 * ─────────────────────────────────────────────
 */

window.CanopyModal = {
  /** 開啟指定 Modal
   * @param {string} modalId - Modal 元素的 id
   */
  open(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.setAttribute("aria-hidden", "false");
    modal.removeAttribute("hidden");
    document.body.classList.add("modal-open");
    this._trapFocus(modal);

    const focusable = modal.querySelector("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    focusable?.focus();
  },

  /** 關閉指定 Modal */
  close(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("hidden", "");
    document.body.classList.remove("modal-open");
    this._releaseReturn?.();
  },

  _trapFocus(modal) {
    const focusables = modal.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;

    const first = focusables[0];
    const last  = focusables[focusables.length - 1];

    const handler = (e) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    };

    modal.addEventListener("keydown", handler);
    this._releaseReturn = () => modal.removeEventListener("keydown", handler);
  },

  /** 初始化：自動綁定 [data-modal-open] 與 [data-modal-close] */
  init() {
    document.addEventListener("click", (e) => {
      const openTarget  = e.target.closest("[data-modal-open]");
      const closeTarget = e.target.closest("[data-modal-close]");

      if (openTarget)  this.open(openTarget.dataset.modalOpen);
      if (closeTarget) this.close(closeTarget.dataset.modalClose);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const openModal = document.querySelector(".modal-backdrop:not([hidden])");
        if (openModal) this.close(openModal.querySelector(".modal")?.id);
      }
    });
  },
};
