"use strict";

/**
 * search.js
 * ─────────────────────────────────────────────
 * 搜尋功能
 * 職責：搜尋面板開關、關鍵字輸入處理、
 *       搜尋結果導向（未來可串接 API）。
 * ─────────────────────────────────────────────
 */

window.CanopySearch = {
  init() {
    this.initSearchToggle();
    this.initSearchForm();
  },

  initSearchToggle() {
    const openBtn  = document.querySelector("[data-search-open]");
    const closeBtn = document.querySelector("[data-search-close]");
    const panel    = document.querySelector(".search-panel");
    if (!panel) return;

    openBtn?.addEventListener("click", () => this.openPanel(panel));
    closeBtn?.addEventListener("click", () => this.closePanel(panel));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closePanel(panel);
    });
  },

  initSearchForm() {
    const form = document.querySelector(".search-panel__form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const query = form.querySelector("input[type='search']")?.value.trim();
      if (query) {
        // 導向搜尋結果頁（路徑依部署位置調整）
        const base = this.resolveBase();
        window.location.href = `${base}pages/system/search-results.html?q=${encodeURIComponent(query)}`;
      }
    });
  },

  openPanel(panel) {
    panel.setAttribute("aria-hidden", "false");
    panel.querySelector("input[type='search']")?.focus();
  },

  closePanel(panel) {
    panel.setAttribute("aria-hidden", "true");
  },

  /** 計算專案根目錄（開發期用）*/
  resolveBase() {
    const depth = window.location.pathname.split("/").filter(Boolean).length;
    return depth > 1 ? "../".repeat(depth - 1) : "./";
  },
};
