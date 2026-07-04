"use strict";

/**
 * plants.js
 * ─────────────────────────────────────────────
 * 植物商城頁面模組
 *
 * 職責：
 * 1. 讀取植物 JSON 資料
 * 2. 標準化植物資料格式
 * 3. 渲染植物卡片
 * 4. 處理文字搜尋
 * 5. 處理排序
 * 6. 接收 CanopyFilters 的篩選狀態
 * 7. 處理分頁
 * 8. 管理載入、錯誤與無結果狀態
 * ─────────────────────────────────────────────
 */

window.CanopyPlants = {
  _initialized: false,

  _dataURL: "../../data/plants-detailed-v2.json",

  _plants: [],
  _filteredPlants: [],
  _filters: {},
  _searchTerm: "",
  _sortValue: "default",
  _currentPage: 1,
  _itemsPerPage: 9,
  _searchTimer: null,

  _elements: {
    grid: null,
    count: null,
    searchInput: null,
    sortSelect: null,
    loading: null,
    error: null,
    empty: null,
    retryButton: null,
    pagination: null,
  },

  /**
   * 初始化植物商城頁面。
   */
  init() {
    if (this._initialized) {
      return;
    }

    this.cacheElements();

    if (!this._elements.grid) {
      return;
    }

    this.bindEvents();

    if (
      window.CanopyFilters &&
      typeof window.CanopyFilters.getState === "function"
    ) {
      this._filters = window.CanopyFilters.getState();
    }

    this._initialized = true;
    this.loadPlants();
  },

  /**
   * 取得頁面所需 DOM。
   */
  cacheElements() {
    this._elements.grid = document.querySelector("#plants-grid");
    this._elements.count = document.querySelector("#plants-count");
    this._elements.searchInput = document.querySelector("#plants-search");
    this._elements.sortSelect = document.querySelector("#plants-sort");
    this._elements.loading = document.querySelector("#plants-loading");
    this._elements.error = document.querySelector("#plants-error");
    this._elements.empty = document.querySelector("#plants-empty");
    this._elements.retryButton = document.querySelector("#retry-plants-btn");
    this._elements.pagination = document.querySelector("#plants-pagination");
  },

  /**
   * 綁定頁面事件。
   */
  bindEvents() {
    const { searchInput, sortSelect, retryButton, pagination } = this._elements;

    searchInput?.addEventListener("input", (event) => {
      window.clearTimeout(this._searchTimer);

      this._searchTimer = window.setTimeout(() => {
        this._searchTerm = event.target.value.trim().toLocaleLowerCase("zh-TW");
        this._currentPage = 1;
        this.render();
      }, 180);
    });

    sortSelect?.addEventListener("change", (event) => {
      this._sortValue = event.target.value;
      this._currentPage = 1;
      this.render();
    });

    retryButton?.addEventListener("click", () => {
      this.loadPlants();
    });

    pagination?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");

      if (!button || button.disabled) {
        return;
      }

      const page = Number(button.dataset.page);

      if (!Number.isInteger(page) || page < 1) {
        return;
      }

      this._currentPage = page;
      this.render();

      const toolbar = document.querySelector(".plants-toolbar");

      if (toolbar) {
        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;

        toolbar.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
      }
    });

    document.addEventListener("canopy:filters-change", (event) => {
      this._filters = event.detail?.filters ?? {};
      this._currentPage = 1;
      this.render();
    });
  },

  /**
   * 讀取植物資料。
   */
  async loadPlants() {
    this.setViewState("loading");

    try {
      const response = await fetch(this._dataURL, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`植物資料載入失敗，HTTP 狀態碼：${response.status}`);
      }

      const payload = await response.json();
      const sourcePlants = this.extractPlantArray(payload);

      if (!Array.isArray(sourcePlants)) {
        throw new TypeError("植物資料格式錯誤，找不到植物陣列。");
      }

      this._plants = sourcePlants
        .map((plant, index) => this.normalizePlant(plant, index))
        .filter((plant) => plant !== null);

      this._currentPage = 1;
      this.render();
    } catch (error) {
      console.error("無法載入植物資料。", error);
      this._plants = [];
      this._filteredPlants = [];
      this.updateCount(0);
      this.setViewState("error");
    }
  },

  /**
   * 從不同 JSON 外層格式中找出植物陣列。
   *
   * 可支援：
   * 1. 直接使用陣列
   * 2. { plants: [] }
   * 3. { items: [] }
   * 4. { data: [] }
   *
   * @param {unknown} payload
   * @returns {unknown[]|null}
   */
  extractPlantArray(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (!payload || typeof payload !== "object") {
      return null;
    }

    if (Array.isArray(payload.plants)) {
      return payload.plants;
    }

    if (Array.isArray(payload.items)) {
      return payload.items;
    }

    if (Array.isArray(payload.data)) {
      return payload.data;
    }

    if (Array.isArray(payload.data?.plants)) {
      return payload.data.plants;
    }

    return null;
  },

  /**
   * 將不同資料模型轉換成植物列表頁統一格式。
   *
   * @param {Record<string, unknown>} rawPlant
   * @param {number} index
   * @returns {Record<string, unknown>|null}
   */
  normalizePlant(rawPlant, index) {
    if (!rawPlant || typeof rawPlant !== "object") {
      return null;
    }

    const name = String(
      this.getValue(rawPlant, [
        "name",
        "nameZh",
        "displayName",
        "basic.name",
        "basic.nameZh",
      ]) ?? `未命名植物 ${index + 1}`,
    ).trim();

    const scientificName = String(
      this.getValue(rawPlant, [
        "scientificName",
        "scientific_name",
        "latinName",
        "taxonomy.scientificName",
        "basic.scientificName",
      ]) ?? "",
    ).trim();

    const id = String(
      this.getValue(rawPlant, [
        "id",
        "plantId",
        "plant_id",
        "code",
        "basic.id",
      ]) ?? `plant-${index + 1}`,
    );

    const slug = String(
      this.getValue(rawPlant, ["slug", "urlSlug", "basic.slug"]) ??
        this.createSlug(name, id),
    );

    const category = String(
      this.getValue(rawPlant, [
        "category",
        "categoryName",
        "category.name",
        "taxonomy.category",
        "basic.category",
      ]) ?? "雨林植物",
    );

    const price = this.toNumber(
      this.getValue(rawPlant, [
        "price",
        "salePrice",
        "commerce.price",
        "product.price",
        "purchase.price",
      ]),
      0,
    );

    const stock = this.toNumber(
      this.getValue(rawPlant, [
        "stock",
        "stockQuantity",
        "inventory.stock",
        "inventory.quantity",
        "commerce.stock",
      ]),
      0,
    );

    const light = this.normalizeLight(
      this.getValue(rawPlant, [
        "light",
        "lightLevel",
        "care.light",
        "care.light.level",
        "careProfile.light",
        "careProfile.light.level",
      ]),
    );

    const humidity = this.normalizeHumidity(
      this.getValue(rawPlant, [
        "humidity",
        "humidityLevel",
        "care.humidity",
        "care.humidity.level",
        "careProfile.humidity",
        "careProfile.humidity.level",
      ]),
    );

    const difficulty = this.normalizeDifficulty(
      this.getValue(rawPlant, [
        "difficulty",
        "careLevel",
        "care.difficulty",
        "careProfile.difficulty",
      ]),
    );

    const size = this.normalizeSize(
      this.getValue(rawPlant, [
        "size",
        "sizeCategory",
        "dimensions.size",
        "dimensions.sizeCategory",
        "basic.size",
      ]),
    );

    const petSafe = this.toBoolean(
      this.getValue(rawPlant, [
        "petSafe",
        "pet_safe",
        "safety.petSafe",
        "safety.isPetSafe",
        "care.petSafe",
      ]),
    );

    const featured = this.toBoolean(
      this.getValue(rawPlant, ["featured", "isFeatured", "commerce.featured"]),
    );

    const image = this.resolveImage(
      this.getValue(rawPlant, [
        "image",
        "imageUrl",
        "thumbnail",
        "coverImage",
        "images.0",
        "images.0.url",
        "media.cover",
        "media.images.0",
        "media.images.0.url",
      ]),
    );

    return {
      id,
      slug,
      name,
      scientificName,
      category,
      price,
      stock,
      light,
      humidity,
      difficulty,
      size,
      petSafe,
      featured,
      image,
    };
  },

  /**
   * 執行搜尋、篩選、排序與分頁。
   */
  render() {
    if (!this._initialized) {
      return;
    }

    let result = [...this._plants];

    result = this.applySearch(result);
    result = this.applyFilters(result);
    result = this.applySorting(result);

    this._filteredPlants = result;
    this.updateCount(result.length);

    if (result.length === 0) {
      this._currentPage = 1;
      this._elements.grid.replaceChildren();
      this.setViewState("empty");
      return;
    }

    const totalPages = Math.ceil(result.length / this._itemsPerPage);

    if (this._currentPage > totalPages) {
      this._currentPage = totalPages;
    }

    const startIndex = (this._currentPage - 1) * this._itemsPerPage;
    const visiblePlants = result.slice(
      startIndex,
      startIndex + this._itemsPerPage,
    );

    const cards = visiblePlants.map((plant) => this.createPlantCard(plant));

    this._elements.grid.replaceChildren(...cards);
    this._elements.grid.setAttribute("aria-busy", "false");

    this.renderPagination(totalPages);
    this.setViewState("ready");

    document.dispatchEvent(
      new CustomEvent("canopy:plants-rendered", {
        detail: {
          total: result.length,
          page: this._currentPage,
          totalPages,
        },
      }),
    );
  },

  /**
   * 套用文字搜尋。
   *
   * @param {Record<string, unknown>[]} plants
   * @returns {Record<string, unknown>[]}
   */
  applySearch(plants) {
    if (!this._searchTerm) {
      return plants;
    }

    return plants.filter((plant) => {
      const searchableText = [plant.name, plant.scientificName, plant.category]
        .join(" ")
        .toLocaleLowerCase("zh-TW");

      return searchableText.includes(this._searchTerm);
    });
  },

  /**
   * 套用篩選條件。
   *
   * @param {Record<string, unknown>[]} plants
   * @returns {Record<string, unknown>[]}
   */
  applyFilters(plants) {
    const filters = this._filters ?? {};

    return plants.filter((plant) => {
      if (!this.matchesFilterValue(plant.light, filters.light)) {
        return false;
      }

      if (!this.matchesFilterValue(plant.difficulty, filters.difficulty)) {
        return false;
      }

      if (!this.matchesFilterValue(plant.humidity, filters.humidity)) {
        return false;
      }

      if (!this.matchesFilterValue(plant.size, filters.size)) {
        return false;
      }

      if (
        filters.petSafe &&
        String(plant.petSafe) !== String(this.getFirstValue(filters.petSafe))
      ) {
        return false;
      }

      const minimumPrice = this.toNumber(
        this.getFirstValue(filters.priceMin),
        null,
      );

      const maximumPrice = this.toNumber(
        this.getFirstValue(filters.priceMax),
        null,
      );

      if (minimumPrice !== null && plant.price < minimumPrice) {
        return false;
      }

      if (maximumPrice !== null && plant.price > maximumPrice) {
        return false;
      }

      return true;
    });
  },

  /**
   * 判斷單一植物值是否符合篩選條件。
   *
   * @param {unknown} plantValue
   * @param {unknown} filterValue
   * @returns {boolean}
   */
  matchesFilterValue(plantValue, filterValue) {
    if (
      filterValue === undefined ||
      filterValue === null ||
      filterValue === ""
    ) {
      return true;
    }

    const acceptedValues = Array.isArray(filterValue)
      ? filterValue
      : [filterValue];

    return acceptedValues.map(String).includes(String(plantValue));
  },

  /**
   * 套用排序。
   *
   * @param {Record<string, unknown>[]} plants
   * @returns {Record<string, unknown>[]}
   */
  applySorting(plants) {
    const sortedPlants = [...plants];

    switch (this._sortValue) {
      case "featured":
        sortedPlants.sort((a, b) => {
          return Number(b.featured) - Number(a.featured);
        });
        break;

      case "price-asc":
        sortedPlants.sort((a, b) => a.price - b.price);
        break;

      case "price-desc":
        sortedPlants.sort((a, b) => b.price - a.price);
        break;

      case "name-asc":
        sortedPlants.sort((a, b) => {
          return a.name.localeCompare(b.name, "zh-Hant");
        });
        break;

      default:
        break;
    }

    return sortedPlants;
  },

  /**
   * 建立植物卡片。
   *
   * @param {Record<string, unknown>} plant
   * @returns {HTMLElement}
   */
  createPlantCard(plant) {
    const article = document.createElement("article");
    article.className = "plant-card";
    article.dataset.plantId = plant.id;

    const media = document.createElement("div");
    media.className = "plant-card__media";

    const imageLink = document.createElement("a");
    imageLink.className = "plant-card__image";
    imageLink.href = this.createDetailURL(plant);

    const image = document.createElement("img");
    image.src = plant.image || this.getFallbackImage();
    image.alt = `${plant.name}植物照片`;
    image.width = 640;
    image.height = 480;
    image.loading = "lazy";
    image.decoding = "async";

    image.addEventListener(
      "error",
      () => {
        image.src = this.getFallbackImage();
      },
      { once: true },
    );

    imageLink.append(image);
    media.append(imageLink);

    if (plant.featured) {
      const featuredBadge = document.createElement("span");
      featuredBadge.className = "plant-card__featured";
      featuredBadge.textContent = "精選植物";
      media.append(featuredBadge);
    }

    const body = document.createElement("div");
    body.className = "plant-card__body";

    const category = document.createElement("p");
    category.className = "plant-card__category";
    category.textContent = plant.category;

    const title = document.createElement("h3");
    title.className = "plant-card__title";

    const titleLink = document.createElement("a");
    titleLink.href = this.createDetailURL(plant);
    titleLink.textContent = plant.name;

    title.append(titleLink);

    const scientificName = document.createElement("p");
    scientificName.className = "plant-card__scientific";
    scientificName.textContent = plant.scientificName;

    const tags = document.createElement("div");
    tags.className = "plant-card__tags";

    tags.append(
      this.createTag(this.getLightLabel(plant.light)),
      this.createTag(this.getDifficultyLabel(plant.difficulty)),
    );

    if (plant.petSafe) {
      tags.append(this.createTag("寵物友善"));
    }

    const footer = document.createElement("div");
    footer.className = "plant-card__footer";

    const price = document.createElement("p");
    price.className = "plant-card__price";
    price.textContent = this.formatCurrency(plant.price);

    const stock = document.createElement("p");
    stock.className =
      plant.stock > 0
        ? "plant-card__stock"
        : "plant-card__stock plant-card__stock--empty";

    stock.textContent = plant.stock > 0 ? "現貨供應" : "暫時缺貨";

    const actions = document.createElement("div");
    actions.className = "plant-card__actions";

    const detailLink = document.createElement("a");
    detailLink.className = "btn btn--outline";
    detailLink.href = this.createDetailURL(plant);
    detailLink.textContent = "查看詳情";

    footer.append(price, stock);
    actions.append(detailLink);

    body.append(category, title, scientificName, tags, footer, actions);

    article.append(media, body);

    return article;
  },

  /**
   * 建立植物資訊標籤。
   *
   * @param {string} text
   * @returns {HTMLElement}
   */
  createTag(text) {
    const tag = document.createElement("span");
    tag.className = "plant-card__tag";
    tag.textContent = text;
    return tag;
  },

  /**
   * 建立分頁。
   *
   * @param {number} totalPages
   */
  renderPagination(totalPages) {
    const { pagination } = this._elements;

    if (!pagination || totalPages <= 1) {
      if (pagination) {
        pagination.hidden = true;
        pagination.replaceChildren();
      }

      return;
    }

    const fragment = document.createDocumentFragment();

    fragment.append(
      this.createPaginationButton(
        "上一頁",
        this._currentPage - 1,
        this._currentPage === 1,
      ),
    );

    this.getVisiblePageNumbers(totalPages).forEach((page) => {
      const button = this.createPaginationButton(String(page), page, false);

      if (page === this._currentPage) {
        button.setAttribute("aria-current", "page");
      }

      fragment.append(button);
    });

    fragment.append(
      this.createPaginationButton(
        "下一頁",
        this._currentPage + 1,
        this._currentPage === totalPages,
      ),
    );

    pagination.replaceChildren(fragment);
    pagination.hidden = false;
  },

  /**
   * 建立分頁按鈕。
   *
   * @param {string} label
   * @param {number} page
   * @param {boolean} disabled
   * @returns {HTMLButtonElement}
   */
  createPaginationButton(label, page, disabled) {
    const button = document.createElement("button");

    button.className = "pagination__button";
    button.type = "button";
    button.textContent = label;
    button.dataset.page = String(page);
    button.disabled = disabled;

    return button;
  },

  /**
   * 取得需要顯示的頁碼。
   *
   * @param {number} totalPages
   * @returns {number[]}
   */
  getVisiblePageNumbers(totalPages) {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const start = Math.max(1, Math.min(this._currentPage - 2, totalPages - 4));

    return Array.from({ length: 5 }, (_, index) => start + index);
  },

  /**
   * 更新植物數量。
   *
   * @param {number} count
   */
  updateCount(count) {
    if (this._elements.count) {
      this._elements.count.textContent = String(count);
    }
  },

  /**
   * 切換頁面顯示狀態。
   *
   * @param {"loading"|"ready"|"error"|"empty"} state
   */
  setViewState(state) {
    const { grid, loading, error, empty, pagination } = this._elements;

    if (loading) {
      loading.hidden = state !== "loading";
    }

    if (error) {
      error.hidden = state !== "error";
    }

    if (empty) {
      empty.hidden = state !== "empty";
    }

    if (grid) {
      grid.hidden = state !== "ready";
      grid.setAttribute("aria-busy", state === "loading" ? "true" : "false");
    }

    if (pagination && state !== "ready") {
      pagination.hidden = true;
    }
  },

  /**
   * 建立植物詳情頁網址。
   *
   * @param {Record<string, unknown>} plant
   * @returns {string}
   */
  createDetailURL(plant) {
    const params = new URLSearchParams();

    params.set("id", String(plant.id));

    if (plant.slug) {
      params.set("slug", String(plant.slug));
    }

    return `./plant-detail.html?${params.toString()}`;
  },

  /**
   * 解析圖片路徑。
   *
   * @param {unknown} value
   * @returns {string}
   */
  resolveImage(value) {
    if (value && typeof value === "object") {
      value = value.url ?? value.src ?? value.path ?? "";
    }

    if (typeof value !== "string" || !value.trim()) {
      return "";
    }

    const path = value.trim();

    if (
      path.startsWith("http://") ||
      path.startsWith("https://") ||
      path.startsWith("data:") ||
      path.startsWith("/")
    ) {
      return path;
    }

    if (path.startsWith("../../")) {
      return path;
    }

    if (path.startsWith("assets/")) {
      return `../../${path}`;
    }

    if (path.startsWith("./assets/")) {
      return `../../${path.slice(2)}`;
    }

    return `../../assets/images/plants/${path}`;
  },

  /**
   * 取得預設植物圖片。
   *
   * @returns {string}
   */
  getFallbackImage() {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
        <rect width="640" height="480" fill="#eef3e5"/>
        <circle cx="190" cy="130" r="150" fill="#c5dc99" opacity="0.55"/>
        <circle cx="500" cy="160" r="130" fill="#b8ddc1" opacity="0.55"/>
        <path
          d="M320 415V205"
          stroke="#385943"
          stroke-width="14"
          stroke-linecap="round"
        />
        <path
          d="M315 255C230 250 165 200 140 125C235 130 300 170 315 255Z"
          fill="#4b6f55"
        />
        <path
          d="M325 285C410 260 485 280 545 345C445 380 365 355 325 285Z"
          fill="#66866d"
        />
        <path
          d="M316 340C245 325 190 345 145 400C230 420 290 395 316 340Z"
          fill="#87a58d"
        />
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  },

  /**
   * 從物件取得巢狀屬性。
   *
   * @param {Record<string, unknown>} object
   * @param {string[]} paths
   * @returns {unknown}
   */
  getValue(object, paths) {
    for (const path of paths) {
      const value = path.split(".").reduce((current, key) => {
        if (
          current === null ||
          current === undefined ||
          typeof current !== "object"
        ) {
          return undefined;
        }

        return current[key];
      }, object);

      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }

    return undefined;
  },

  /**
   * 取得陣列或單一值中的第一個值。
   *
   * @param {unknown} value
   * @returns {unknown}
   */
  getFirstValue(value) {
    return Array.isArray(value) ? value[0] : value;
  },

  /**
   * 轉換數字。
   *
   * @param {unknown} value
   * @param {number|null} fallback
   * @returns {number|null}
   */
  toNumber(value, fallback = 0) {
    if (value === undefined || value === null || value === "") {
      return fallback;
    }

    const normalized = String(value).replace(/[^\d.-]/g, "");
    const number = Number(normalized);

    return Number.isFinite(number) ? number : fallback;
  },

  /**
   * 轉換布林值。
   *
   * @param {unknown} value
   * @returns {boolean}
   */
  toBoolean(value) {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return value === 1;
    }

    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();

    return ["true", "1", "yes", "safe", "pet-safe", "寵物友善", "是"].includes(
      normalized,
    );
  },

  /**
   * 建立網址 slug。
   *
   * @param {string} name
   * @param {string} fallback
   * @returns {string}
   */
  createSlug(name, fallback) {
    const slug = String(name)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\p{Letter}\p{Number}-]+/gu, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return slug || String(fallback);
  },

  /**
   * 標準化光照值。
   *
   * @param {unknown} value
   * @returns {string}
   */
  normalizeLight(value) {
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();

    if (
      normalized.includes("low") ||
      normalized.includes("低光") ||
      normalized.includes("耐陰")
    ) {
      return "low";
    }

    if (
      normalized.includes("medium") ||
      normalized.includes("中等") ||
      normalized.includes("半日照")
    ) {
      return "medium";
    }

    return "bright-indirect";
  },

  /**
   * 標準化濕度值。
   *
   * @param {unknown} value
   * @returns {string}
   */
  normalizeHumidity(value) {
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();

    if (normalized.includes("high") || normalized.includes("高濕")) {
      return "high";
    }

    if (normalized.includes("medium") || normalized.includes("中等")) {
      return "medium";
    }

    return "normal";
  },

  /**
   * 標準化照護難度。
   *
   * @param {unknown} value
   * @returns {string}
   */
  normalizeDifficulty(value) {
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();

    if (
      normalized.includes("advanced") ||
      normalized.includes("hard") ||
      normalized.includes("進階") ||
      normalized.includes("困難")
    ) {
      return "advanced";
    }

    if (
      normalized.includes("intermediate") ||
      normalized.includes("medium") ||
      normalized.includes("中等")
    ) {
      return "intermediate";
    }

    return "beginner";
  },

  /**
   * 標準化植物尺寸。
   *
   * @param {unknown} value
   * @returns {string}
   */
  normalizeSize(value) {
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();

    if (normalized.includes("large") || normalized.includes("大型")) {
      return "large";
    }

    if (normalized.includes("small") || normalized.includes("小型")) {
      return "small";
    }

    return "medium";
  },

  /**
   * 取得光照中文文字。
   *
   * @param {string} value
   * @returns {string}
   */
  getLightLabel(value) {
    const labels = {
      "bright-indirect": "明亮散射光",
      medium: "中等光照",
      low: "耐低光",
    };

    return labels[value] ?? "明亮散射光";
  },

  /**
   * 取得難度中文文字。
   *
   * @param {string} value
   * @returns {string}
   */
  getDifficultyLabel(value) {
    const labels = {
      beginner: "新手適合",
      intermediate: "中等難度",
      advanced: "進階照護",
    };

    return labels[value] ?? "新手適合";
  },

  /**
   * 格式化價格。
   *
   * @param {number} value
   * @returns {string}
   */
  formatCurrency(value) {
    return new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency: "TWD",
      maximumFractionDigits: 0,
    }).format(value);
  },
};
