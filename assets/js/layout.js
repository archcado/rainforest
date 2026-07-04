"use strict";

/**
 * layout.js
 * ─────────────────────────────────────────────
 * 共用版面載入
 * 職責：處理 Header 黏貼捲動效果、返回頂部等
 *       與版面結構相關的共用行為。
 * ─────────────────────────────────────────────
 */

window.CanopyLayout = {
  init() {
    this.initStickyHeader();
  },

  initStickyHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    const onScroll = () => {
      header.classList.toggle("site-header--scrolled", window.scrollY > 8);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
  },
};
