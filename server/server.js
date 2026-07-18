"use strict";

const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs/promises");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const Storage = require("./storage");

const scrypt = promisify(crypto.scrypt);
const sessions = new Map();
const resetTokens = new Map();
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const MAX_BODY_BYTES = 1_000_000;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function sendJson(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function sendError(response, statusCode, message, code = "request_error") {
  sendJson(response, statusCode, { error: { code, message } });
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error("Request body too large"), { status: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("JSON 格式不正確"), { status: 400 });
  }
}

function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie || "")
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separator = entry.indexOf("=");
        return separator < 0
          ? [entry, ""]
          : [entry.slice(0, separator), decodeURIComponent(entry.slice(separator + 1))];
      }),
  );
}

function sessionCookie(token, maxAge = SESSION_MAX_AGE) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `canopy_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function getSession(request) {
  const token = parseCookies(request).canopy_session;
  const session = token ? sessions.get(token) : null;
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return { token, ...session };
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const csrfToken = crypto.randomBytes(24).toString("base64url");
  sessions.set(token, {
    userId,
    csrfToken,
    expiresAt: Date.now() + SESSION_MAX_AGE * 1000,
  });
  return { token, csrfToken };
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(String(password), salt, 64);
  return `${salt}:${Buffer.from(derived).toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [salt, expectedHex] = String(stored || "").split(":");
  if (!salt || !expectedHex) return false;
  const derived = Buffer.from(await scrypt(String(password), salt, 64));
  const expected = Buffer.from(expectedHex, "hex");
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

async function findUserById(userId) {
  return (await Storage.read("users")).find((user) => user.id === userId) || null;
}

async function requireUser(request, response, role = null) {
  const session = getSession(request);
  const user = session ? await findUserById(session.userId) : null;
  if (!session || !user) {
    sendError(response, 401, "請先登入會員帳戶", "authentication_required");
    return null;
  }
  if (role && user.role !== role) {
    sendError(response, 403, "此帳戶沒有執行這項操作的權限", "permission_denied");
    return null;
  }
  return { session, user };
}

function requireCsrf(request, response, session) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  if (request.headers["x-canopy-csrf"] !== session.csrfToken) {
    sendError(response, 403, "安全驗證已失效，請重新整理後再試", "csrf_invalid");
    return false;
  }
  return true;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validatePassword(password) {
  return typeof password === "string" && password.length >= 8 && password.length <= 128;
}

async function ensureAdminAccount() {
  const email = normalizeEmail(process.env.CANOPY_ADMIN_EMAIL);
  const password = process.env.CANOPY_ADMIN_PASSWORD;
  if (!email || !password) return;
  if (!validatePassword(password)) throw new Error("CANOPY_ADMIN_PASSWORD 至少需要 8 個字元");

  await Storage.update("users", async (users) => {
    const existing = users.find((user) => user.email === email);
    if (existing) {
      existing.role = "admin";
      return users;
    }
    users.push({
      id: crypto.randomUUID(),
      role: "admin",
      name: process.env.CANOPY_ADMIN_NAME || "CANOPY 管理員",
      email,
      phone: "",
      passwordHash: await hashPassword(password),
      addresses: [],
      favorites: [],
      cart: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return users;
  });
}

function validatePlant(plant) {
  if (!plant || typeof plant !== "object") return "商品資料格式不正確";
  if (!String(plant.id || "").trim()) return "商品缺少 id";
  if (!String(plant.identity?.name || "").trim()) return "商品缺少中文名稱";
  if (!Array.isArray(plant.commerce?.variants) || !plant.commerce.variants.length) {
    return "商品至少需要一個規格";
  }
  const components = plant.care?.substrate?.components || [];
  const total = components.reduce((sum, item) => sum + Number(item.percentage || 0), 0);
  if (components.length && total !== 100) return "介質比例合計必須為 100%";
  return null;
}

function updatePlantInventory(plant) {
  const variant = plant.commerce?.variants?.find((item) => item.active) || plant.commerce?.variants?.[0];
  const stock = Math.max(0, Number(variant?.stockQuantity || 0));
  if (variant) {
    variant.stockQuantity = stock;
    variant.stockStatus = stock === 0 ? "out-of-stock" : stock <= 6 ? "low-stock" : "in-stock";
  }
  plant.commerce.totalStock = stock;
  plant.commerce.stockStatus = variant?.stockStatus || "out-of-stock";
  plant.editorial = { ...(plant.editorial || {}), updatedAt: new Date().toISOString() };
  return plant;
}

async function proxyWebhook(url, payload) {
  if (!url) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await response.text();
    let data = text;
    try { data = JSON.parse(text); } catch {}
    if (!response.ok) throw new Error(`n8n webhook HTTP ${response.status}`);
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function handleAuth(request, response, pathname) {
  if (pathname === "/api/auth/session" && request.method === "GET") {
    const session = getSession(request);
    const user = session ? await findUserById(session.userId) : null;
    return sendJson(response, 200, {
      authenticated: Boolean(user),
      user: publicUser(user),
      csrfToken: user ? session.csrfToken : null,
    });
  }

  if (pathname === "/api/auth/register" && request.method === "POST") {
    const body = await readBody(request);
    const name = String(body.name || "").trim();
    const email = normalizeEmail(body.email);
    if (name.length < 2 || !email.includes("@") || !validatePassword(body.password)) {
      return sendError(response, 400, "請填寫姓名、有效信箱及至少 8 個字元的密碼", "validation_error");
    }
    let createdUser;
    await Storage.update("users", async (users) => {
      if (users.some((user) => user.email === email)) {
        throw Object.assign(new Error("此電子信箱已註冊"), { status: 409, code: "email_exists" });
      }
      createdUser = {
        id: crypto.randomUUID(), role: "member", name, email, phone: "",
        passwordHash: await hashPassword(body.password), addresses: [], favorites: [], cart: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      users.push(createdUser);
      return users;
    });
    const session = createSession(createdUser.id);
    return sendJson(response, 201, { user: publicUser(createdUser), csrfToken: session.csrfToken }, {
      "Set-Cookie": sessionCookie(session.token),
    });
  }

  if (pathname === "/api/auth/login" && request.method === "POST") {
    const body = await readBody(request);
    const email = normalizeEmail(body.email);
    const user = (await Storage.read("users")).find((item) => item.email === email);
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return sendError(response, 401, "電子信箱或密碼不正確", "invalid_credentials");
    }
    const session = createSession(user.id);
    return sendJson(response, 200, { user: publicUser(user), csrfToken: session.csrfToken }, {
      "Set-Cookie": sessionCookie(session.token),
    });
  }

  if (pathname === "/api/auth/logout" && request.method === "POST") {
    const current = await requireUser(request, response);
    if (!current || !requireCsrf(request, response, current.session)) return;
    sessions.delete(current.session.token);
    return sendJson(response, 200, { success: true }, { "Set-Cookie": sessionCookie("", 0) });
  }

  if (pathname === "/api/auth/forgot-password" && request.method === "POST") {
    const body = await readBody(request);
    const user = (await Storage.read("users")).find((item) => item.email === normalizeEmail(body.email));
    let developmentResetToken = null;
    if (user) {
      const token = crypto.randomBytes(32).toString("base64url");
      resetTokens.set(token, { userId: user.id, expiresAt: Date.now() + 15 * 60 * 1000 });
      if (process.env.NODE_ENV !== "production") developmentResetToken = token;
    }
    return sendJson(response, 200, {
      message: "如果此信箱已註冊，系統將提供密碼重設方式。",
      developmentResetToken,
    });
  }

  if (pathname === "/api/auth/reset-password" && request.method === "POST") {
    const body = await readBody(request);
    const record = resetTokens.get(String(body.token || ""));
    if (!record || record.expiresAt <= Date.now() || !validatePassword(body.password)) {
      return sendError(response, 400, "重設連結無效、已過期或新密碼不足 8 個字元", "reset_invalid");
    }
    const passwordHash = await hashPassword(body.password);
    await Storage.update("users", (users) => {
      const user = users.find((item) => item.id === record.userId);
      if (user) {
        user.passwordHash = passwordHash;
        user.updatedAt = new Date().toISOString();
      }
      return users;
    });
    resetTokens.delete(String(body.token));
    return sendJson(response, 200, { success: true });
  }

  return false;
}

async function handleAccount(request, response, pathname) {
  if (!pathname.startsWith("/api/account") && pathname !== "/api/orders") return false;
  const current = await requireUser(request, response);
  if (!current || !requireCsrf(request, response, current.session)) return true;

  if (pathname === "/api/account" && request.method === "GET") {
    return sendJson(response, 200, { user: publicUser(current.user) });
  }

  if (pathname === "/api/account" && request.method === "PATCH") {
    const body = await readBody(request);
    await Storage.update("users", (users) => {
      const user = users.find((item) => item.id === current.user.id);
      if (user) {
        if (String(body.name || "").trim().length >= 2) user.name = String(body.name).trim();
        user.phone = String(body.phone || "").trim();
        user.updatedAt = new Date().toISOString();
      }
      return users;
    });
    return sendJson(response, 200, { user: publicUser(await findUserById(current.user.id)) });
  }

  if (pathname === "/api/account/password" && request.method === "PATCH") {
    const body = await readBody(request);
    if (!(await verifyPassword(body.currentPassword, current.user.passwordHash)) || !validatePassword(body.newPassword)) {
      return sendError(response, 400, "目前密碼不正確，或新密碼不足 8 個字元", "password_invalid");
    }
    const passwordHash = await hashPassword(body.newPassword);
    await Storage.update("users", (users) => {
      const user = users.find((item) => item.id === current.user.id);
      if (user) user.passwordHash = passwordHash;
      return users;
    });
    return sendJson(response, 200, { success: true });
  }

  if (pathname === "/api/account/addresses" && request.method === "POST") {
    const body = await readBody(request);
    const address = {
      id: crypto.randomUUID(), label: String(body.label || "常用地址").trim(),
      recipient: String(body.recipient || "").trim(), phone: String(body.phone || "").trim(),
      postalCode: String(body.postalCode || "").trim(), city: String(body.city || "").trim(),
      district: String(body.district || "").trim(), address: String(body.address || "").trim(),
    };
    if (!address.recipient || !address.phone || !address.city || !address.address) {
      return sendError(response, 400, "請完整填寫收件人、電話、縣市與地址", "validation_error");
    }
    await Storage.update("users", (users) => {
      const user = users.find((item) => item.id === current.user.id);
      if (user) user.addresses.push(address);
      return users;
    });
    return sendJson(response, 201, { address });
  }

  const addressMatch = pathname.match(/^\/api\/account\/addresses\/([^/]+)$/);
  if (addressMatch && request.method === "DELETE") {
    await Storage.update("users", (users) => {
      const user = users.find((item) => item.id === current.user.id);
      if (user) user.addresses = user.addresses.filter((item) => item.id !== decodeURIComponent(addressMatch[1]));
      return users;
    });
    return sendJson(response, 200, { success: true });
  }

  for (const field of ["favorites", "cart"]) {
    if (pathname === `/api/account/${field}` && request.method === "PUT") {
      const body = await readBody(request);
      const value = Array.isArray(body[field]) ? body[field].slice(0, 200) : [];
      await Storage.update("users", (users) => {
        const user = users.find((item) => item.id === current.user.id);
        if (user) user[field] = value;
        return users;
      });
      return sendJson(response, 200, { [field]: value });
    }
  }

  if (pathname === "/api/orders" && request.method === "GET") {
    const orders = (await Storage.read("orders")).filter((order) => order.userId === current.user.id);
    return sendJson(response, 200, { orders: orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  }

  if (pathname === "/api/orders" && request.method === "POST") {
    const body = await readBody(request);
    const requestedItems = Array.isArray(body.items) ? body.items : [];
    const shipping = body.shipping || {};
    if (!requestedItems.length || !shipping.name || !shipping.phone || !shipping.address) {
      return sendError(response, 400, "購物車或收件資料不完整", "validation_error");
    }

    let orderItems = [];
    let total = 0;
    await Storage.update("plants", (payload) => {
      orderItems = requestedItems.map((requested) => {
        const plant = payload.plants.find((item) => String(item.id) === String(requested.id));
        const variant = plant?.commerce?.variants?.find((item) => item.active) || plant?.commerce?.variants?.[0];
        const quantity = Math.max(1, Math.min(20, Number(requested.qty || 1)));
        if (!plant || !variant || plant.status !== "published" || plant.commerce?.sellable === false) {
          throw Object.assign(new Error("購物車包含無法購買的商品"), { status: 409, code: "product_unavailable" });
        }
        if (Number(variant.stockQuantity || 0) < quantity) {
          throw Object.assign(new Error(`${plant.identity.name} 庫存不足`), { status: 409, code: "insufficient_stock" });
        }
        const unitPrice = Number(variant.salePrice?.amount ?? plant.commerce?.salePrice?.amount ?? variant.price?.amount ?? 0);
        variant.stockQuantity -= quantity;
        updatePlantInventory(plant);
        total += unitPrice * quantity;
        return { plantId: plant.id, sku: variant.sku, name: plant.identity.name, quantity, unitPrice, subtotal: unitPrice * quantity };
      });
      return payload;
    });

    const paymentMethod = ["bank-transfer", "cash-on-delivery"].includes(body.paymentMethod)
      ? body.paymentMethod
      : "bank-transfer";
    const order = {
      id: crypto.randomUUID(),
      orderNumber: `CAN-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
      userId: current.user.id,
      status: paymentMethod === "bank-transfer" ? "awaiting-payment" : "processing",
      statusLabel: paymentMethod === "bank-transfer" ? "待付款" : "處理中",
      paymentMethod,
      shipping: {
        name: String(shipping.name).trim(), phone: String(shipping.phone).trim(),
        address: String(shipping.address).trim(),
      },
      items: orderItems, total, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await Storage.update("orders", (orders) => [...orders, order]);
    return sendJson(response, 201, { order });
  }

  return sendError(response, 404, "找不到會員功能", "not_found");
}

async function handlePlants(request, response, pathname) {
  if (pathname === "/api/plants" && request.method === "GET") {
    const payload = await Storage.read("plants");
    return sendJson(response, 200, {
      ...payload,
      plants: payload.plants.filter((plant) => plant.status === "published" && plant.commerce?.sellable !== false),
    });
  }

  if (!pathname.startsWith("/api/admin/plants")) return false;
  const current = await requireUser(request, response, "admin");
  if (!current || !requireCsrf(request, response, current.session)) return true;

  if (pathname === "/api/admin/plants" && request.method === "GET") {
    return sendJson(response, 200, await Storage.read("plants"));
  }

  if (pathname === "/api/admin/plants" && request.method === "POST") {
    const body = await readBody(request);
    const plant = body.plant ? updatePlantInventory(body.plant) : null;
    const validationError = validatePlant(plant);
    if (validationError) return sendError(response, 400, validationError, "validation_error");
    await Storage.update("plants", (payload) => {
      if (payload.plants.some((item) => item.id === plant.id)) {
        throw Object.assign(new Error("商品 id 已存在"), { status: 409, code: "plant_exists" });
      }
      payload.plants.push(plant);
      return payload;
    });
    return sendJson(response, 201, { plant });
  }

  if (pathname === "/api/admin/plants/batch" && request.method === "POST") {
    const body = await readBody(request);
    const ids = new Set(Array.isArray(body.ids) ? body.ids.map(String) : []);
    await Storage.update("plants", (payload) => {
      payload.plants.forEach((plant) => {
        if (!ids.has(String(plant.id))) return;
        if (["published", "draft", "archived"].includes(body.status)) plant.status = body.status;
        if (Number.isFinite(Number(body.stockDelta))) {
          const variant = plant.commerce?.variants?.find((item) => item.active) || plant.commerce?.variants?.[0];
          if (variant) variant.stockQuantity = Math.max(0, Number(variant.stockQuantity || 0) + Number(body.stockDelta));
        }
        updatePlantInventory(plant);
      });
      return payload;
    });
    return sendJson(response, 200, { success: true });
  }

  const match = pathname.match(/^\/api\/admin\/plants\/([^/]+)$/);
  if (match && request.method === "PUT") {
    const id = decodeURIComponent(match[1]);
    const body = await readBody(request);
    const plant = updatePlantInventory({ ...body.plant, id });
    const validationError = validatePlant(plant);
    if (validationError) return sendError(response, 400, validationError, "validation_error");
    let found = false;
    await Storage.update("plants", (payload) => {
      payload.plants = payload.plants.map((item) => {
        if (String(item.id) !== id) return item;
        found = true;
        return plant;
      });
      return payload;
    });
    if (!found) return sendError(response, 404, "找不到商品", "not_found");
    return sendJson(response, 200, { plant });
  }

  if (match && request.method === "DELETE") {
    const id = decodeURIComponent(match[1]);
    let found = false;
    await Storage.update("plants", (payload) => {
      const next = payload.plants.filter((item) => {
        if (String(item.id) === id) { found = true; return false; }
        return true;
      });
      payload.plants = next;
      return payload;
    });
    if (!found) return sendError(response, 404, "找不到商品", "not_found");
    return sendJson(response, 200, { success: true });
  }

  return sendError(response, 404, "找不到商品管理功能", "not_found");
}

async function handleMessaging(request, response, pathname) {
  if (pathname === "/api/chat" && request.method === "POST") {
    const body = await readBody(request);
    const message = String(body.message || "").trim().slice(0, 1000);
    if (!message) return sendError(response, 400, "請輸入問題", "validation_error");
    if (!process.env.N8N_CHAT_WEBHOOK_URL) {
      return sendJson(response, 503, { configured: false, message: "自動客服尚未連接 n8n，請使用聯絡表單。" });
    }
    const result = await proxyWebhook(process.env.N8N_CHAT_WEBHOOK_URL, {
      message, sessionId: String(body.sessionId || ""), pageUrl: String(body.pageUrl || ""),
      productId: body.productId ? String(body.productId) : null,
    });
    const reply = typeof result === "string"
      ? result
      : result?.reply || result?.output || result?.message || "已收到你的訊息。";
    return sendJson(response, 200, { reply });
  }

  if (pathname === "/api/feedback" && request.method === "POST") {
    const body = await readBody(request);
    const feedback = {
      id: crypto.randomUUID(), type: String(body.type || "general").slice(0, 40),
      message: String(body.message || "").trim().slice(0, 3000),
      email: normalizeEmail(body.email).slice(0, 200), pageUrl: String(body.pageUrl || "").slice(0, 1000),
      createdAt: new Date().toISOString(),
    };
    if (feedback.message.length < 3) return sendError(response, 400, "回饋內容至少需要 3 個字元", "validation_error");
    await Storage.update("feedback", (items) => [...items, feedback]);
    if (process.env.N8N_FEEDBACK_WEBHOOK_URL) {
      proxyWebhook(process.env.N8N_FEEDBACK_WEBHOOK_URL, feedback).catch((error) => {
        console.error("Feedback webhook failed:", error.message);
      });
    }
    return sendJson(response, 201, { success: true, id: feedback.id });
  }

  return false;
}

async function serveStatic(request, response, pathname) {
  if (!["GET", "HEAD"].includes(request.method)) return sendError(response, 405, "Method not allowed");
  const decoded = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  if (decoded.includes("..") || /^\/(?:\.git|server|\.env)(?:\/|$)/.test(decoded)) {
    return sendError(response, 404, "Not found", "not_found");
  }
  const target = path.resolve(Storage.projectRoot, `.${decoded}`);
  if (!target.startsWith(`${Storage.projectRoot}${path.sep}`)) return sendError(response, 404, "Not found", "not_found");
  try {
    const stat = await fs.stat(target);
    const file = stat.isDirectory() ? path.join(target, "index.html") : target;
    const content = await fs.readFile(file);
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": path.extname(file) === ".html" ? "no-cache" : "public, max-age=300",
    });
    if (request.method === "HEAD") return response.end();
    return response.end(content);
  } catch {
    return sendError(response, 404, "找不到頁面", "not_found");
  }
}

function createCanopyServer() {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    try {
      if (url.pathname.startsWith("/api/auth/")) {
        const handled = await handleAuth(request, response, url.pathname);
        if (handled !== false) return;
      }
      if (url.pathname.startsWith("/api/account") || url.pathname === "/api/orders") {
        await handleAccount(request, response, url.pathname);
        return;
      }
      if (url.pathname === "/api/plants" || url.pathname.startsWith("/api/admin/plants")) {
        await handlePlants(request, response, url.pathname);
        return;
      }
      if (["/api/chat", "/api/feedback"].includes(url.pathname)) {
        const handled = await handleMessaging(request, response, url.pathname);
        if (handled !== false) return;
      }
      if (url.pathname.startsWith("/api/")) return sendError(response, 404, "找不到 API", "not_found");
      return serveStatic(request, response, url.pathname);
    } catch (error) {
      console.error(error);
      return sendError(response, error.status || 500, error.status ? error.message : "伺服器發生錯誤", error.code || "server_error");
    }
  });
}

async function start() {
  await Storage.initialize();
  await ensureAdminAccount();
  const server = createCanopyServer();
  const port = Number(process.env.PORT || 3000);
  server.listen(port, "127.0.0.1", () => {
    console.log(`CANOPY server running at http://localhost:${port}`);
    if (!process.env.CANOPY_ADMIN_EMAIL) {
      console.log("Admin account is disabled. Set CANOPY_ADMIN_EMAIL and CANOPY_ADMIN_PASSWORD to enable it.");
    }
  });
  return server;
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { createCanopyServer, start, hashPassword, verifyPassword };
