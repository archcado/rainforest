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

  init() {
    this.updateBadge();
    this.initAddToCartButtons();
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
  },

  /** 加入購物車
   * @param {{ id: string, name: string, price: number, image?: string }} item
   * @param {number} qty
   */
  addItem(item, qty = 1) {
    const items = this.getItems();
    const existing = items.find((i) => i.id === item.id);
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({ ...item, qty });
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
    const badge = document.querySelector("[data-cart-count]");
    if (!badge) return;
    const qty = this.getTotalQty();
    badge.textContent = String(qty);
    badge.hidden = qty === 0;
  },

  initAddToCartButtons() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-add-to-cart]");
      if (!btn) return;
      const id    = btn.dataset.addToCart;
      const name  = btn.dataset.name  || "植物";
      const price = Number(btn.dataset.price || 0);
      this.addItem({ id, name, price });
    });
  },
};
