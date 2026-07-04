"use strict";

/**
 * filters.js
 * ─────────────────────────────────────────────
 * 植物篩選
 * 職責：篩選條件狀態管理、URL 參數同步、觸發清單更新。
 *       目前為骨架，實際篩選邏輯待串接資料層後實作。
 * ─────────────────────────────────────────────
 */

window.CanopyFilters = {
  _state: {},

  init() {
    this.initFilterControls();
    this.restoreFromURL();
  },

  initFilterControls() {
    const panel = document.querySelector(".filter-panel");
    if (!panel) return;

    panel.addEventListener("change", (e) => {
      const input = e.target.closest("input[name], select[name]");
      if (!input) return;
      this.setFilter(input.name, input.type === "checkbox" ? this.collectCheckboxes(input.name) : input.value);
    });

    const resetBtn = panel.querySelector("[data-filter-reset]");
    resetBtn?.addEventListener("click", () => this.resetAll());
  },

  setFilter(key, value) {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      delete this._state[key];
    } else {
      this._state[key] = value;
    }
    this.syncToURL();
    this.onFilterChange(this._state);
  },

  collectCheckboxes(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
  },

  resetAll() {
    this._state = {};
    this.syncToURL();
    this.onFilterChange(this._state);
  },

  syncToURL() {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(this._state)) {
      if (Array.isArray(val)) val.forEach((v) => params.append(key, v));
      else params.set(key, val);
    }
    const newURL = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    history.replaceState(null, "", newURL);
  },

  restoreFromURL() {
    const params = new URLSearchParams(window.location.search);
    params.forEach((value, key) => {
      if (this._state[key]) {
        this._state[key] = [].concat(this._state[key], value);
      } else {
        this._state[key] = value;
      }
    });
  },

  /** 篩選條件變更後的回調，由頁面模組覆寫 */
  onFilterChange(state) {
    // 頁面模組可覆寫此函式以處理篩選結果
  },
};
