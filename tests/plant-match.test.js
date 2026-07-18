"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
global.window = global;
global.location = { href: "http://canopy.test/index.html" };
global.document = {
  currentScript: { src: "http://canopy.test/assets/js/services/plant-service.js" },
};
global.CanopyLayout = {
  resolveProjectURL(relativePath = "") {
    return new URL(String(relativePath).replace(/^\/+/, ""), "http://canopy.test/").href;
  },
};

global.fetch = async (input) => {
  const url = new URL(String(input));
  const target = path.join(root, url.pathname.replace(/^\/+/, ""));
  if (!target.startsWith(root) || !fs.existsSync(target)) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(fs.readFileSync(target), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

function evaluate(relativePath, scriptURL) {
  document.currentScript = { src: scriptURL };
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  vm.runInThisContext(source, { filename: relativePath });
}

evaluate(
  "assets/js/services/plant-service.js",
  "http://canopy.test/assets/js/services/plant-service.js",
);
evaluate(
  "assets/js/services/plant-match-service.js",
  "http://canopy.test/assets/js/services/plant-match-service.js",
);

async function run() {
  const plants = await CanopyPlantService.getAll();
  assert.equal(plants.length, 16);
  assert.deepEqual(
    plants.slice(0, 3).map((plant) => plant.name),
    ["龜背芋", "黑葉觀音蓮", "黃金葛"],
  );
  assert.equal(plants[0].price, 680);
  assert.equal(plants[0].originalPrice, null);
  assert.equal(plants[2].matchProfile.growthHabit, "trailing");
  assert.equal(plants[0].substrate, "chunky");

  const discountedPlant = CanopyPlantService.normalizePlant({
    id: "sale-test",
    status: "published",
    identity: { name: "特價測試植物" },
    catalog: { filterKeys: {} },
    care: { light: {}, humidity: {}, substrate: {} },
    commerce: {
      sellable: true,
      basePrice: { amount: 800, currency: "TWD" },
      variants: [
        {
          active: true,
          price: { amount: 800, currency: "TWD" },
          salePrice: { amount: 600, currency: "TWD" },
          stockStatus: "in-stock",
          stockQuantity: 5,
        },
      ],
    },
  });
  assert.equal(discountedPlant.price, 600);
  assert.equal(discountedPlant.originalPrice, 800);
  assert.equal(discountedPlant.discountPercentage, 25);
  assert.equal(discountedPlant.onSale, true);

  const brightMediumSpace = await CanopyPlantMatchService.match({
    light: "bright-indirect",
    humidity: "normal",
    careTime: "medium",
    experience: "beginner",
    petAccess: "none",
    space: "medium-space",
    growthHabit: "climbing",
    budget: "under-1000",
  });
  assert.equal(brightMediumSpace.blocked, false);
  assert.equal(brightMediumSpace.matches[0].plant.name, "黃金葛");
  assert.ok(brightMediumSpace.matches[0].score >= 85);

  const lowLightSmallSpace = await CanopyPlantMatchService.match({
    light: "low-to-indirect",
    humidity: "normal",
    careTime: "low",
    experience: "beginner",
    petAccess: "none",
    space: "small-space",
    growthHabit: "trailing",
    budget: "under-500",
  });
  assert.equal(lowLightSmallSpace.matches[0].plant.name, "黃金葛");

  const noLight = await CanopyPlantMatchService.match({
    light: "no-light",
    humidity: "normal",
    careTime: "medium",
    experience: "beginner",
    petAccess: "none",
    space: "medium-space",
    growthHabit: "no-preference",
    budget: "open",
  });
  assert.equal(noLight.blocked, true);
  assert.equal(noLight.matches.length, 0);

  const reachablePet = await CanopyPlantMatchService.match({
    light: "bright-indirect",
    humidity: "normal",
    careTime: "medium",
    experience: "beginner",
    petAccess: "reachable",
    space: "medium-space",
    growthHabit: "no-preference",
    budget: "open",
  });
  assert.equal(reachablePet.blocked, false);
  assert.ok(reachablePet.matches.length > 0);
  assert.equal(reachablePet.matches[0].plant.name, "袖珍椰子");
  assert.equal(reachablePet.excludedCount, 11);

  const questions = JSON.parse(
    fs.readFileSync(path.join(root, "data/quiz-questions.json"), "utf8"),
  );
  assert.equal(questions.questions.length, 8);
  assert.ok(questions.questions.every((question) => question.options.length >= 3));

  console.log("plant-match.test: 5 data and matching scenarios passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
