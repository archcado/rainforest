"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function walk(directory, extension, results = []) {
  fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    if (entry.name === ".git") return;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target, extension, results);
    if (entry.isFile() && target.endsWith(extension)) results.push(target);
  });
  return results;
}

function count(source, expression) {
  return [...source.matchAll(expression)].length;
}

function checkLocalResources(file, source) {
  const directory = path.dirname(file);
  const expressions = [
    /<script[^>]+src=["']([^"']+)["']/gi,
    /<link[^>]+href=["']([^"']+)["']/gi,
    /<img[^>]+src=["']([^"']+)["']/gi,
  ];

  expressions.forEach((expression) => {
    for (const match of source.matchAll(expression)) {
      const reference = match[1];
      if (/^(https?:|data:|blob:|#)/i.test(reference)) continue;
      const clean = reference.split(/[?#]/)[0];
      const target = clean.startsWith("/")
        ? path.join(root, clean.replace(/^\/+/, ""))
        : path.resolve(directory, clean);
      assert.ok(fs.existsSync(target), `${path.relative(root, file)} 缺少資源 ${reference}`);
    }
  });
}

const pageFiles = [path.join(root, "index.html"), ...walk(path.join(root, "pages"), ".html")];
assert.ok(pageFiles.length >= 25);
assert.equal(fs.existsSync(path.join(root, "pages/member/my-plants.html")), false);
assert.equal(fs.existsSync(path.join(root, "pages/member/plant-journal.html")), false);
assert.equal(fs.existsSync(path.join(root, "assets/js/plant-journal.js")), false);

pageFiles.forEach((file) => {
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, /<!doctype html>/i, `${path.relative(root, file)} 缺少 doctype`);
  assert.match(source, /<html[^>]+lang="zh-Hant"/i, `${path.relative(root, file)} 缺少語系`);
  assert.equal(count(source, /<\/body>/gi), 1, `${path.relative(root, file)} body 結尾異常`);
  assert.match(source, /assets\/js\/layout\.js/, `${path.relative(root, file)} 未載入 layout.js`);
  assert.match(source, /assets\/js\/main\.js/, `${path.relative(root, file)} 未載入 main.js`);
  checkLocalResources(file, source);
});

for (const relative of ["pages/quiz/quiz.html", "pages/quiz/quiz-result.html"]) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  assert.equal(count(source, /<h1[ >]/gi), 1, `${relative} 必須只有一個 h1`);
  assert.equal(count(source, /\sstyle=/gi), 0, `${relative} 不應使用行內 style`);
}

for (const relative of [
  "components/header.html",
  "components/footer.html",
  "components/mobile-nav.html",
  "components/search-panel.html",
  "components/chatbot.html",
]) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  assert.equal(count(source, /\sstyle=/gi), 0, `${relative} 不應使用行內 style`);
}

const questions = JSON.parse(fs.readFileSync(path.join(root, "data/quiz-questions.json"), "utf8"));
const rules = JSON.parse(fs.readFileSync(path.join(root, "data/match-rules.json"), "utf8"));
const plantData = JSON.parse(fs.readFileSync(path.join(root, "data/plants-detailed-v2.json"), "utf8"));
const weightTotal = Object.values(rules.weights).reduce((sum, value) => sum + value, 0);
assert.equal(questions.questions.length, 8);
assert.equal(weightTotal, 100);
assert.equal(plantData.plants.length, 16);
assert.equal(new Set(plantData.plants.map((plant) => plant.id)).size, 16);
assert.equal(JSON.stringify(plantData).includes('"difficulty"'), false);
plantData.plants.forEach((plant) => {
  const total = plant.care.substrate.components.reduce(
    (sum, component) => sum + component.percentage,
    0,
  );
  assert.equal(total, 100, `${plant.identity.name} 的介質比例必須合計為 100%`);
  assert.ok(plant.environmentProfile, `${plant.identity.name} 缺少適生環境資料`);
  assert.ok(plant.commerce.variants[0].sku, `${plant.identity.name} 缺少商品 SKU`);
});

const detailPage = fs.readFileSync(path.join(root, "pages/plants/plant-detail.html"), "utf8");
assert.match(detailPage, /id="environment-profile"/);
assert.match(detailPage, /id="substrate-composition"/);
assert.match(detailPage, /assets\/js\/pages\/plant-detail\.js/);

const plantsPageScript = fs.readFileSync(
  path.join(root, "assets/js/pages/plants.js"),
  "utf8",
);
assert.match(plantsPageScript, /dataset\.addToCart/);
assert.match(plantsPageScript, /data-favorite-id/);
assert.match(plantsPageScript, /plant-card__original-price/);
assert.match(plantsPageScript, /plant-card__discount/);

for (const relative of [
  "pages/system/login.html",
  "pages/system/register.html",
  "pages/system/forgot-password.html",
  "pages/member/account.html",
  "pages/admin/index.html",
]) {
  assert.ok(fs.existsSync(path.join(root, relative)), `${relative} 不存在`);
}

const serverSource = fs.readFileSync(path.join(root, "server/server.js"), "utf8");
assert.match(serverSource, /CANOPY_ADMIN_EMAIL/);
assert.match(serverSource, /N8N_CHAT_WEBHOOK_URL/);
assert.match(serverSource, /\/api\/admin\/plants/);
assert.match(serverSource, /HttpOnly; SameSite=Lax/);

const headerSource = fs.readFileSync(path.join(root, "components/header.html"), "utf8");
assert.match(headerSource, />照護資源</);
assert.doesNotMatch(headerSource, />照護知識</);
assert.match(headerSource, />關於 CANOPY</);
assert.doesNotMatch(headerSource, />永續計畫</);
assert.doesNotMatch(headerSource, />品牌故事</);
assert.match(headerSource, /header-action--member/);
const memberLinkTag = headerSource.match(/<a[^>]*data-member-link[^>]*>/)?.[0] || "";
assert.ok(memberLinkTag, "Header 缺少會員入口");
assert.doesNotMatch(
  memberLinkTag,
  /header-action--optional/,
);

const careSource = fs.readFileSync(path.join(root, "pages/care/care.html"), "utf8");
const careDetailSource = fs.readFileSync(path.join(root, "pages/care/care-detail.html"), "utf8");
const aboutSource = fs.readFileSync(path.join(root, "pages/system/about.html"), "utf8");
const homeSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const memberAccountSource = fs.readFileSync(path.join(root, "pages/member/account.html"), "utf8");
const checkoutSource = fs.readFileSync(path.join(root, "pages/commerce/checkout.html"), "utf8");
assert.match(homeSource, /class="home-hero-visual"/);
assert.match(homeSource, /class="home-hero-plant-media"/);
assert.match(homeSource, /canopy-caladium-hero-v2\.webp/);
assert.match(homeSource, /canopy-caladium-hero-v2\.png/);
assert.match(careSource, /assets\/js\/pages\/care\.js/);
assert.match(careSource, /class="care-hero__plant-media"/);
assert.match(careSource, /canopy-dieffenbachia-care-hero\.webp/);
assert.match(careSource, /canopy-dieffenbachia-care-hero\.png/);
assert.match(careSource, /好物分享/);
assert.match(careDetailSource, /assets\/js\/pages\/care-detail\.js/);
assert.match(aboutSource, /id="journey"/);
assert.match(aboutSource, /id="sustainability"/);
assert.match(aboutSource, /data-choice=/);
assert.match(aboutSource, /class="about-pearls"/);
assert.match(aboutSource, /assets\/js\/pages\/about\.js/);
assert.match(memberAccountSource, /class="member-layout"/);
assert.match(memberAccountSource, /data-account-form/);
assert.match(memberAccountSource, /data-address-form/);
assert.match(memberAccountSource, /data-password-form/);
assert.match(checkoutSource, /data-checkout-form/);
assert.match(checkoutSource, /class="payment-options"/);
assert.match(checkoutSource, /name="paymentMethod"/);

const publicSources = [
  path.join(root, "index.html"),
  ...walk(path.join(root, "pages"), ".html"),
  ...walk(path.join(root, "components"), ".html"),
  ...walk(path.join(root, "assets", "js"), ".js"),
];
publicSources.forEach((file) => {
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(source, /my-plants|plant-journal|我的植物|植物日誌/);
  assert.doesNotMatch(source, /careDifficulty|照護難度|中等難度|進階照護/);
});

console.log(`static-structure.test: ${pageFiles.length} pages and shared resources passed`);
