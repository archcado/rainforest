"use strict";

/**
 * navigation.js
 * ─────────────────────────────────────────────
 * 桌面與行動版導覽
 * 職責：行動版選單開關、當前頁面高亮、鍵盤導覽支援。
 * ─────────────────────────────────────────────
 */

window.CanopyNavigation = {
  init() {
    this.initMobileMenu();
    this.highlightCurrentPage();
  },

  initMobileMenu() {
    const toggle = document.querySelector("[data-nav-toggle]");
    const mobileNav = document.querySelector(".mobile-nav");
    if (!toggle || !mobileNav) return;

    toggle.addEventListener("click", () => {
      const isOpen = mobileNav.getAttribute("aria-hidden") === "false";
      mobileNav.setAttribute("aria-hidden", String(isOpen));
      toggle.setAttribute("aria-expanded", String(!isOpen));
      document.body.classList.toggle("nav-open", !isOpen);
    });

    // 點擊背景關閉
    document.addEventListener("click", (e) => {
      if (
        mobileNav.getAttribute("aria-hidden") === "false" &&
        !mobileNav.contains(e.target) &&
        !toggle.contains(e.target)
      ) {
        mobileNav.setAttribute("aria-hidden", "true");
        toggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
      }
    });

    // Escape 鍵關閉
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mobileNav.getAttribute("aria-hidden") === "false") {
        mobileNav.setAttribute("aria-hidden", "true");
        toggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
        toggle.focus();
      }
    });
  },

  highlightCurrentPage() {
    const currentPath = window.location.pathname;
    document.querySelectorAll(".nav-link[href]").forEach((link) => {
      if (link.getAttribute("href") === currentPath) {
        link.setAttribute("aria-current", "page");
      }
    });
  },
};
