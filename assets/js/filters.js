"use strict";

/**
 * filters.js
 * ─────────────────────────────────────────────
 * 植物篩選模組
 *
 * 職責：
 * 1. 管理篩選條件狀態
 * 2. 同步 URL 查詢參數
 * 3. 從 URL 還原表單狀態
 * 4. 顯示使用中的篩選條件
 * 5. 控制行動版篩選抽屜
 * 6. 通知植物列表頁更新結果
 * ─────────────────────────────────────────────
 */

window.CanopyFilters = {
  _state: {},
  _initialized: false,

  _elements: {
    form: null,
    panel: null,
    openButton: null,
    closeButton: null,
    backdrop: null,
    activeFilters: null,
    activeFiltersList: null,
    clearActiveButton: null,
    clearFiltersButton: null,
  },

  /**
   * 篩選條件顯示名稱。
   * key 對應 input 的 name，
   * value 對應 checkbox 或 select 的 value。
   */
  _labels: {
    light: {
      "bright-indirect": "明亮散射光",
      medium: "中等光照",
      low: "耐低光",
    },

    difficulty: {
      beginner: "新手適合",
      intermediate: "中等難度",
      advanced: "進階照護",
    },

    humidity: {
      normal: "一般室內濕度",
      medium: "中等濕度",
      high: "高濕度環境",
    },

    size: {
      small: "小型植物",
      medium: "中型植物",
      large: "大型植物",
    },

    petSafe: {
      true: "寵物友善",
    },

    priceMin: {
      label: "最低價格",
    },

    priceMax: {
      label: "最高價格",
    },
  },

  /**
   * 初始化篩選功能。
   */
  init() {
    if (this._initialized) {
      return;
    }

    this._elements.form = document.querySelector("#plants-filter-form");
    this._elements.panel = document.querySelector("#plants-filter-panel");

    if (!this._elements.form || !this._elements.panel) {
      return;
    }

    this._elements.openButton = document.querySelector("#open-filter-btn");
    this._elements.closeButton = document.querySelector("#close-filter-btn");
    this._elements.backdrop = document.querySelector("#filter-backdrop");

    this._elements.activeFilters = document.querySelector("#active-filters");
    this._elements.activeFiltersList = document.querySelector(
      "#active-filters-list",
    );

    this._elements.clearActiveButton = document.querySelector(
      "#clear-active-filters-btn",
    );

    this._elements.clearFiltersButton =
      document.querySelector("#clear-filters-btn");

    this.restoreFromURL();
    this.applyStateToControls();
    this.bindFilterControls();
    this.bindDrawerControls();
    this.bindClearControls();
    this.renderActiveFilters();

    this._initialized = true;
  },

  /**
   * 綁定篩選表單事件。
   */
  bindFilterControls() {
    const { form } = this._elements;

    form.addEventListener("change", (event) => {
      const control = event.target.closest("input[name], select[name]");

      if (!control) {
        return;
      }

      this.updateStateFromForm();
    });

    form.addEventListener("input", (event) => {
      const control = event.target.closest(
        'input[type="number"][name], input[type="range"][name]',
      );

      if (!control) {
        return;
      }

      this.updateStateFromForm();
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      this.updateStateFromForm();
      this.closeDrawer();
    });

    form.addEventListener("reset", () => {
      /*
       * reset 事件發生時，瀏覽器尚未真正重設控制項，
       * 因此延後到下一個事件循環再更新狀態。
       */
      window.setTimeout(() => {
        this._state = {};
        this.syncToURL();
        this.renderActiveFilters();
        this.emitChange();
      }, 0);
    });
  },

  /**
   * 綁定行動版篩選抽屜。
   */
  bindDrawerControls() {
    const { openButton, closeButton, backdrop } = this._elements;

    openButton?.addEventListener("click", () => {
      this.openDrawer();
    });

    closeButton?.addEventListener("click", () => {
      this.closeDrawer();
    });

    backdrop?.addEventListener("click", () => {
      this.closeDrawer();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.closeDrawer();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 820) {
        this.closeDrawer();
      }
    });
  },

  /**
   * 綁定清除篩選按鈕。
   */
  bindClearControls() {
    const { clearActiveButton, clearFiltersButton, activeFiltersList } =
      this._elements;

    clearActiveButton?.addEventListener("click", () => {
      this.resetAll();
    });

    clearFiltersButton?.addEventListener("click", () => {
      this.resetAll();
    });

    activeFiltersList?.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-filter-remove]");

      if (!removeButton) {
        return;
      }

      const key = removeButton.dataset.filterKey;
      const value = removeButton.dataset.filterValue;

      this.removeFilter(key, value);
    });
  },

  /**
   * 從目前表單重新建立完整篩選狀態。
   */
  updateStateFromForm() {
    const { form } = this._elements;
    const formData = new FormData(form);
    const nextState = {};

    for (const [key, rawValue] of formData.entries()) {
      const value = String(rawValue).trim();

      if (!value) {
        continue;
      }

      if (Object.prototype.hasOwnProperty.call(nextState, key)) {
        nextState[key] = Array.isArray(nextState[key])
          ? [...nextState[key], value]
          : [nextState[key], value];
      } else {
        nextState[key] = value;
      }
    }

    this._state = nextState;

    this.syncToURL();
    this.renderActiveFilters();
    this.emitChange();
  },

  /**
   * 設定單一篩選條件。
   *
   * @param {string} key 篩選欄位名稱
   * @param {string|string[]} value 篩選值
   */
  setFilter(key, value) {
    if (!key) {
      return;
    }

    const normalizedValue = Array.isArray(value)
      ? value.filter(Boolean)
      : String(value ?? "").trim();

    if (
      !normalizedValue ||
      (Array.isArray(normalizedValue) && normalizedValue.length === 0)
    ) {
      delete this._state[key];
    } else {
      this._state[key] = normalizedValue;
    }

    this.applyStateToControls();
    this.syncToURL();
    this.renderActiveFilters();
    this.emitChange();
  },

  /**
   * 移除一個特定篩選條件。
   *
   * @param {string} key 篩選欄位名稱
   * @param {string} value 篩選值
   */
  removeFilter(key, value) {
    if (!key || !Object.prototype.hasOwnProperty.call(this._state, key)) {
      return;
    }

    const currentValue = this._state[key];

    if (Array.isArray(currentValue)) {
      const nextValues = currentValue.filter((item) => item !== value);

      if (nextValues.length > 0) {
        this._state[key] = nextValues;
      } else {
        delete this._state[key];
      }
    } else {
      delete this._state[key];
    }

    this.applyStateToControls();
    this.syncToURL();
    this.renderActiveFilters();
    this.emitChange();
  },

  /**
   * 清除全部篩選條件。
   */
  resetAll() {
    const { form } = this._elements;

    this._state = {};
    form?.reset();

    this.applyStateToControls();
    this.syncToURL();
    this.renderActiveFilters();
    this.emitChange();
  },

  /**
   * 將目前狀態套用到表單控制項。
   */
  applyStateToControls() {
    const { form } = this._elements;

    if (!form) {
      return;
    }

    const controls = form.querySelectorAll("input[name], select[name]");

    controls.forEach((control) => {
      const key = control.name;
      const currentValue = this._state[key];

      if (control.type === "checkbox" || control.type === "radio") {
        const selectedValues = Array.isArray(currentValue)
          ? currentValue
          : currentValue
            ? [currentValue]
            : [];

        control.checked = selectedValues.includes(control.value);
        return;
      }

      if (Array.isArray(currentValue)) {
        control.value = currentValue[0] ?? "";
        return;
      }

      control.value = currentValue ?? "";
    });
  },

  /**
   * 將篩選狀態同步至 URL。
   */
  syncToURL() {
    const url = new URL(window.location.href);
    const filterNames = this.getFilterNames();

    /*
     * 只刪除屬於篩選表單的參數，
     * 避免破壞其他功能使用的 URL 參數。
     */
    filterNames.forEach((name) => {
      url.searchParams.delete(name);
    });

    for (const [key, value] of Object.entries(this._state)) {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          url.searchParams.append(key, item);
        });
      } else {
        url.searchParams.set(key, value);
      }
    }

    try {
      history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    } catch (error) {
      console.warn("無法同步植物篩選 URL。", error);
    }
  },

  /**
   * 從 URL 查詢參數還原篩選狀態。
   */
  restoreFromURL() {
    const params = new URLSearchParams(window.location.search);
    const filterNames = new Set(this.getFilterNames());
    const restoredState = {};

    params.forEach((value, key) => {
      if (!filterNames.has(key)) {
        return;
      }

      if (Object.prototype.hasOwnProperty.call(restoredState, key)) {
        restoredState[key] = Array.isArray(restoredState[key])
          ? [...restoredState[key], value]
          : [restoredState[key], value];
      } else {
        restoredState[key] = value;
      }
    });

    this._state = restoredState;
  },

  /**
   * 取得表單中所有可篩選欄位名稱。
   *
   * @returns {string[]}
   */
  getFilterNames() {
    const { form } = this._elements;

    if (!form) {
      return [];
    }

    return Array.from(form.querySelectorAll("[name]"))
      .map((control) => control.name)
      .filter(Boolean)
      .filter((name, index, names) => names.indexOf(name) === index);
  },

  /**
   * 顯示目前使用中的篩選條件。
   */
  renderActiveFilters() {
    const { activeFilters, activeFiltersList } = this._elements;

    if (!activeFilters || !activeFiltersList) {
      return;
    }

    activeFiltersList.replaceChildren();

    const entries = this.getFilterEntries();

    if (entries.length === 0) {
      activeFilters.hidden = true;
      return;
    }

    entries.forEach(({ key, value, label }) => {
      const item = document.createElement("span");
      item.className = "active-filter";

      const text = document.createElement("span");
      text.className = "active-filter__label";
      text.textContent = label;

      const removeButton = document.createElement("button");
      removeButton.className = "active-filter__remove";
      removeButton.type = "button";
      removeButton.textContent = "移除";
      removeButton.dataset.filterRemove = "true";
      removeButton.dataset.filterKey = key;
      removeButton.dataset.filterValue = value;
      removeButton.setAttribute("aria-label", `移除篩選條件：${label}`);

      item.append(text, removeButton);
      activeFiltersList.append(item);
    });

    activeFilters.hidden = false;
  },

  /**
   * 將篩選狀態轉換成畫面可顯示的項目。
   *
   * @returns {{key: string, value: string, label: string}[]}
   */
  getFilterEntries() {
    const entries = [];

    for (const [key, rawValue] of Object.entries(this._state)) {
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];

      values.forEach((value) => {
        entries.push({
          key,
          value,
          label: this.getFilterLabel(key, value),
        });
      });
    }

    return entries;
  },

  /**
   * 取得篩選條件的中文顯示文字。
   *
   * @param {string} key 篩選欄位名稱
   * @param {string} value 篩選值
   * @returns {string}
   */
  getFilterLabel(key, value) {
    if (key === "priceMin") {
      return `最低價格 NT$ ${this.formatNumber(value)}`;
    }

    if (key === "priceMax") {
      return `最高價格 NT$ ${this.formatNumber(value)}`;
    }

    return this._labels[key]?.[value] ?? value;
  },

  /**
   * 格式化數字。
   *
   * @param {string|number} value
   * @returns {string}
   */
  formatNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return String(value);
    }

    return new Intl.NumberFormat("zh-TW").format(number);
  },

  /**
   * 開啟行動版篩選抽屜。
   */
  openDrawer() {
    const { openButton, panel, backdrop } = this._elements;

    if (!panel) {
      return;
    }

    document.body.classList.add("filter-open");

    openButton?.setAttribute("aria-expanded", "true");
    panel.setAttribute("aria-hidden", "false");

    if (backdrop) {
      backdrop.hidden = false;
    }
  },

  /**
   * 關閉行動版篩選抽屜。
   */
  closeDrawer() {
    const { openButton, panel, backdrop } = this._elements;

    document.body.classList.remove("filter-open");

    openButton?.setAttribute("aria-expanded", "false");
    panel?.setAttribute("aria-hidden", "true");

    if (backdrop) {
      backdrop.hidden = true;
    }
  },

  /**
   * 取得目前篩選狀態副本。
   *
   * @returns {Record<string, string|string[]>}
   */
  getState() {
    const copiedState = {};

    for (const [key, value] of Object.entries(this._state)) {
      copiedState[key] = Array.isArray(value) ? [...value] : value;
    }

    return copiedState;
  },

  /**
   * 通知植物列表頁篩選條件已改變。
   */
  emitChange() {
    const state = this.getState();

    this.onFilterChange(state);

    document.dispatchEvent(
      new CustomEvent("canopy:filters-change", {
        detail: {
          filters: state,
        },
      }),
    );
  },

  /**
   * 篩選條件改變後的回呼。
   * 後續可由 plants.js 覆寫。
   *
   * @param {Record<string, string|string[]>} state
   */
  onFilterChange(state) {
    void state;
  },
};
