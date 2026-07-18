"use strict";

/**
 * 植物資料服務。
 * 將 plants-detailed-v2.json 轉換成頁面與配對功能共用的穩定模型。
 * 未來改接 API 時，只需要替換 load() 的資料來源。
 */
window.CanopyPlantService = (() => {
  const scriptURL = document.currentScript?.src
    ? new URL(document.currentScript.src)
    : new URL("assets/js/services/plant-service.js", window.location.href);
  const fallbackRootURL = new URL("../../../", scriptURL);
  let plantsPromise = null;

  function resolveProjectURL(path = "") {
    if (window.CanopyLayout?.resolveProjectURL) {
      return window.CanopyLayout.resolveProjectURL(path);
    }
    return new URL(String(path).replace(/^\/+/, ""), fallbackRootURL).href;
  }

  function getFallbackImage() {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 800">
        <rect width="640" height="800" fill="#eef3e5"/>
        <circle cx="170" cy="220" r="180" fill="#c5dc99" opacity=".58"/>
        <circle cx="500" cy="285" r="155" fill="#b8ddc1" opacity=".62"/>
        <path d="M320 690V300" stroke="#385943" stroke-width="18" stroke-linecap="round"/>
        <path d="M310 390C205 365 135 285 120 180c118 23 191 91 190 210Z" fill="#4b6f55"/>
        <path d="M330 465c115-34 207 7 255 105-123 38-216 3-255-105Z" fill="#66866d"/>
        <path d="M313 560c-92-22-166 14-213 97 105 24 180-9 213-97Z" fill="#87a58d"/>
      </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function resolveImageSource(value) {
    if (value && typeof value === "object") {
      value = value.src || value.url || value.path || "";
    }
    if (!value || typeof value !== "string") return getFallbackImage();
    if (/^(https?:|data:|blob:)/i.test(value)) return value;
    return resolveProjectURL(value);
  }

  function getActiveVariant(raw) {
    return raw.commerce?.variants?.find((variant) => variant.active) || null;
  }

  function normalizeHumidity(value) {
    const normalized = String(value || "normal-home").toLowerCase();
    if (normalized.includes("high")) return "high";
    if (normalized.includes("medium")) return "medium";
    return "normal";
  }

  function normalizeSize(spaces) {
    const values = Array.isArray(spaces) ? spaces : [];
    if (values.length === 1 && values[0] === "large-space") return "large";
    if (values.includes("small-space")) return "small";
    if (values.includes("medium-space")) return "medium";
    return values.includes("large-space") ? "large" : "medium";
  }

  function normalizePlant(raw, index = 0) {
    const activeVariant = getActiveVariant(raw);
    const regularPrice = Number(
      activeVariant?.price?.amount ?? raw.commerce?.basePrice?.amount ?? 0,
    );
    const salePrice = Number(
      activeVariant?.salePrice?.amount ?? raw.commerce?.salePrice?.amount ?? NaN,
    );
    const explicitOriginalPrice = Number(
      activeVariant?.compareAtPrice?.amount ??
        activeVariant?.regularPrice?.amount ??
        raw.commerce?.compareAtPrice?.amount ??
        raw.commerce?.regularPrice?.amount ??
        NaN,
    );
    const currentPrice = Number.isFinite(salePrice) ? salePrice : regularPrice;
    const originalPriceCandidate = Number.isFinite(explicitOriginalPrice)
      ? explicitOriginalPrice
      : Number.isFinite(salePrice)
        ? regularPrice
        : NaN;
    const originalPrice =
      Number.isFinite(originalPriceCandidate) && originalPriceCandidate > currentPrice
        ? originalPriceCandidate
        : null;
    const discountPercentage = originalPrice
      ? Math.round((1 - currentPrice / originalPrice) * 100)
      : 0;
    const stockStatus = activeVariant?.stockStatus || raw.commerce?.stockStatus || "unknown";
    const stockQuantity = activeVariant?.stockQuantity ?? raw.commerce?.totalStock ?? null;
    const inStock = !["out-of-stock", "discontinued", "unavailable"].includes(stockStatus);
    const acceptedLight = raw.care?.light?.acceptedLevels || [];
    const spaces = raw.catalog?.filterKeys?.space || [];
    const image = raw.media?.cardImage || raw.media?.heroImage || null;
    const substrateType = raw.care?.substrate?.type || raw.catalog?.filterKeys?.substrate || "balanced";
    const substrateLabel = raw.care?.substrate?.label || "均衡保水型介質";

    return {
      id: String(raw.id || `plant-${index + 1}`),
      slug: String(raw.slug || raw.id || `plant-${index + 1}`),
      status: raw.status || "draft",
      name: raw.identity?.name || "未命名植物",
      shortName: raw.identity?.shortName || raw.identity?.name || "未命名植物",
      scientificName: raw.identity?.scientificName || "",
      category: raw.catalog?.categoryLabel || "觀葉植物",
      summary: raw.summary?.shortDescription || "",
      featured: Boolean(raw.catalog?.featured),
      price: Number.isFinite(currentPrice) ? currentPrice : 0,
      originalPrice,
      onSale: Boolean(originalPrice),
      discountPercentage,
      currency:
        activeVariant?.salePrice?.currency ||
        raw.commerce?.salePrice?.currency ||
        activeVariant?.price?.currency ||
        raw.commerce?.basePrice?.currency ||
        "TWD",
      sellable: Boolean(raw.commerce?.sellable),
      activeVariant: Boolean(activeVariant),
      stockStatus,
      stockQuantity,
      stock: inStock ? Number(stockQuantity ?? 1) : 0,
      inStock,
      stockLabel:
        stockStatus === "low-stock"
          ? "庫存有限"
          : inStock
            ? "現貨供應"
            : "暫時缺貨",
      image: resolveImageSource(image),
      imageAlt: image?.alt || `${raw.identity?.name || "觀葉植物"}商品圖片`,
      light: acceptedLight[0] || raw.care?.light?.primary || "bright-indirect",
      lights: acceptedLight,
      humidity: normalizeHumidity(raw.care?.humidity?.level),
      substrate: substrateType,
      substrateLabel,
      size: normalizeSize(spaces),
      petSafe: Boolean(raw.safety?.petFriendly),
      care: {
        lightPrimary: raw.care?.light?.primary || acceptedLight[0] || "",
        acceptedLight,
        humidity: raw.care?.humidity?.level || "normal-home",
        observationFrequency: raw.care?.observationFrequency || "medium",
        environmentSensitivity: raw.care?.environmentSensitivity || "moderate",
        substrateType,
        substrateLabel,
        watering: raw.care?.watering?.trigger || "",
      },
      safety: {
        petFriendly: Boolean(raw.safety?.petFriendly),
        toxicTo: raw.safety?.toxicTo || [],
        riskLevel: raw.safety?.riskLevel || "",
        disclaimer: raw.safety?.disclaimer || "",
      },
      matchProfile: {
        lights: acceptedLight,
        humidity: raw.care?.humidity?.level || "normal-home",
        observationFrequency: raw.care?.observationFrequency || "medium",
        environmentSensitivity: raw.care?.environmentSensitivity || "moderate",
        spaces,
        growthHabit: raw.morphology?.growthHabit || "",
        petFriendly: Boolean(raw.safety?.petFriendly),
        price: Number.isFinite(currentPrice) ? currentPrice : 0,
      },
      detailURL: resolveProjectURL(
        `pages/plants/plant-detail.html?id=${encodeURIComponent(raw.id || "")}&slug=${encodeURIComponent(raw.slug || "")}`,
      ),
      sourceRefs: raw.editorial?.sourceRefs || [],
      raw,
    };
  }

  async function load() {
    if (!plantsPromise) {
      plantsPromise = (async () => {
        try {
          const apiResponse = await fetch("/api/plants", { headers: { Accept: "application/json" } });
          const contentType = apiResponse.headers.get("content-type") || "";
          if (apiResponse.ok && contentType.includes("application/json")) return apiResponse.json();
        } catch {}

        const fallbackResponse = await fetch(resolveProjectURL("data/plants-detailed-v2.json"), {
          headers: { Accept: "application/json" },
        });
        if (!fallbackResponse.ok) {
          throw new Error(`植物資料載入失敗（HTTP ${fallbackResponse.status}）`);
        }
        return fallbackResponse.json();
      })()
        .then((response) => {
          const payload = response;
          const source = Array.isArray(payload) ? payload : payload.plants;
          if (!Array.isArray(source)) throw new TypeError("植物資料缺少 plants 陣列。");
          return source.map(normalizePlant);
        })
        .catch((error) => {
          plantsPromise = null;
          throw error;
        });
    }

    return plantsPromise;
  }

  async function getAll() {
    return [...(await load())];
  }

  async function getPurchasable() {
    return (await load()).filter(
      (plant) => plant.status === "published" && plant.sellable && plant.activeVariant && plant.inStock,
    );
  }

  async function getByIdOrSlug(value) {
    const key = String(value || "");
    return (await load()).find((plant) => plant.id === key || plant.slug === key) || null;
  }

  function formatCurrency(amount, currency = "TWD") {
    return new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  }

  return {
    load,
    getAll,
    getPurchasable,
    getByIdOrSlug,
    normalizePlant,
    resolveProjectURL,
    resolveImageSource,
    getFallbackImage,
    formatCurrency,
    resetCache() { plantsPromise = null; },
  };
})();
