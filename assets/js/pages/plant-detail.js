"use strict";

/**
 * 植物商品詳情頁。
 * 將 plants-detailed-v2.json 的商品、環境、介質與照護資料完整呈現。
 */
window.CanopyPlantDetail = (() => {
  let initialized = false;
  let currentPlant = null;

  const $ = (selector) => document.querySelector(selector);

  function setText(selector, value, fallback = "—") {
    const element = $(selector);
    if (element) element.textContent = value || fallback;
  }

  function joinSentences(...values) {
    return values
      .flat()
      .filter(Boolean)
      .map((value) => String(value).trim())
      .filter(Boolean)
      .join(" ");
  }

  function getRequestedKey() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || params.get("slug") || "";
  }

  function getVariant(plant) {
    return plant.raw?.commerce?.variants?.find((variant) => variant.active) || null;
  }

  function renderPrice(plant) {
    const container = $("#plant-price");
    if (!container) return;

    const currentPrice = document.createElement("strong");
    currentPrice.className = "plant-detail__price";
    currentPrice.textContent = window.CanopyPlantService.formatCurrency(
      plant.price,
      plant.currency,
    );

    if (!plant.originalPrice) {
      container.classList.remove("plant-detail__pricing--sale");
      container.replaceChildren(currentPrice);
      return;
    }

    container.classList.add("plant-detail__pricing--sale");
    const originalPrice = document.createElement("del");
    originalPrice.className = "plant-detail__original-price";
    originalPrice.textContent = window.CanopyPlantService.formatCurrency(
      plant.originalPrice,
      plant.currency,
    );

    const discount = document.createElement("span");
    discount.className = "plant-detail__discount";
    discount.textContent = `${plant.discountPercentage}% OFF`;
    container.replaceChildren(currentPrice, originalPrice, discount);
  }

  function renderProductHeader(plant) {
    const raw = plant.raw;
    const variant = getVariant(plant);
    const stock = raw.commerce?.totalStock ?? variant?.stockQuantity ?? 0;

    setText("#plant-name-bc", plant.name);
    setText("#plant-name", plant.name);
    setText("#plant-scientific", plant.scientificName);
    setText("#plant-headline", raw.summary?.headline);
    setText("#plant-summary", raw.summary?.shortDescription);
    renderPrice(plant);
    setText("#product-variant", variant?.name);
    setText(
      "#product-height",
      variant?.plantHeightCm
        ? `${variant.plantHeightCm.min}–${variant.plantHeightCm.max} cm`
        : "依實際植株",
    );
    setText("#product-pot", variant?.nurseryPotCm ? `${variant.nurseryPotCm} cm` : "依商品規格");
    setText("#product-decorative-pot", variant?.decorativePotIncluded ? "包含" : "不包含");

    const stockElement = $("#stock-status");
    if (stockElement) {
      stockElement.textContent = plant.stockLabel;
      stockElement.className = `badge ${plant.stockStatus === "low-stock" ? "badge--amber" : plant.inStock ? "badge--green" : "badge--red"}`;
    }

    const quantity = $("#qty");
    if (quantity && Number.isFinite(Number(stock)) && Number(stock) > 0) {
      quantity.max = String(stock);
    }

    const addButton = $("#add-to-cart-btn");
    if (addButton) addButton.disabled = !plant.inStock;

    setText("#care-light", raw.environmentProfile?.light?.label);
    setText("#care-humidity", raw.environmentProfile?.humidity?.label);
    setText("#care-substrate", raw.care?.substrate?.label);

    const list = $("#included-items");
    if (list) {
      const items = raw.commerce?.includedItems || [];
      list.replaceChildren(
        ...items.map((item) => {
          const listItem = document.createElement("li");
          listItem.textContent = item;
          return listItem;
        }),
      );
    }

    document.title = raw.seo?.title || `${plant.name}商品詳情｜CANOPY`;
    const description = document.querySelector('meta[name="description"]');
    if (description && raw.seo?.description) description.content = raw.seo.description;
  }

  function renderGallery(plant) {
    const raw = plant.raw;
    const mediaItems = [raw.media?.heroImage, raw.media?.cardImage, ...(raw.media?.gallery || [])]
      .filter((item) => item?.src)
      .filter((item, index, items) => items.findIndex((candidate) => candidate.src === item.src) === index);
    const fallback = window.CanopyPlantService.getFallbackImage();
    const mainImage = $("#main-image");
    const thumbnails = $("#plant-thumbnails");

    function selectImage(item, button) {
      if (!mainImage) return;
      mainImage.src = window.CanopyPlantService.resolveImageSource(item);
      mainImage.alt = item.alt || `${plant.name}商品圖片`;
      thumbnails?.querySelectorAll("button").forEach((candidate) => {
        candidate.setAttribute("aria-current", String(candidate === button));
      });
    }

    if (mainImage) {
      const first = mediaItems[0];
      mainImage.src = first ? window.CanopyPlantService.resolveImageSource(first) : fallback;
      mainImage.alt = first?.alt || `${plant.name}商品圖片`;
      mainImage.addEventListener("error", () => {
        mainImage.src = fallback;
      });
    }

    if (!thumbnails) return;
    const buttons = mediaItems.map((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "plant-detail__thumb-button";
      button.setAttribute("aria-label", `查看${item.alt || `${plant.name}商品圖片`}`);
      button.setAttribute("aria-current", String(index === 0));

      const image = document.createElement("img");
      image.className = "plant-detail__thumb";
      image.src = window.CanopyPlantService.resolveImageSource(item);
      image.alt = "";
      image.loading = "lazy";
      image.addEventListener("error", () => {
        image.src = fallback;
      });

      button.append(image);
      button.addEventListener("click", () => selectImage(item, button));
      return button;
    });

    thumbnails.replaceChildren(...buttons);
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function createScale(name, profile, type = "range") {
    const row = document.createElement("div");
    row.className = "environment-row";

    const label = document.createElement("p");
    label.className = "environment-row__name";
    label.textContent = name;

    const scale = document.createElement("div");
    scale.className = "environment-scale";

    const track = document.createElement("div");
    track.className = "environment-scale__track";
    const range = document.createElement("span");
    range.className = "environment-scale__range";

    let labels = [];
    let start = 0;
    let size = 0;

    if (type === "category") {
      labels = profile.scale || [];
      const maximum = Math.max(1, labels.length - 1);
      start = (clamp(Number(profile.idealMin), 0, maximum) / maximum) * 100;
      const end = (clamp(Number(profile.idealMax), 0, maximum) / maximum) * 100;
      size = Math.max(4, end - start);
    } else if (type === "point") {
      labels = profile.scale || [];
      const maximum = Math.max(1, labels.length - 1);
      start = (clamp(Number(profile.value), 0, maximum) / maximum) * 100;
      size = 0;
      range.classList.add("environment-scale__range--point");
    } else {
      const minimum = Number(profile.scaleMin);
      const maximum = Number(profile.scaleMax);
      const span = Math.max(1, maximum - minimum);
      start = ((Number(profile.idealMin) - minimum) / span) * 100;
      const end = ((Number(profile.idealMax) - minimum) / span) * 100;
      size = end - start;
      labels = [`${minimum}${profile.unit || ""}`, `${maximum}${profile.unit || ""}`];
    }

    track.style.setProperty("--range-start", `${clamp(start, 0, 100)}%`);
    track.style.setProperty("--range-size", `${clamp(size, 0, 100 - start)}%`);
    track.append(range);

    const scaleLabels = document.createElement("div");
    scaleLabels.className = "environment-scale__labels";
    scaleLabels.replaceChildren(
      ...labels.map((text) => {
        const item = document.createElement("span");
        item.textContent = text;
        return item;
      }),
    );

    scale.append(track, scaleLabels);

    const value = document.createElement("p");
    value.className = "environment-row__value";
    value.textContent = profile.label || "—";

    row.append(label, scale, value);
    return row;
  }

  function renderEnvironment(plant) {
    const profile = plant.raw.environmentProfile || {};
    const container = $("#environment-profile");
    if (!container) return;

    container.replaceChildren(
      createScale("光照", profile.light || {}, "category"),
      createScale("濕度", profile.humidity || {}, "range"),
      createScale("溫度", profile.temperature || {}, "range"),
      createScale("生長速度", profile.growthRate || {}, "point"),
    );
  }

  function renderCare(plant) {
    const raw = plant.raw;
    const care = raw.care || {};
    const morphology = raw.morphology || {};
    const height = morphology.matureIndoorSize?.heightCm;
    const habitLabel = {
      climbing: "攀爬型",
      trailing: "垂吊／蔓生型",
      upright: "直立型",
      clumping: "叢生型",
      rosette: "蓮座型",
    }[morphology.growthHabit] || "自然株型";

    setText("#plant-long-description", raw.summary?.longDescription);
    setText("#care-light-detail", joinSentences(care.light?.placement, care.light?.notes));
    setText("#care-humidity-detail", joinSentences(`建議相對濕度 ${care.humidity?.preferred || "依品種需求"}。`, care.humidity?.notes));
    setText("#care-temperature-detail", care.temperature?.preferredCelsius ? `適宜溫度為 ${care.temperature.preferredCelsius.min}–${care.temperature.preferredCelsius.max}°C，避免低於 ${care.temperature.minimumCelsius}°C 及冷暖氣直接吹拂。` : "維持溫暖且穩定的室內溫度。");
    setText("#care-watering-detail", joinSentences(care.watering?.trigger, care.watering?.method, care.watering?.avoid?.length ? `避免：${care.watering.avoid.join("、")}。` : ""));
    setText("#care-substrate-detail", joinSentences(care.substrate?.summary, `介質特性：${(care.substrate?.properties || []).join("、")}。`));
    setText("#care-growth-detail", joinSentences(`${habitLabel}，生長速度${raw.environmentProfile?.growthRate?.label || "依環境而異"}。`, height ? `成熟室內株高約 ${height.min}–${height.max} 公分。` : "", care.fertilizing));
  }

  function renderSubstrate(plant) {
    const substrate = plant.raw.care?.substrate || {};
    setText("#substrate-summary", joinSentences(substrate.label, substrate.summary));
    setText("#substrate-repotting-note", substrate.repottingNote ? `換盆建議：${substrate.repottingNote}` : "依根系與介質狀態決定換盆時機。"
    );

    const container = $("#substrate-composition");
    if (!container) return;

    const components = substrate.components || [];
    const bar = document.createElement("div");
    bar.className = "substrate-bar";
    bar.setAttribute("aria-label", components.map((item) => `${item.name} ${item.percentage}%`).join("、"));

    bar.replaceChildren(
      ...components.map((item) => {
        const segment = document.createElement("span");
        segment.className = "substrate-bar__segment";
        segment.style.width = `${item.percentage}%`;
        segment.textContent = `${item.percentage}%`;
        return segment;
      }),
    );

    const legend = document.createElement("div");
    legend.className = "substrate-legend";
    legend.replaceChildren(
      ...components.map((item) => {
        const legendItem = document.createElement("div");
        legendItem.className = "substrate-legend__item";
        const name = document.createElement("span");
        name.textContent = item.name;
        const value = document.createElement("strong");
        value.textContent = `${item.percentage}%`;
        legendItem.append(name, value);
        return legendItem;
      }),
    );

    container.replaceChildren(bar, legend);
  }

  function renderProductNotes(plant) {
    const raw = plant.raw;
    setText("#living-plant-notice", raw.commerce?.livingPlantNotice);
    setText("#shipping-note", raw.commerce?.shipping?.notes);
    setText("#safety-note", joinSentences(raw.safety?.note, raw.safety?.disclaimer));
  }

  async function renderRelated(plant) {
    const container = $("#related-plants-grid");
    if (!container) return;

    const relatedIds = plant.raw.relations?.relatedPlantIds || [];
    const plants = await window.CanopyPlantService.getAll();
    const related = relatedIds
      .map((id) => plants.find((candidate) => candidate.id === id))
      .filter(Boolean)
      .slice(0, 3);
    const fallback = window.CanopyPlantService.getFallbackImage();

    const cards = related.map((item) => {
      const article = document.createElement("article");
      article.className = "related-plant-card";

      const link = document.createElement("a");
      link.href = item.detailURL;
      link.setAttribute("aria-label", `查看${item.name}商品詳情`);

      const image = document.createElement("img");
      image.className = "related-plant-card__image";
      image.src = item.image;
      image.alt = item.imageAlt;
      image.loading = "lazy";
      image.addEventListener("error", () => {
        image.src = fallback;
      });

      const body = document.createElement("div");
      body.className = "related-plant-card__body";
      const title = document.createElement("h3");
      title.textContent = item.name;
      const scientific = document.createElement("p");
      scientific.textContent = item.scientificName;
      const price = document.createElement("strong");
      price.textContent = window.CanopyPlantService.formatCurrency(item.price, item.currency);
      body.append(title, scientific, price);
      link.append(image, body);
      article.append(link);
      return article;
    });

    container.replaceChildren(...cards);
  }

  function bindPurchaseActions(plant) {
    const addButton = $("#add-to-cart-btn");
    addButton?.addEventListener("click", () => {
      const requestedQuantity = Math.max(1, Number($("#qty")?.value || 1));
      const maximumQuantity = Number(plant.stockQuantity || requestedQuantity);
      const quantity = Math.min(requestedQuantity, maximumQuantity);
      window.CanopyCart?.addItem(
        {id: plant.id, name: plant.name, price: plant.price, image: plant.image},
        quantity,
      );
    });

    const favoriteButton = $("#favorite-btn");
    const favoriteKey = "canopy_favorites";
    let initialFavorites = [];
    try {
      initialFavorites = JSON.parse(localStorage.getItem(favoriteKey)) || [];
    } catch {
      initialFavorites = [];
    }

    const initialSelected = initialFavorites.includes(plant.id);
    if (favoriteButton) {
      favoriteButton.textContent = initialSelected ? "已收藏" : "收藏";
      favoriteButton.setAttribute("aria-pressed", String(initialSelected));
      favoriteButton.setAttribute(
        "aria-label",
        `${initialSelected ? "取消收藏" : "加入收藏"} ${plant.name}`,
      );
    }

    favoriteButton?.addEventListener("click", () => {
      let favorites = [];
      try {
        favorites = JSON.parse(localStorage.getItem(favoriteKey)) || [];
      } catch {
        favorites = [];
      }

      const selected = favorites.includes(plant.id);
      favorites = selected
        ? favorites.filter((id) => id !== plant.id)
        : [...favorites, plant.id];
      localStorage.setItem(favoriteKey, JSON.stringify(favorites));
      favoriteButton.textContent = selected ? "收藏" : "已收藏";
      favoriteButton.setAttribute("aria-pressed", String(!selected));
      favoriteButton.setAttribute(
        "aria-label",
        `${selected ? "加入收藏" : "取消收藏"} ${plant.name}`,
      );
      window.CanopyToast?.success(selected ? "已取消收藏" : `${plant.name} 已加入收藏`);
    });
  }

  async function init() {
    if (initialized || !$("#plant-detail-content")) return;
    initialized = true;

    try {
      const key = getRequestedKey();
      const plants = await window.CanopyPlantService.getAll();
      currentPlant = key
        ? await window.CanopyPlantService.getByIdOrSlug(key)
        : plants[0] || null;

      if (!currentPlant) throw new Error("找不到植物商品");

      renderProductHeader(currentPlant);
      renderGallery(currentPlant);
      renderEnvironment(currentPlant);
      renderCare(currentPlant);
      renderSubstrate(currentPlant);
      renderProductNotes(currentPlant);
      await renderRelated(currentPlant);
      bindPurchaseActions(currentPlant);

      $("#plant-detail-loading").hidden = true;
      $("#plant-detail-content").hidden = false;
    } catch (error) {
      console.error("植物商品詳情載入失敗。", error);
      $("#plant-detail-loading").hidden = true;
      $("#plant-detail-error").hidden = false;
    }
  }

  return {init};
})();
