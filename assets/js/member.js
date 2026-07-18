"use strict";

window.CanopyMember = (() => {
  let initialized = false;
  let session = { authenticated: false, user: null, csrfToken: null };
  let apiAvailable = true;

  async function request(path, options = {}) {
    const method = options.method || "GET";
    const headers = { Accept: "application/json", ...(options.headers || {}) };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && session.csrfToken) {
      headers["X-Canopy-CSRF"] = session.csrfToken;
    }
    const response = await fetch(path, {
      ...options,
      method,
      headers,
      credentials: "same-origin",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const type = response.headers.get("content-type") || "";
    if (!type.includes("application/json")) throw new Error("會員 API 尚未啟動，請使用 npm start 開啟網站");
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || data?.message || "操作失敗");
    return data;
  }

  function updateHeader() {
    document.querySelectorAll("[data-member-link]").forEach((link) => {
      link.href = window.CanopyLayout?.resolveProjectURL(
        session.authenticated ? "pages/member/account.html" : "pages/system/login.html",
      ) || link.href;
      link.setAttribute("aria-label", session.authenticated ? `${session.user.name} 的會員中心` : "會員登入");
      if (!link.classList.contains("header-icon-btn")) {
        link.textContent = session.authenticated ? "會員中心" : "登入或註冊";
      }
    });
    document.querySelectorAll("[data-admin-only]").forEach((element) => {
      element.hidden = session.user?.role !== "admin";
    });
  }

  function mergeCart(localItems, remoteItems) {
    const merged = new Map();
    [...remoteItems, ...localItems].forEach((item) => {
      if (!item?.id) return;
      const existing = merged.get(String(item.id));
      if (!existing) merged.set(String(item.id), { ...item, id: String(item.id), qty: Math.max(1, Number(item.qty || 1)) });
      else existing.qty = Math.max(existing.qty, Number(item.qty || 1));
    });
    return [...merged.values()];
  }

  async function syncLocalCommerceState() {
    if (!session.authenticated) return;
    let localFavorites = [];
    let localCart = [];
    try { localFavorites = JSON.parse(localStorage.getItem("canopy_favorites")) || []; } catch {}
    try { localCart = JSON.parse(localStorage.getItem("canopy_cart")) || []; } catch {}
    const favorites = [...new Set([...(session.user.favorites || []), ...localFavorites].map(String))];
    const cart = mergeCart(localCart, session.user.cart || []);
    localStorage.setItem("canopy_favorites", JSON.stringify(favorites));
    localStorage.setItem("canopy_cart", JSON.stringify(cart));
    session.user.favorites = favorites;
    session.user.cart = cart;
    await Promise.all([
      request("/api/account/favorites", { method: "PUT", body: { favorites } }),
      request("/api/account/cart", { method: "PUT", body: { cart } }),
    ]);
  }

  async function refreshSession() {
    try {
      session = await request("/api/auth/session");
      apiAvailable = true;
      if (session.authenticated) await syncLocalCommerceState();
    } catch (error) {
      apiAvailable = false;
      session = { authenticated: false, user: null, csrfToken: null };
      console.info(error.message);
    }
    updateHeader();
    return session;
  }

  async function setAuthenticatedResult(result) {
    session = { authenticated: true, user: result.user, csrfToken: result.csrfToken };
    apiAvailable = true;
    await syncLocalCommerceState();
    updateHeader();
    return session;
  }

  async function login(values) {
    return setAuthenticatedResult(await request("/api/auth/login", { method: "POST", body: values }));
  }

  async function register(values) {
    return setAuthenticatedResult(await request("/api/auth/register", { method: "POST", body: values }));
  }

  async function logout() {
    if (session.authenticated) await request("/api/auth/logout", { method: "POST", body: {} });
    session = { authenticated: false, user: null, csrfToken: null };
    updateHeader();
  }

  async function syncFavorites(favorites) {
    if (!session.authenticated) return;
    session.user.favorites = favorites;
    await request("/api/account/favorites", { method: "PUT", body: { favorites } });
  }

  async function syncCart(cart) {
    if (!session.authenticated) return;
    session.user.cart = cart;
    await request("/api/account/cart", { method: "PUT", body: { cart } });
  }

  function getLoginURL() {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    return window.CanopyLayout.resolveProjectURL(`pages/system/login.html?returnTo=${encodeURIComponent(returnTo)}`);
  }

  async function init() {
    if (initialized) return;
    initialized = true;
    await refreshSession();
    if (document.body.hasAttribute("data-member-required") && !session.authenticated) {
      window.location.replace(getLoginURL());
    }
  }

  return {
    init, request, refreshSession, login, register, logout, syncFavorites, syncCart,
    getSession: () => session,
    isAuthenticated: () => session.authenticated,
    isAdmin: () => session.user?.role === "admin",
    isApiAvailable: () => apiAvailable,
    getLoginURL,
  };
})();

