"use strict";

/**
 * plant-journal.js
 * ─────────────────────────────────────────────
 * 植物日誌
 * 職責：日誌條目新增、澆水 / 施肥 / 換盆紀錄、
 *       生長照片預覽、觀察備註。
 *       目前為骨架，資料持久化待後端 API 實作。
 * ─────────────────────────────────────────────
 */

window.CanopyJournal = {
  _entries: [],

  init() {
    this.initEntryForm();
    this.initPhotoPreview();
  },

  initEntryForm() {
    const form = document.querySelector(".journal-entry-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      this.addEntry(data);
      form.reset();
      this.renderTimeline();
    });
  },

  addEntry(data) {
    this._entries.unshift({
      id:   Date.now(),
      date: new Date().toISOString(),
      ...data,
    });
  },

  renderTimeline() {
    const container = document.querySelector(".journal-timeline");
    if (!container) return;
    // 頁面渲染邏輯待設計稿確認後補充
  },

  initPhotoPreview() {
    const fileInput = document.querySelector(".journal-photo-input");
    const preview   = document.querySelector(".journal-photo-preview");
    if (!fileInput || !preview) return;

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.src = e.target.result;
        preview.hidden = false;
      };
      reader.readAsDataURL(file);
    });
  },
};
