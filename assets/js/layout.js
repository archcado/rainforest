"use strict";

/**
 * CANOPY 共用版面載入器。
 * 所有頁面都以 components/ 中的 Header、Footer 與 Overlay 為唯一來源。
 */
window.CanopyLayout = (() => {
  const scriptURL = document.currentScript?.src
    ? new URL(document.currentScript.src)
    : new URL("assets/js/layout.js", window.location.href);
  const projectRootURL = new URL("../../", scriptURL);
  let initialized = false;

  function getProjectRootURL() {
    return new URL(projectRootURL.href);
  }

  function resolveProjectURL(path = "") {
    const cleanPath = String(path).replace(/^\/+/, "");
    return new URL(cleanPath, projectRootURL).href;
  }

  function rewriteProjectURLs(root) {
    if (!(root instanceof Element)) return;

    ["href", "src", "action"].forEach((attribute) => {
      root.querySelectorAll(`[${attribute}^="/"]`).forEach((element) => {
        const value = element.getAttribute(attribute);
        if (!value || value.startsWith("//")) return;
        element.setAttribute(attribute, resolveProjectURL(value));
      });

      if (root.matches?.(`[${attribute}^="/"]`)) {
        const value = root.getAttribute(attribute);
        root.setAttribute(attribute, resolveProjectURL(value));
      }
    });
  }

  async function fetchComponent(path) {
    const response = await fetch(resolveProjectURL(path), {
      headers: { Accept: "text/html" },
    });

    if (!response.ok) {
      throw new Error(`無法載入共用元件 ${path}（HTTP ${response.status}）`);
    }

    const template = document.createElement("template");
    template.innerHTML = (await response.text()).trim();
    const element = template.content.firstElementChild;

    if (!element) {
      throw new Error(`共用元件 ${path} 沒有可載入的根元素。`);
    }

    rewriteProjectURLs(element);
    return element;
  }

  async function loadSharedComponents() {
    const headerPlaceholder = document.querySelector(".site-header");
    const footerPlaceholder = document.querySelector(".site-footer");
    if (!headerPlaceholder) {
      throw new Error("[layout] 缺少核心容器 .site-header，無法初始化共用版面。");
    }
    const headerPath = "components/header.html";
    const header = await fetchComponent(headerPath);
    headerPlaceholder.replaceWith(header);

    if (window.CanopyMember?.refreshSession) {
      try {
        await window.CanopyMember.refreshSession();
      } catch (error) {
        console.warn("[layout] 會員狀態同步失敗。", error);
      }
    }

    const optionalComponents = [
      {
        name: "footer",
        path: "components/footer.html",
        mount: (element) => {
          if (!footerPlaceholder) {
            console.error("[layout] Optional component mount failed: footer placeholder .site-footer not found.");
            return;
          }
          footerPlaceholder.replaceWith(element);
          const year = element.querySelector("[data-footer-year]");
          if (year) year.textContent = String(new Date().getFullYear());
        },
      },
      {
        name: "mobile-nav",
        path: "components/mobile-nav.html",
        mount: (element) => {
          document.querySelector("#mobile-nav")?.remove();
          document.body.append(element);
        },
      },
      {
        name: "search-panel",
        path: "components/search-panel.html",
        mount: (element) => {
          document.querySelector(".search-panel")?.remove();
          document.body.append(element);
        },
      },
      {
        name: "chatbot",
        path: "components/chatbot.html",
        mount: (element) => {
          document.querySelector(".support-widget")?.remove();
          document.body.append(element);
        },
      },
    ];
    const optionalResults = await Promise.allSettled(
      optionalComponents.map((component) => fetchComponent(component.path)),
    );
    optionalResults.forEach((result, index) => {
      const component = optionalComponents[index];
      if (result.status === "fulfilled") {
        component.mount(result.value);
      } else {
        console.error(
          `[layout] Optional component failed: ${component.name} (${resolveProjectURL(component.path)})`,
          result.reason,
        );
      }
    });
  }

  function initStickyHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    const update = () => {
      header.classList.toggle("site-header--scrolled", window.scrollY > 8);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function initFooterNewsletter() {
    const form = document.querySelector("[data-footer-newsletter]");
    const status = document.querySelector(".footer-subscribe-status");
    if (!form || !status) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      status.textContent = "已收到你的訂閱，謝謝你。";
      status.hidden = false;
      form.reset();
    });
  }

  function ensureScript(globalName, path) {
    if (window[globalName]) return Promise.resolve(window[globalName]);

    const source = resolveProjectURL(path);
    const existing = [...document.scripts].find((script) => script.src === source);

    if (existing) {
      return new Promise((resolve, reject) => {
        if (window[globalName]) {
          resolve(window[globalName]);
          return;
        }
        existing.addEventListener("load", () => resolve(window[globalName]), { once: true });
        existing.addEventListener("error", reject, { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = source;
      script.async = false;
      script.addEventListener("load", () => resolve(window[globalName]), { once: true });
      script.addEventListener("error", () => reject(new Error(`無法載入 ${path}`)), { once: true });
      document.head.append(script);
    });
  }

  async function init() {
    if (initialized) return;

    try {
      await loadSharedComponents();
    } catch (error) {
      console.error("共用版面載入失敗。", error);
      document.documentElement.dataset.layoutStatus = "error";
    }

    initStickyHeader();
    initFooterNewsletter();
    initialized = true;
  }

  return {
    init,
    ensureScript,
    getProjectRootURL,
    resolveProjectURL,
    rewriteProjectURLs,
  };
})();
