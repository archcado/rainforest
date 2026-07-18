"use strict";

/**
 * cart.js
 * ─────────────────────────────────────────────
 * 購物車
 * 職責：購物車狀態管理（前端 localStorage 暫存）、
 *       加入購物車、更新數量、移除項目、顯示數量徽章。
 * 注意：目前為前端暫存，未串接真實訂單 API。
 * ─────────────────────────────────────────────
 */

window.CanopyCart = {
  _key: "canopy_cart",
  _initialized: false,

  init() {
    if (this._initialized) return;
    this.updateBadge();
    this.initAddToCartButtons();
    this._initialized = true;
  },

  getItems() {
    try {
      return JSON.parse(localStorage.getItem(this._key)) || [];
    } catch {
      return [];
    }
  },

  saveItems(items) {
    localStorage.setItem(this._key, JSON.stringify(items));
    this.updateBadge();
    window.CanopyMember?.syncCart(items).catch((error) => {
      console.info("購物車稍後再同步：", error.message);
    });
  },

  /** 加入購物車
   * @param {{ id: string, name: string, price: number, image?: string }} item
   * @param {number} qty
   */
  addItem(item, qty = 1) {
    const items = this.getItems();
    const existing = items.find((i) => i.id === item.id);
    if (existing) {
      existing.qty += Math.max(1, Number(qty) || 1);
    } else {
      items.push({ ...item, qty: Math.max(1, Number(qty) || 1) });
    }
    this.saveItems(items);
    if (window.CanopyToast) {
      window.CanopyToast.success(`${item.name} 已加入購物車`);
    }
  },

  removeItem(id) {
    this.saveItems(this.getItems().filter((i) => i.id !== id));
  },

  updateQty(id, qty) {
    const items = this.getItems();
    const item = items.find((i) => i.id === id);
    if (item) item.qty = Math.max(1, qty);
    this.saveItems(items);
  },

  getTotalQty() {
    return this.getItems().reduce((sum, i) => sum + i.qty, 0);
  },

  updateBadge() {
    const qty = this.getTotalQty();
    document.querySelectorAll("[data-cart-count]").forEach((badge) => {
      badge.textContent = String(qty);
      badge.hidden = qty === 0;
    });
  },

  initAddToCartButtons() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-add-to-cart]");
      if (!btn) return;
      const id    = btn.dataset.addToCart;
      const name  = btn.dataset.name  || "植物";
      const price = Number(btn.dataset.price || 0);
      const image = btn.dataset.image || undefined;
      this.addItem({ id, name, price, image });
    });
  },
};
