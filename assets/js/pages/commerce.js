"use strict";

window.CanopyCommercePages = (() => {
  let initialized = false;
  const format = (value) => new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 }).format(Number(value || 0));

  function renderCart() {
    const container = document.querySelector("#cart-items");
    if (!container || !window.CanopyCart) return;
    const items = window.CanopyCart.getItems();
    const empty = document.querySelector("#cart-empty");
    const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
    document.querySelector("#cart-subtotal").textContent = format(subtotal);
    document.querySelector("#cart-total").textContent = format(subtotal);
    empty.hidden = items.length > 0;
    container.hidden = items.length === 0;
    if (!items.length) {
      empty.innerHTML = '<div class="commerce-empty"><h2>購物車目前是空的</h2><p>從植物商城直接加入喜歡的商品。</p><a class="btn btn--primary" href="../plants/plants.html">前往植物商城</a></div>';
      container.replaceChildren();
      return;
    }
    container.replaceChildren(...items.map((item) => {
      const article = document.createElement("article"); article.className = "cart-item"; article.dataset.cartItem = item.id;
      const image = document.createElement("img"); image.className = "cart-item__image"; image.src = item.image || window.CanopyPlantService?.getFallbackImage?.() || ""; image.alt = `${item.name}商品圖片`;
      const body = document.createElement("div"); body.className = "cart-item__body";
      const name = document.createElement("h2"); name.className = "cart-item__name"; name.textContent = item.name;
      const price = document.createElement("strong"); price.textContent = format(item.price);
      const controls = document.createElement("div"); controls.className = "cart-item__controls";
      const label = document.createElement("label"); label.textContent = "數量";
      const quantity = document.createElement("input"); quantity.type = "number"; quantity.min = "1"; quantity.max = "20"; quantity.value = String(item.qty || 1); quantity.dataset.cartQty = item.id; quantity.setAttribute("aria-label", `${item.name}數量`);
      label.append(quantity);
      const remove = document.createElement("button"); remove.type = "button"; remove.dataset.cartRemove = item.id; remove.textContent = "移除";
      controls.append(label, remove); body.append(name, price, controls); article.append(image, body); return article;
    }));
  }

  function bindCart() {
    const container = document.querySelector("#cart-items");
    container?.addEventListener("change", (event) => {
      const input = event.target.closest("[data-cart-qty]"); if (!input) return;
      window.CanopyCart.updateQty(input.dataset.cartQty, Math.min(20, Math.max(1, Number(input.value || 1)))); renderCart();
    });
    container?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-cart-remove]"); if (!button) return;
      window.CanopyCart.removeItem(button.dataset.cartRemove); renderCart();
    });
  }

  function renderCheckout() {
    const container = document.querySelector("#checkout-items");
    if (!container || !window.CanopyCart) return;
    const items = window.CanopyCart.getItems();
    const total = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
    container.replaceChildren(...items.map((item) => {
      const row = document.createElement("div"); row.className = "checkout-summary-item";
      const name = document.createElement("span"); name.textContent = `${item.name} × ${item.qty}`;
      const price = document.createElement("strong"); price.textContent = format(Number(item.price) * Number(item.qty));
      row.append(name, price); return row;
    }));
    document.querySelector("#checkout-total").textContent = format(total);

    const form = document.querySelector("[data-checkout-form]");
    const user = window.CanopyMember?.getSession().user;
    const address = user?.addresses?.[0];
    if (form && user) {
      form.elements.name.value = address?.recipient || user.name || "";
      form.elements.phone.value = address?.phone || user.phone || "";
      form.elements.address.value = address ? `${address.postalCode || ""} ${address.city}${address.district}${address.address}`.trim() : "";
    }
    if (!items.length && form) form.querySelector("button[type=submit]").disabled = true;
  }

  function bindCheckout() {
    const form = document.querySelector("[data-checkout-form]");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.checkValidity()) return form.reportValidity();
      const status = document.querySelector("[data-checkout-status]");
      const button = form.querySelector("button[type=submit]"); button.disabled = true;
      try {
        const result = await window.CanopyMember.request("/api/orders", {
          method: "POST",
          body: {
            items: window.CanopyCart.getItems().map((item) => ({ id: item.id, qty: item.qty })),
            shipping: { name: form.elements.name.value, phone: form.elements.phone.value, address: form.elements.address.value },
            paymentMethod: form.elements.paymentMethod.value,
          },
        });
        window.CanopyCart.saveItems([]);
        window.location.assign(`./order-complete.html?order=${encodeURIComponent(result.order.orderNumber)}`);
      } catch (error) {
        if (status) status.textContent = error.message;
        button.disabled = false;
      }
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;
    renderCart(); bindCart(); renderCheckout(); bindCheckout();
  }
  return { init, renderCart };
})();

