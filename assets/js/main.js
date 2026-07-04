"use strict";

/**
 * main.js
 * ─────────────────────────────────────────────
 * CANOPY 全站初始化入口
 *
 * 職責：
 * 1. 等待 DOM 載入完成
 * 2. 依序初始化目前頁面已載入的功能模組
 * 3. 集中管理模組初始化順序
 *
 * 禁止：
 * 1. 在此撰寫頁面資料處理邏輯
 * 2. 在此直接操作特定頁面的 DOM
 * 3. 在此實作篩選、購物車或植物渲染功能
 * ─────────────────────────────────────────────
 */

document.addEventListener("DOMContentLoaded", () => {
  initLayout();
  initNavigation();
  initCart();
  initFilters();
  initToast();
  initPlants();
});

/**
 * 初始化共用版面功能。
 */
function initLayout() {
  initModule("CanopyLayout");
}

/**
 * 初始化導覽功能。
 */
function initNavigation() {
  initModule("CanopyNavigation");
}

/**
 * 初始化購物車功能。
 */
function initCart() {
  initModule("CanopyCart");
}

/**
 * 初始化植物篩選功能。
 *
 * 必須在 CanopyPlants 之前初始化，
 * 讓植物商城可以取得從 URL 還原的篩選狀態。
 */
function initFilters() {
  initModule("CanopyFilters");
}

/**
 * 初始化提示訊息功能。
 */
function initToast() {
  initModule("CanopyToast");
}

/**
 * 初始化植物商城頁面功能。
 */
function initPlants() {
  initModule("CanopyPlants");
}

/**
 * 安全初始化指定模組。
 *
 * 若目前頁面未載入該模組，或模組沒有 init 方法，
 * 則直接略過，不中斷其他模組初始化。
 *
 * @param {string} moduleName window 物件上的模組名稱
 */
function initModule(moduleName) {
  const module = window[moduleName];

  if (!module || typeof module.init !== "function") {
    return;
  }

  try {
    module.init();
  } catch (error) {
    console.error(`初始化 ${moduleName} 失敗。`, error);
  }
}
