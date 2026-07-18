"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const payload = JSON.parse(fs.readFileSync(path.join(root, "data/care-articles.json"), "utf8"));
const plantPayload = JSON.parse(
  fs.readFileSync(path.join(root, "data/plants-detailed-v2.json"), "utf8"),
);

assert.equal(payload.articles.length, 16, "照護資源必須包含 16 篇文章");
assert.ok(payload.references.length >= 3, "照護資源必須保留內容參考來源");

const ids = new Set(payload.articles.map((article) => article.id));
const slugs = new Set(payload.articles.map((article) => article.slug));
const plantIds = new Set(plantPayload.plants.map((plant) => plant.id));
assert.equal(ids.size, payload.articles.length, "文章 ID 不得重複");
assert.equal(slugs.size, payload.articles.length, "文章 slug 不得重複");

const requiredTypes = new Set(["guide", "diagnosis", "gear", "inspiration"]);
const actualTypes = new Set(payload.articles.map((article) => article.contentType));
requiredTypes.forEach((type) => assert.ok(actualTypes.has(type), `缺少 ${type} 類型內容`));

payload.articles.forEach((article) => {
  assert.ok(article.title.length >= 8, `${article.id} 標題過短`);
  assert.ok(article.summary.length >= 20, `${article.id} 摘要過短`);
  assert.ok(article.readingMinutes > 0, `${article.id} 閱讀時間無效`);
  assert.ok(article.keyTakeaways.length >= 3, `${article.id} 至少需要三個重點`);
  assert.ok(article.sections.length >= 2, `${article.id} 至少需要兩個段落`);
  assert.ok(article.relatedPlantIds.length >= 1, `${article.id} 缺少相關植物`);
  article.relatedPlantIds.forEach((id) => {
    assert.ok(plantIds.has(id), `${article.id} 引用了不存在的植物 ${id}`);
  });
  article.relatedArticleIds.forEach((id) => {
    assert.ok(ids.has(id), `${article.id} 引用了不存在的文章 ${id}`);
    assert.notEqual(id, article.id, `${article.id} 不得關聯自己`);
  });
});

console.log("care-content.test: 16 articles and relationships passed");
