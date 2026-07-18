"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const port = 38000 + Math.floor(Math.random() * 1000);

async function jsonRequest(pathname, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, options);
  const data = await response.json();
  return { response, data };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/plants`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Server did not start");
}

async function run() {
  const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "canopy-api-test-"));
  const child = spawn(process.execPath, ["server/server.js"], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      CANOPY_DATA_DIR: dataDirectory,
      CANOPY_ADMIN_EMAIL: "admin@canopy.test",
      CANOPY_ADMIN_PASSWORD: "AdminPass123!",
      CANOPY_ADMIN_NAME: "測試管理員",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await waitForServer();
    const publicPlants = await jsonRequest("/api/plants");
    assert.equal(publicPlants.response.status, 200);
    assert.equal(publicPlants.data.plants.length, 16);

    const registration = await jsonRequest("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "測試會員", email: "member@canopy.test", password: "MemberPass123!" }),
    });
    assert.equal(registration.response.status, 201);
    const memberCookie = registration.response.headers.get("set-cookie").split(";")[0];
    const memberCsrf = registration.data.csrfToken;

    const account = await jsonRequest("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: memberCookie, "X-Canopy-CSRF": memberCsrf },
      body: JSON.stringify({ name: "測試會員更新", phone: "0912345678" }),
    });
    assert.equal(account.data.user.phone, "0912345678");

    const order = await jsonRequest("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: memberCookie, "X-Canopy-CSRF": memberCsrf },
      body: JSON.stringify({
        items: [{ id: "plant-001", qty: 1 }],
        shipping: { name: "測試會員", phone: "0912345678", address: "台北市測試路 1 號" },
        paymentMethod: "bank-transfer",
      }),
    });
    assert.equal(order.response.status, 201);
    assert.match(order.data.order.orderNumber, /^CAN-/);

    const adminLogin = await jsonRequest("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@canopy.test", password: "AdminPass123!" }),
    });
    const adminCookie = adminLogin.response.headers.get("set-cookie").split(";")[0];
    const adminPlants = await jsonRequest("/api/admin/plants", { headers: { Cookie: adminCookie } });
    assert.equal(adminPlants.data.plants.length, 16);

    const forbidden = await jsonRequest("/api/admin/plants", { headers: { Cookie: memberCookie } });
    assert.equal(forbidden.response.status, 403);

    const feedback = await jsonRequest("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "experience", message: "API 整合測試回饋" }),
    });
    assert.equal(feedback.response.status, 201);

    console.log("server-api.test: auth, account, orders, admin RBAC, products and feedback passed");
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => child.once("exit", resolve));
    await fs.rm(dataDirectory, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

