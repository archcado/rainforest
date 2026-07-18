"use strict";

window.CanopyAdmin = (() => {
  let initialized = false;
  let plants = [];
  let filtered = [];
  let currentPlant = null;
  const selected = new Set();
  const $ = (selector) => document.querySelector(selector);

  function setMessage(message, type = "") {
    const target = $("[data-admin-status-message]");
    if (!target) return;
    target.textContent = message;
    target.dataset.status = type;
  }

  function activeVariant(plant) {
    return plant.commerce?.variants?.find((item) => item.active) || plant.commerce?.variants?.[0] || {};
  }

  function resolveImage(plant) {
    return window.CanopyPlantService.resolveImageSource(plant.media?.cardImage);
  }

  function formatPrice(amount) {
    return new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 }).format(Number(amount || 0));
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  }

  function statusLabel(status) {
    return ({ published: "已上架", draft: "草稿", archived: "封存" })[status] || status;
  }

  function updateStats() {
    const stock = plants.reduce((sum, plant) => sum + Number(plant.commerce?.totalStock || 0), 0);
    $("[data-stat-total]").textContent = plants.length;
    $("[data-stat-published]").textContent = plants.filter((plant) => plant.status === "published").length;
    $("[data-stat-low]").textContent = plants.filter((plant) => Number(plant.commerce?.totalStock || 0) <= 6).length;
    $("[data-stat-stock]").textContent = stock;
  }

  function renderTable() {
    const body = $("[data-admin-table]");
    if (!body) return;
    body.replaceChildren(...filtered.map((plant) => {
      const row = document.createElement("tr");
      const variant = activeVariant(plant);
      const sale = variant.salePrice?.amount ?? plant.commerce?.salePrice?.amount;
      const safeId = escapeHTML(plant.id);
      const safeName = escapeHTML(plant.identity?.name || "未命名商品");
      const safeStatus = ["published", "draft", "archived"].includes(plant.status) ? plant.status : "draft";
      row.innerHTML = `
        <td><input type="checkbox" data-select-plant="${safeId}" aria-label="選取 ${safeName}" ${selected.has(plant.id) ? "checked" : ""}></td>
        <td><div class="admin-product"><img src="${escapeHTML(resolveImage(plant))}" alt=""><div><strong>${safeName}</strong><span>${escapeHTML(plant.identity?.scientificName || "—")}<br>${escapeHTML(variant.sku || "無 SKU")}</span></div></div></td>
        <td><span class="admin-status admin-status--${safeStatus}">${escapeHTML(statusLabel(plant.status))}</span></td>
        <td>${sale ? `<strong>${formatPrice(sale)}</strong><br><del>${formatPrice(variant.price?.amount)}</del>` : formatPrice(variant.price?.amount)}</td>
        <td>${Number(plant.commerce?.totalStock || 0).toLocaleString("zh-TW")}</td>
        <td>${escapeHTML(plant.care?.substrate?.label || "—")}</td>
        <td><div class="admin-row-actions"><button type="button" data-edit-plant="${safeId}">編輯</button><a href="../plants/plant-detail.html?id=${encodeURIComponent(plant.id)}" target="_blank" rel="noopener">預覽</a></div></td>`;
      row.querySelector("img").addEventListener("error", (event) => { event.currentTarget.src = window.CanopyPlantService.getFallbackImage(); }, { once: true });
      return row;
    }));
    $("[data-selection-count]").textContent = `已選 ${selected.size} 項`;
  }

  function applyFilters() {
    const query = $("[data-admin-search]").value.trim().toLowerCase();
    const status = $("[data-admin-status]").value;
    filtered = plants.filter((plant) => {
      const variant = activeVariant(plant);
      const text = [plant.identity?.name, plant.identity?.scientificName, variant.sku].join(" ").toLowerCase();
      return (!query || text.includes(query)) && (!status || plant.status === status);
    });
    renderTable();
  }

  function createSkeleton() {
    const id = `plant-${String(Date.now()).slice(-6)}`;
    return {
      id, slug: id, status: "draft",
      identity: { name: "", shortName: "", englishName: "", aliases: [], scientificName: "", family: "" },
      catalog: { categoryLabel: "觀葉植物", displayOrder: plants.length + 1, featured: false, tags: [], filterKeys: { light: ["bright-indirect"], humidity: ["medium"], substrate: "balanced", petFriendly: false, space: ["medium-space"], growthHabit: ["upright"] } },
      summary: { headline: "", shortDescription: "", longDescription: "", keyFeatures: [] },
      morphology: { growthHabit: "upright", growthRate: "medium", matureIndoorSize: { heightCm: { min: 20, max: 60 }, spreadCm: { min: 20, max: 60 } } },
      environmentProfile: {
        light: { scale: ["低光", "中等散射光", "明亮散射光", "柔和直射光"], idealMin: 1, idealMax: 2, label: "明亮散射光", notes: "" },
        humidity: { scaleMin: 40, scaleMax: 90, idealMin: 50, idealMax: 70, unit: "%", label: "50–70%" },
        temperature: { scaleMin: 10, scaleMax: 35, idealMin: 18, idealMax: 28, unit: "°C", label: "18–28°C" },
        growthRate: { scale: ["緩慢", "中等", "快速"], value: 1, label: "中等" },
      },
      care: {
        observationFrequency: "medium", environmentSensitivity: "moderate",
        light: { primary: "bright-indirect", acceptedLevels: ["bright-indirect"], placement: "", notes: "" },
        watering: { trigger: "表層介質乾燥後再澆水。", method: "澆透並排除積水。", avoid: ["長期積水"] },
        humidity: { level: "medium", preferred: "50–70%", notes: "" },
        temperature: { preferredCelsius: { min: 18, max: 28 }, minimumCelsius: 12 },
        substrate: { type: "balanced", label: "均衡保水型介質", summary: "", properties: [], components: [{ name: "椰纖土", percentage: 40 }, { name: "松樹皮", percentage: 30 }, { name: "珍珠石", percentage: 20 }, { name: "園藝木炭", percentage: 10 }], repottingNote: "" },
        fertilizing: "", commonProblems: [],
      },
      safety: { petFriendly: false, toxicTo: [], riskLevel: "unknown", disclaimer: "" },
      commerce: { sellable: true, basePrice: { amount: 0, currency: "TWD" }, stockStatus: "out-of-stock", totalStock: 0, includedItems: ["健康植株一盆", "育苗盆", "照護說明卡"], variants: [{ sku: "", name: "標準株", active: true, price: { amount: 0, currency: "TWD" }, stockStatus: "out-of-stock", stockQuantity: 0, plantHeightCm: { min: 20, max: 40 }, nurseryPotCm: 10, decorativePotIncluded: false }], shipping: { available: true, fragile: true, notes: "" }, livingPlantNotice: "植物為自然生長商品，每株外觀略有差異。" },
      media: { cardImage: { src: "assets/images/placeholders/plant-placeholder.svg", alt: "植物商品圖片" }, heroImage: { src: "assets/images/placeholders/plant-placeholder.svg", alt: "植物商品主圖" }, gallery: [] },
      relations: { relatedPlantIds: [] }, seo: { title: "", description: "" }, editorial: { updatedAt: new Date().toISOString(), sourceRefs: [] },
    };
  }

  function setValue(form, name, value) {
    if (form.elements[name]) form.elements[name].value = value ?? "";
  }

  function fillForm(plant, isNew = false) {
    const form = $("[data-product-form]");
    const variant = activeVariant(plant);
    const components = plant.care?.substrate?.components || [];
    currentPlant = isNew ? null : plant;
    setValue(form, "id", plant.id); setValue(form, "slug", plant.slug); setValue(form, "name", plant.identity?.name);
    setValue(form, "scientificName", plant.identity?.scientificName); setValue(form, "category", plant.catalog?.categoryLabel); setValue(form, "status", plant.status);
    setValue(form, "description", plant.summary?.shortDescription); form.elements.featured.checked = Boolean(plant.catalog?.featured); form.elements.sellable.checked = plant.commerce?.sellable !== false;
    setValue(form, "price", variant.price?.amount); setValue(form, "salePrice", variant.salePrice?.amount ?? plant.commerce?.salePrice?.amount); setValue(form, "stock", variant.stockQuantity); setValue(form, "sku", variant.sku); setValue(form, "variantName", variant.name); setValue(form, "potCm", variant.nurseryPotCm);
    setValue(form, "cardImage", plant.media?.cardImage?.src); setValue(form, "heroImage", plant.media?.heroImage?.src);
    setValue(form, "light", plant.care?.light?.primary); setValue(form, "lightLabel", plant.environmentProfile?.light?.label); setValue(form, "humidityMin", plant.environmentProfile?.humidity?.idealMin); setValue(form, "humidityMax", plant.environmentProfile?.humidity?.idealMax); setValue(form, "temperatureMin", plant.environmentProfile?.temperature?.idealMin); setValue(form, "temperatureMax", plant.environmentProfile?.temperature?.idealMax); setValue(form, "growthRate", plant.environmentProfile?.growthRate?.value);
    setValue(form, "substrateType", plant.care?.substrate?.type); setValue(form, "substrateLabel", plant.care?.substrate?.label);
    for (let index = 0; index < 4; index += 1) { setValue(form, `componentName${index + 1}`, components[index]?.name); setValue(form, `componentPercent${index + 1}`, components[index]?.percentage ?? 0); }
    form.elements.id.readOnly = !isNew;
    $("[data-editor-title]").textContent = isNew ? "新增商品" : `編輯 ${plant.identity.name}`;
    $("[data-delete-plant]").hidden = isNew;
    updateSubstrateTotal();
    $("[data-product-dialog]").showModal();
  }

  function readForm() {
    const form = $("[data-product-form]");
    const plant = currentPlant ? structuredClone(currentPlant) : createSkeleton();
    const number = (name) => Number(form.elements[name].value || 0);
    plant.id = form.elements.id.value.trim(); plant.slug = form.elements.slug.value.trim(); plant.status = form.elements.status.value;
    plant.identity.name = form.elements.name.value.trim(); plant.identity.shortName = plant.identity.name; plant.identity.scientificName = form.elements.scientificName.value.trim();
    plant.catalog.categoryLabel = form.elements.category.value.trim(); plant.catalog.featured = form.elements.featured.checked;
    plant.summary.shortDescription = form.elements.description.value.trim(); if (!plant.summary.headline) plant.summary.headline = plant.summary.shortDescription;
    plant.commerce.sellable = form.elements.sellable.checked; plant.commerce.basePrice = { amount: number("price"), currency: "TWD" };
    const variant = activeVariant(plant); variant.price = { amount: number("price"), currency: "TWD" }; variant.stockQuantity = number("stock"); variant.sku = form.elements.sku.value.trim(); variant.name = form.elements.variantName.value.trim(); variant.nurseryPotCm = number("potCm") || variant.nurseryPotCm;
    const salePrice = number("salePrice");
    if (salePrice > 0 && salePrice < number("price")) { variant.salePrice = { amount: salePrice, currency: "TWD" }; plant.commerce.salePrice = { amount: salePrice, currency: "TWD" }; }
    else { delete variant.salePrice; delete plant.commerce.salePrice; }
    plant.media.cardImage = { src: form.elements.cardImage.value.trim() || "assets/images/placeholders/plant-placeholder.svg", alt: `${plant.identity.name}商品圖片` };
    plant.media.heroImage = { src: form.elements.heroImage.value.trim() || plant.media.cardImage.src, alt: `${plant.identity.name}商品主圖` };
    const light = form.elements.light.value; plant.care.light.primary = light; plant.care.light.acceptedLevels = [light]; plant.catalog.filterKeys.light = [light]; plant.environmentProfile.light.label = form.elements.lightLabel.value.trim();
    const humidityMin = number("humidityMin"), humidityMax = number("humidityMax"), temperatureMin = number("temperatureMin"), temperatureMax = number("temperatureMax");
    Object.assign(plant.environmentProfile.humidity, { idealMin: humidityMin, idealMax: humidityMax, label: `${humidityMin}–${humidityMax}%` }); Object.assign(plant.environmentProfile.temperature, { idealMin: temperatureMin, idealMax: temperatureMax, label: `${temperatureMin}–${temperatureMax}°C` });
    plant.care.humidity.preferred = `${humidityMin}–${humidityMax}%`; plant.care.temperature.preferredCelsius = { min: temperatureMin, max: temperatureMax };
    const growthValue = number("growthRate"); plant.environmentProfile.growthRate.value = growthValue; plant.environmentProfile.growthRate.label = ["緩慢", "中等", "快速"][growthValue]; plant.morphology.growthRate = ["slow", "medium", "fast"][growthValue];
    plant.care.substrate.type = form.elements.substrateType.value; plant.care.substrate.label = form.elements.substrateLabel.value.trim(); plant.catalog.filterKeys.substrate = plant.care.substrate.type;
    plant.care.substrate.components = Array.from({ length: 4 }, (_, index) => ({ name: form.elements[`componentName${index + 1}`].value.trim(), percentage: number(`componentPercent${index + 1}`) })).filter((item) => item.name || item.percentage);
    plant.seo.title = `${plant.identity.name}商品詳情｜CANOPY`; plant.seo.description = plant.summary.shortDescription;
    return plant;
  }

  function updateSubstrateTotal() {
    const form = $("[data-product-form]");
    const total = Array.from({ length: 4 }, (_, index) => Number(form.elements[`componentPercent${index + 1}`].value || 0)).reduce((a, b) => a + b, 0);
    const target = $("[data-substrate-total]"); target.textContent = `目前合計：${total}%`; target.dataset.valid = String(total === 100);
    return total;
  }

  async function loadPlants() {
    const payload = await window.CanopyMember.request("/api/admin/plants");
    plants = payload.plants || []; filtered = [...plants]; selected.clear(); updateStats(); applyFilters();
  }

  async function savePlant(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) return form.reportValidity();
    if (updateSubstrateTotal() !== 100) return setMessage("介質比例合計必須為 100%", "error");
    const plant = readForm();
    try {
      const path = currentPlant ? `/api/admin/plants/${encodeURIComponent(currentPlant.id)}` : "/api/admin/plants";
      await window.CanopyMember.request(path, { method: currentPlant ? "PUT" : "POST", body: { plant } });
      $("[data-product-dialog]").close(); setMessage(`${plant.identity.name} 已儲存`, "success"); await loadPlants();
    } catch (error) { setMessage(error.message, "error"); }
  }

  async function batchUpdate(body) {
    if (!selected.size) return setMessage("請先選擇商品", "error");
    await window.CanopyMember.request("/api/admin/plants/batch", { method: "POST", body: { ids: [...selected], ...body } });
    setMessage(`已更新 ${selected.size} 項商品`, "success"); await loadPlants();
  }

  function bindEvents() {
    $("[data-new-plant]").addEventListener("click", () => fillForm(createSkeleton(), true));
    document.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", () => $("[data-product-dialog]").close()));
    $("[data-product-form]").addEventListener("submit", savePlant);
    $("[data-product-form]").addEventListener("input", (event) => { if (event.target.name?.startsWith("componentPercent")) updateSubstrateTotal(); });
    $("[data-admin-search]").addEventListener("input", applyFilters); $("[data-admin-status]").addEventListener("change", applyFilters);
    $("[data-admin-table]").addEventListener("click", (event) => {
      const edit = event.target.closest("[data-edit-plant]"); if (edit) fillForm(plants.find((plant) => plant.id === edit.dataset.editPlant));
      const checkbox = event.target.closest("[data-select-plant]"); if (checkbox) { checkbox.checked ? selected.add(checkbox.dataset.selectPlant) : selected.delete(checkbox.dataset.selectPlant); $("[data-selection-count]").textContent = `已選 ${selected.size} 項`; }
    });
    $("[data-select-all]").addEventListener("change", (event) => { filtered.forEach((plant) => event.target.checked ? selected.add(plant.id) : selected.delete(plant.id)); renderTable(); });
    document.querySelectorAll("[data-batch-status]").forEach((button) => button.addEventListener("click", () => batchUpdate({ status: button.dataset.batchStatus })));
    document.querySelectorAll("[data-batch-stock]").forEach((button) => button.addEventListener("click", () => batchUpdate({ stockDelta: Number(button.dataset.batchStock) })));
    $("[data-delete-plant]").addEventListener("click", async () => {
      if (!currentPlant || !window.confirm(`確定刪除「${currentPlant.identity.name}」？此操作無法從後台復原。`)) return;
      await window.CanopyMember.request(`/api/admin/plants/${encodeURIComponent(currentPlant.id)}`, { method: "DELETE", body: {} });
      $("[data-product-dialog]").close(); setMessage("商品已刪除", "success"); await loadPlants();
    });
  }

  async function init() {
    if (initialized || !$("#admin-products")) return;
    initialized = true;
    if (!window.CanopyMember.isAdmin()) { $("[data-admin-denied]").hidden = false; return; }
    $("#admin-products").hidden = false; bindEvents();
    try { await loadPlants(); } catch (error) { setMessage(error.message, "error"); }
  }

  return { init };
})();
