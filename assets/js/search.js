"use strict";

window.CanopySearch = (() => {
  let initialized = false;
  let returnFocus = null;

  function getPanel() {
    return document.querySelector(".search-panel");
  }

  function open(trigger) {
    const panel = getPanel();
    if (!panel) return;
    returnFocus = trigger || document.activeElement;
    panel.hidden = false;
    document.body.classList.add("search-open");
    panel.querySelector("input[type='search']")?.focus();
  }

  function close() {
    const panel = getPanel();
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    document.body.classList.remove("search-open");
    returnFocus?.focus?.();
  }

  function init() {
    if (initialized) return;

    document.addEventListener("click", (event) => {
      const opener = event.target.closest("[data-search-open]");
      if (opener) open(opener);
      if (event.target.closest("[data-search-close]")) close();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });

    getPanel()?.querySelector(".search-panel__form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = event.currentTarget.querySelector("input[type='search']")?.value.trim();
      if (!query) return;
      const url = new URL(
        "pages/system/search-results.html",
        window.CanopyLayout.getProjectRootURL(),
      );
      url.searchParams.set("q", query);
      window.location.href = url.href;
    });

    initialized = true;
  }

  return { init, open, close };
})();
