"use strict";

/**
 * main.js
 * ─────────────────────────────────────────────
 * 全站初始化入口
 * 職責：在 DOM 載入後依序初始化各模組，作為各功能
 *       模組的協調中心。
 * 禁止：在此撰寫具體功能邏輯，應呼叫各自模組。
 * ─────────────────────────────────────────────
 */

document.addEventListener("DOMContentLoaded", () => {
  initLayout();
  initNavigation();
});

function initLayout() {
  // layout.js 中的共用版面初始化將在此呼叫
  if (typeof window.CanopyLayout !== "undefined") {
    window.CanopyLayout.init();
  }
}

function initNavigation() {
  // navigation.js 中的導覽初始化將在此呼叫
  if (typeof window.CanopyNavigation !== "undefined") {
    window.CanopyNavigation.init();
  }
}
