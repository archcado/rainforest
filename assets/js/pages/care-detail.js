"use strict";

window.CanopyCareDetail = (() => {
  let initialized = false;
  const typeLabels = { guide: "照護指南", diagnosis: "問題診斷", gear: "好物分享", inspiration: "空間靈感" };
  const categoryLabels = {
    watering: "澆水", light: "光照", humidity: "濕度", soil: "介質", repotting: "換盆",
    fertilizing: "施肥", pests: "病蟲害", maintenance: "日常整理", environment: "環境",
    diagnosis: "綜合診斷", tools: "工具", styling: "空間配置",
  };

  function resolveURL(path) {
    return window.CanopyLayout.resolveProjectURL(path);
  }

  function getSaved() {
    try {
      const saved = JSON.parse(localStorage.getItem("canopy_saved_articles"));
      return new Set(Array.isArray(saved) ? saved.map(String) : []);
    } catch {
      return new Set();
    }
  }

  function updateSavedButton(button, articleId) {
    const active = getSaved().has(articleId);
    button.setAttribute("aria-pressed", String(active));
    button.querySelector("span").textContent = active ? "已收藏" : "收藏文章";
  }

  function toggleSaved(button, articleId) {
    const saved = getSaved();
    if (saved.has(articleId)) saved.delete(articleId);
    else saved.add(articleId);
    localStorage.setItem("canopy_saved_articles", JSON.stringify([...saved]));
    updateSavedButton(button, articleId);
    window.CanopyToast?.show?.(saved.has(articleId) ? "已收藏文章" : "已取消收藏");
  }

  function renderArticle(article, payload) {
    document.title = `${article.title}｜CANOPY`;
    document.querySelector("[data-article-breadcrumb]").textContent = article.title;
    document.querySelector("[data-article-type]").textContent = typeLabels[article.contentType] || article.contentType;
    document.querySelector("[data-article-category]").textContent = categoryLabels[article.category] || article.category;
    document.querySelector("[data-article-title]").textContent = article.title;
    document.querySelector("[data-article-summary]").textContent = article.summary;
    document.querySelector("[data-article-meta]").textContent =
      `${article.author} · ${article.publishedAt.replaceAll("-", ".")} · ${article.readingMinutes} 分鐘閱讀`;

    const takeaways = document.querySelector("[data-article-takeaways]");
    takeaways.replaceChildren(...article.keyTakeaways.map((value) => {
      const item = document.createElement("li");
      item.textContent = value;
      return item;
    }));

    const toc = document.querySelector("[data-article-toc]");
    const content = document.querySelector("[data-article-content]");
    const sectionNodes = article.sections.map((section, index) => {
      const id = `section-${index + 1}`;
      const sectionElement = document.createElement("section");
      sectionElement.id = id;
      sectionElement.className = "care-article-section";
      const heading = document.createElement("h2");
      heading.textContent = section.heading;
      sectionElement.append(heading);
      section.paragraphs.forEach((text) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        sectionElement.append(paragraph);
      });
      if (section.bullets?.length) {
        const list = document.createElement("ul");
        section.bullets.forEach((text) => {
          const item = document.createElement("li");
          item.textContent = text;
          list.append(item);
        });
        sectionElement.append(list);
      }
      return sectionElement;
    });
    content.replaceChildren(...sectionNodes);
    toc.replaceChildren(...article.sections.map((section, index) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `#section-${index + 1}`;
      link.textContent = section.heading;
      item.append(link);
      return item;
    }));

    const relatedArticles = document.querySelector("[data-related-articles]");
    const related = article.relatedArticleIds
      .map((id) => payload.articles.find((item) => item.id === id))
      .filter(Boolean);
    relatedArticles.replaceChildren(...related.map((item) => {
      const link = document.createElement("a");
      link.className = "related-resource-link";
      link.href = resolveURL(`pages/care/care-detail.html?slug=${encodeURIComponent(item.slug)}`);
      const type = document.createElement("span");
      type.textContent = typeLabels[item.contentType] || item.contentType;
      const title = document.createElement("strong");
      title.textContent = item.title;
      link.append(type, title);
      return link;
    }));

    const sources = document.querySelector("[data-article-sources]");
    sources.replaceChildren(...payload.references.map((source) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = source.label;
      item.append(link);
      return item;
    }));

    const saveButton = document.querySelector("[data-detail-save]");
    updateSavedButton(saveButton, article.id);
    saveButton.addEventListener("click", () => toggleSaved(saveButton, article.id));
  }

  async function renderRelatedPlants(article) {
    const container = document.querySelector("[data-related-plants]");
    try {
      const plants = await window.CanopyPlantService.getAll();
      const related = article.relatedPlantIds
        .map((id) => plants.find((plant) => plant.id === id))
        .filter(Boolean);
      container.replaceChildren(...related.map((plant) => {
        const link = document.createElement("a");
        link.className = "care-related-plant";
        link.href = plant.detailURL;
        const image = document.createElement("img");
        image.src = plant.image;
        image.alt = plant.imageAlt;
        image.loading = "lazy";
        image.addEventListener("error", () => { image.src = window.CanopyPlantService.getFallbackImage(); }, { once: true });
        const copy = document.createElement("span");
        const name = document.createElement("strong");
        name.textContent = plant.name;
        const scientific = document.createElement("em");
        scientific.textContent = plant.scientificName;
        copy.append(name, scientific);
        link.append(image, copy);
        return link;
      }));
    } catch {
      container.textContent = "相關植物暫時無法載入。";
    }
  }

  async function init() {
    if (initialized || !document.querySelector("[data-care-detail]")) return;
    initialized = true;
    const status = document.querySelector("[data-article-status]");
    try {
      const response = await fetch(resolveURL("data/care-articles.json"), { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("文章資料載入失敗");
      const payload = await response.json();
      const params = new URLSearchParams(window.location.search);
      const key = params.get("slug") || params.get("id");
      const article = payload.articles.find((item) => item.slug === key || item.id === key);
      if (!article) throw new Error("找不到這篇照護資源");
      renderArticle(article, payload);
      await renderRelatedPlants(article);
      status.hidden = true;
      document.querySelector("[data-article-layout]").hidden = false;
    } catch (error) {
      status.textContent = error.message;
      status.dataset.state = "error";
    }
  }

  return { init };
})();
