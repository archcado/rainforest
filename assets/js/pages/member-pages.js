"use strict";

window.CanopyMemberPages = (() => {
  let initialized = false;
  const $ = (selector) => document.querySelector(selector);

  function setStatus(selector, message, type = "") {
    const element = $(selector);
    if (!element) return;
    element.textContent = message;
    element.dataset.status = type;
  }

  function getReturnURL() {
    const value = new URLSearchParams(window.location.search).get("returnTo");
    return value && value.startsWith("/") ? value : window.CanopyLayout.resolveProjectURL("pages/member/account.html");
  }

  function bindLogin() {
    const form = $("[data-login-form]");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.checkValidity()) return form.reportValidity();
      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      setStatus("[data-auth-status]", "正在登入…");
      try {
        await window.CanopyMember.login({ email: form.elements.email.value, password: form.elements.password.value });
        window.location.assign(getReturnURL());
      } catch (error) {
        setStatus("[data-auth-status]", error.message, "error");
      } finally { button.disabled = false; }
    });
  }

  function bindRegister() {
    const form = $("[data-register-form]");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.checkValidity()) return form.reportValidity();
      if (form.elements.password.value !== form.elements.confirmPassword.value) {
        return setStatus("[data-auth-status]", "兩次輸入的密碼不一致", "error");
      }
      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      try {
        await window.CanopyMember.register({
          name: form.elements.name.value, email: form.elements.email.value, password: form.elements.password.value,
        });
        window.location.assign(window.CanopyLayout.resolveProjectURL("pages/member/account.html"));
      } catch (error) { setStatus("[data-auth-status]", error.message, "error"); }
      finally { button.disabled = false; }
    });
  }

  function bindForgotPassword() {
    const requestForm = $("[data-forgot-form]");
    const resetForm = $("[data-reset-form]");
    const tokenFromURL = new URLSearchParams(window.location.search).get("token");
    if (tokenFromURL && resetForm) {
      resetForm.hidden = false;
      resetForm.elements.token.value = tokenFromURL;
    }
    requestForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!requestForm.checkValidity()) return requestForm.reportValidity();
      try {
        const result = await window.CanopyMember.request("/api/auth/forgot-password", {
          method: "POST", body: { email: requestForm.elements.email.value },
        });
        setStatus("[data-auth-status]", result.message, "success");
        if (result.developmentResetToken && resetForm) {
          resetForm.hidden = false;
          resetForm.elements.token.value = result.developmentResetToken;
          setStatus("[data-reset-note]", "開發模式已產生一次性重設 Token，可直接設定新密碼。", "success");
        }
      } catch (error) { setStatus("[data-auth-status]", error.message, "error"); }
    });
    resetForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!resetForm.checkValidity()) return resetForm.reportValidity();
      try {
        await window.CanopyMember.request("/api/auth/reset-password", {
          method: "POST", body: { token: resetForm.elements.token.value, password: resetForm.elements.password.value },
        });
        setStatus("[data-reset-note]", "密碼已更新，現在可以重新登入。", "success");
      } catch (error) { setStatus("[data-reset-note]", error.message, "error"); }
    });
  }

  function renderAddresses(addresses = []) {
    const container = $("[data-address-list]");
    if (!container) return;
    if (!addresses.length) {
      container.innerHTML = '<p class="member-empty">尚未建立收件地址。</p>';
      return;
    }
    container.replaceChildren(...addresses.map((address) => {
      const article = document.createElement("article");
      article.className = "address-card";
      const content = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = address.label || "常用地址";
      const detail = document.createElement("p");
      detail.textContent = `${address.recipient}｜${address.phone}｜${address.postalCode || ""} ${address.city}${address.district}${address.address}`;
      content.append(title, detail);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn btn--ghost btn--sm";
      remove.textContent = "刪除";
      remove.dataset.addressDelete = address.id;
      article.append(content, remove);
      return article;
    }));
  }

  function bindAccount() {
    const accountForm = $("[data-account-form]");
    if (!accountForm) return;
    const user = window.CanopyMember.getSession().user;
    accountForm.elements.name.value = user.name || "";
    accountForm.elements.email.value = user.email || "";
    accountForm.elements.phone.value = user.phone || "";
    renderAddresses(user.addresses);

    if (user.role === "admin") $("[data-admin-entry]")?.removeAttribute("hidden");
    accountForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!accountForm.checkValidity()) return accountForm.reportValidity();
      try {
        const result = await window.CanopyMember.request("/api/account", {
          method: "PATCH", body: { name: accountForm.elements.name.value, phone: accountForm.elements.phone.value },
        });
        Object.assign(window.CanopyMember.getSession().user, result.user);
        setStatus("[data-account-status]", "個人資料已更新", "success");
      } catch (error) { setStatus("[data-account-status]", error.message, "error"); }
    });

    const addressForm = $("[data-address-form]");
    addressForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!addressForm.checkValidity()) return addressForm.reportValidity();
      try {
        const result = await window.CanopyMember.request("/api/account/addresses", {
          method: "POST", body: Object.fromEntries(new FormData(addressForm)),
        });
        user.addresses.push(result.address);
        renderAddresses(user.addresses);
        addressForm.reset();
      } catch (error) { setStatus("[data-address-status]", error.message, "error"); }
    });
    $("[data-address-list]")?.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-address-delete]");
      if (!button) return;
      await window.CanopyMember.request(`/api/account/addresses/${encodeURIComponent(button.dataset.addressDelete)}`, { method: "DELETE", body: {} });
      user.addresses = user.addresses.filter((item) => item.id !== button.dataset.addressDelete);
      renderAddresses(user.addresses);
    });

    const passwordForm = $("[data-password-form]");
    passwordForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!passwordForm.checkValidity()) return passwordForm.reportValidity();
      try {
        await window.CanopyMember.request("/api/account/password", {
          method: "PATCH", body: { currentPassword: passwordForm.elements.currentPassword.value, newPassword: passwordForm.elements.newPassword.value },
        });
        passwordForm.reset();
        setStatus("[data-password-status]", "密碼已更新", "success");
      } catch (error) { setStatus("[data-password-status]", error.message, "error"); }
    });
  }

  async function renderFavorites() {
    const container = $("#favorites-grid");
    if (!container || !window.CanopyPlantService) return;
    let favoriteIds = [];
    try { favoriteIds = JSON.parse(localStorage.getItem("canopy_favorites")) || []; } catch {}
    const plants = (await window.CanopyPlantService.getAll()).filter((plant) => favoriteIds.includes(plant.id));
    if (!plants.length) {
      container.innerHTML = '<div class="member-empty"><h2>尚無收藏商品</h2><p>到植物商城挑選喜歡的植物，點選愛心即可收藏。</p><a class="btn btn--primary" href="../plants/plants.html">前往植物商城</a></div>';
      return;
    }
    container.replaceChildren(...plants.map((plant) => {
      const article = document.createElement("article");
      article.className = "member-product-card";
      const image = document.createElement("img"); image.src = plant.image; image.alt = plant.imageAlt;
      const body = document.createElement("div");
      const title = document.createElement("h2"); title.textContent = plant.name;
      const price = document.createElement("strong"); price.textContent = window.CanopyPlantService.formatCurrency(plant.price, plant.currency);
      const actions = document.createElement("div"); actions.className = "member-product-card__actions";
      const detail = document.createElement("a"); detail.className = "btn btn--secondary btn--sm"; detail.href = plant.detailURL; detail.textContent = "查看商品";
      const remove = document.createElement("button"); remove.className = "btn btn--ghost btn--sm"; remove.type = "button"; remove.textContent = "取消收藏";
      remove.addEventListener("click", async () => {
        favoriteIds = favoriteIds.filter((id) => id !== plant.id);
        localStorage.setItem("canopy_favorites", JSON.stringify(favoriteIds));
        await window.CanopyMember.syncFavorites(favoriteIds);
        article.remove();
        if (!container.children.length) renderFavorites();
      });
      actions.append(detail, remove); body.append(title, price, actions); article.append(image, body); return article;
    }));
  }

  async function renderOrders() {
    const container = $("#orders-list");
    if (!container) return;
    try {
      const { orders } = await window.CanopyMember.request("/api/orders");
      if (!orders.length) {
        container.innerHTML = '<div class="member-empty"><h2>尚無訂單</h2><p>完成結帳後，訂單狀態會顯示在這裡。</p><a class="btn btn--primary" href="../plants/plants.html">開始選購</a></div>';
        return;
      }
      container.replaceChildren(...orders.map((order) => {
        const article = document.createElement("article"); article.className = "order-record";
        const title = document.createElement("h2"); title.textContent = `訂單 ${order.orderNumber}`;
        const meta = document.createElement("p"); meta.textContent = `${new Date(order.createdAt).toLocaleDateString("zh-TW")}｜${order.statusLabel || order.status}｜NT$ ${Number(order.total).toLocaleString("zh-TW")}`;
        article.append(title, meta); return article;
      }));
    } catch (error) { container.innerHTML = `<p class="member-empty">${error.message}</p>`; }
  }

  function bindLogout() {
    document.querySelectorAll("[data-logout]").forEach((button) => {
      button.addEventListener("click", async () => {
        await window.CanopyMember.logout();
        window.location.assign(window.CanopyLayout.resolveProjectURL("index.html"));
      });
    });
  }

  async function init() {
    if (initialized) return;
    initialized = true;
    bindLogin(); bindRegister(); bindForgotPassword(); bindLogout();
    if (window.CanopyMember.isAuthenticated()) bindAccount();
    await Promise.all([renderFavorites(), renderOrders()]);
  }

  return { init };
})();

