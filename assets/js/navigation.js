"use strict";

window.CanopyNavigation = (() => {
  let initialized = false;

  function setOpen(isOpen) {
    const mobileNav = document.querySelector("#mobile-nav");
    if (!mobileNav) return;

    mobileNav.hidden = !isOpen;
    document.body.classList.toggle("nav-open", isOpen);
    document.querySelectorAll("[data-nav-open]").forEach((button) => {
      button.setAttribute("aria-expanded", String(isOpen));
    });

    if (isOpen) {
      mobileNav.querySelector("a, button")?.focus();
    }
  }

  function highlightCurrentPage() {
    const current = new URL(window.location.href);
    const currentPath = current.pathname.replace(/\/$/, "/index.html");

    document.querySelectorAll(".nav-link[href], .mobile-nav__link[href]").forEach((link) => {
      const target = new URL(link.href, current);
      const targetPath = target.pathname.replace(/\/$/, "/index.html");
      if (targetPath === currentPath) link.setAttribute("aria-current", "page");
    });
  }

  function init() {
    if (initialized) return;

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-nav-open]")) setOpen(true);
      if (event.target.closest("[data-nav-close]")) setOpen(false);
      if (event.target.closest(".mobile-nav__link")) setOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const mobileNav = document.querySelector("#mobile-nav");
      if (mobileNav && !mobileNav.hidden) {
        setOpen(false);
        document.querySelector("[data-nav-open]")?.focus();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 1024) setOpen(false);
    });

    highlightCurrentPage();
    initialized = true;
  }

  return { init, setOpen };
})();
