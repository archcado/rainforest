"use strict";

window.CanopyCare = (() => {
  let initialized = false;
  let articles = [];
  const state = { type: "all", category: "all", query: "" };
  const typeLabels = {
    all: "全部內容",
    guide: "照護指南",
    diagnosis: "問題診斷",
    gear: "好物分享",
    inspiration: "空間靈感",
  };
  const categoryLabels = {
    all: "所有主題",
    watering: "澆水",
    light: "光照",
    humidity: "濕度",
    soil: "介質",
    repotting: "換盆",
    fertilizing: "施肥",
    pests: "病蟲害",
    maintenance: "日常整理",
    environment: "環境",
    diagnosis: "綜合診斷",
    tools: "工具",
    styling: "空間配置",
  };

  function resolveURL(path) {
    return window.CanopyLayout.resolveProjectURL(path);
  }

  async function loadArticles() {
    const response = await fetch(resolveURL("data/care-articles.json"), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`照護資源載入失敗（HTTP ${response.status}）`);
    const payload = await response.json();
    if (!Array.isArray(payload.articles)) throw new TypeError("照護資料缺少 articles 陣列");
    return payload.articles;
  }

  function getSaved() {
    try {
      const saved = JSON.parse(localStorage.getItem("canopy_saved_articles"));
      return new Set(Array.isArray(saved) ? saved.map(String) : []);
    } catch {
      return new Set();
    }
  }

  function saveSaved(saved) {
    localStorage.setItem("canopy_saved_articles", JSON.stringify([...saved]));
  }

  function iconMarkup(symbol) {
    const paths = {
      water: '<path d="M12 2.8S6.2 9.3 6.2 14a5.8 5.8 0 0 0 11.6 0C17.8 9.3 12 2.8 12 2.8Z"/><path d="M9.2 14.5a3 3 0 0 0 3 3"/>',
      light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6"/>',
      humidity: '<path d="M4 8c2-2 4-2 6 0s4 2 6 0 4-2 5 0M4 13c2-2 4-2 6 0s4 2 6 0 4-2 5 0M4 18c2-2 4-2 6 0s4 2 6 0 4-2 5 0"/>',
      soil: '<path d="M4 8h16l-2 12H6L4 8Z"/><path d="M8 8c.7-3 2-4.5 4-5 2 1 3.3 2.7 4 5M8 13h8"/>',
      repot: '<path d="M8 7h8l-1 13H9L8 7Z"/><path d="M12 7V3M12 5c-3 0-4-1.3-4-3 2.5 0 4 1 4 3Zm0 0c3 0 4-1.3 4-3-2.5 0-4 1-4 3Z"/>',
      fertilizer: '<path d="M8 3h8v4l2 3v10H6V10l2-3V3Z"/><path d="M8 7h8M9 14h6"/>',
      leaf: '<path d="M19.5 4.5C12 4.7 6.8 8.5 6 15.7c4.8 1.2 10.4-1 13.5-11.2Z"/><path d="M5 20c2.4-4.2 5.6-7.4 10-9.8"/>',
      temperature: '<path d="M9 14.5V5a3 3 0 0 1 6 0v9.5a5 5 0 1 1-6 0Z"/><path d="M12 7v9"/>',
      diagnosis: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5M8.5 10.5h4M10.5 8.5v4"/>',
      root: '<path d="M12 3v8M12 8 8 5M12 8l4-3M12 11c-4 2-5 5-5 9M12 11c4 2 5 5 5 9M12 14c-2 1-3 3-3 6M12 14c2 1 3 3 3 6"/>',
      pest: '<path d="M8 9a4 4 0 0 1 8 0v7a4 4 0 0 1-8 0V9ZM12 5V2M8 11H4M8 16H4M16 11h4M16 16h4M9 6 6 3M15 6l3-3"/>',
      "watering-can": '<path d="M5 10h10v9H5V10Zm10 2c4 0 5 2 5 4s-1 3-3 3M5 12 2 9M3 8l5-3 2 5"/>',
      "grow-light": '<path d="M5 4h14l-2 5H7L5 4ZM12 9v4M8 21c0-4 1.5-6 4-8 2.5 2 4 4 4 8M9 17h6"/>',
      pot: '<path d="M5 8h14l-2 12H7L5 8ZM4 4h16v4H4V4Z"/><path d="M9 13h6"/>',
      space: '<path d="M4 20h16M7 20v-7h4v7M13 20V9h4v11"/><path d="M9 13V7M9 9C6 9 5 7.5 5 5c3 0 4 1.5 4 4Zm0 0c3 0 4-1.5 4-4-3 0-4 1.5-4 4Z"/>',
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[symbol] || paths.leaf}</svg>`;
  }

  function articleURL(article) {
    return resolveURL(`pages/care/care-detail.html?slug=${encodeURIComponent(article.slug)}`);
  }

  function createCard(article, saved) {
    const card = document.createElement("article");
    card.className = "care-resource-card";
    card.dataset.articleType = article.contentType;

    const link = document.createElement("a");
    link.className = `care-resource-card__visual care-resource-card__visual--${article.coverTone}`;
    link.href = articleURL(article);
    link.setAttribute("aria-label", `閱讀：${article.title}`);
    const icon = document.createElement("span");
    icon.className = "care-resource-card__icon";
    icon.innerHTML = iconMarkup(article.coverSymbol);
    const visualLabel = document.createElement("span");
    visualLabel.className = "care-resource-card__visual-label";
    visualLabel.textContent = typeLabels[article.contentType];
    link.append(icon, visualLabel);

    const body = document.createElement("div");
    body.className = "care-resource-card__body";
    const meta = document.createElement("div");
    meta.className = "care-resource-card__meta";
    const category = document.createElement("span");
    category.textContent = categoryLabels[article.category] || article.category;
    const time = document.createElement("span");
    time.textContent = `${article.readingMinutes} 分鐘閱讀`;
    meta.append(category, time);

    const title = document.createElement("h2");
    title.className = "care-resource-card__title";
    const titleLink = document.createElement("a");
    titleLink.href = link.href;
    titleLink.textContent = article.title;
    title.append(titleLink);

    const summary = document.createElement("p");
    summary.className = "care-resource-card__summary";
    summary.textContent = article.summary;

    const footer = document.createElement("div");
    footer.className = "care-resource-card__footer";
    const tags = document.createElement("div");
    tags.className = "care-resource-card__tags";
    article.tags.slice(0, 2).forEach((value) => {
      const tag = document.createElement("span");
      tag.textContent = value;
      tags.append(tag);
    });
    const save = document.createElement("button");
    save.type = "button";
    save.className = "care-save-button";
    save.dataset.saveArticle = article.id;
    save.setAttribute("aria-pressed", String(saved.has(article.id)));
    save.setAttribute("aria-label", saved.has(article.id) ? "取消收藏文章" : "收藏文章");
    save.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4V3Z"/></svg>';
    footer.append(tags, save);
    body.append(meta, title, summary, footer);
    card.append(link, body);
    return card;
  }

  function filteredArticles() {
    const query = state.query.toLowerCase();
    return articles.filter((article) => {
      const matchesType = state.type === "all" || article.contentType === state.type;
      const matchesCategory = state.category === "all" || article.category === state.category;
      const haystack = [article.title, article.summary, ...article.tags].join(" ").toLowerCase();
      return matchesType && matchesCategory && (!query || haystack.includes(query));
    });
  }

  function render() {
    const grid = document.querySelector("[data-care-grid]");
    const count = document.querySelector("[data-care-count]");
    const empty = document.querySelector("[data-care-empty]");
    if (!grid || !count || !empty) return;
    const saved = getSaved();
    const results = filteredArticles();
    grid.replaceChildren(...results.map((article) => createCard(article, saved)));
    count.textContent = `共 ${results.length} 篇資源`;
    empty.hidden = results.length > 0;
  }

  function updateType(nextType) {
    state.type = nextType;
    document.querySelectorAll("[data-care-type]").forEach((button) => {
      const active = button.dataset.careType === nextType;
      button.classList.toggle("care-type-tab--active", active);
      button.setAttribute("aria-selected", String(active));
    });
    render();
  }

  function toggleSaved(button) {
    const saved = getSaved();
    const id = String(button.dataset.saveArticle);
    if (saved.has(id)) saved.delete(id);
    else saved.add(id);
    saveSaved(saved);
    document.querySelectorAll(`[data-save-article="${CSS.escape(id)}"]`).forEach((target) => {
      const active = saved.has(id);
      target.setAttribute("aria-pressed", String(active));
      target.setAttribute("aria-label", active ? "取消收藏文章" : "收藏文章");
    });
    window.CanopyToast?.show?.(saved.has(id) ? "已收藏文章" : "已取消收藏");
  }

  async function init() {
    if (initialized || !document.querySelector("[data-care-page]")) return;
    initialized = true;
    const grid = document.querySelector("[data-care-grid]");
    try {
      articles = await loadArticles();
      const featured = articles.filter((article) => article.featured).slice(0, 3);
      const featuredGrid = document.querySelector("[data-care-featured]");
      if (featuredGrid) featuredGrid.replaceChildren(...featured.map((article) => createCard(article, getSaved())));
      render();
    } catch (error) {
      grid.textContent = error.message;
      grid.classList.add("care-grid--error");
      return;
    }

    document.addEventListener("click", (event) => {
      const typeButton = event.target.closest("[data-care-type]");
      if (typeButton) updateType(typeButton.dataset.careType);
      const saveButton = event.target.closest("[data-save-article]");
      if (saveButton) {
        event.preventDefault();
        toggleSaved(saveButton);
      }
    });
    document.querySelector("[data-care-category]")?.addEventListener("change", (event) => {
      state.category = event.target.value;
      render();
    });
    document.querySelector("[data-care-search]")?.addEventListener("input", (event) => {
      state.query = event.target.value.trim();
      render();
    });
  }

  return { init };
})();
