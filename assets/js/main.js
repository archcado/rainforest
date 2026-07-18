"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  await initModule("CanopyLayout");

  const sharedModules = [
    ["CanopyNavigation", "assets/js/navigation.js"],
    ["CanopySearch", "assets/js/search.js"],
    ["CanopyCart", "assets/js/cart.js"],
    ["CanopyModal", "assets/js/modal.js"],
    ["CanopyToast", "assets/js/toast.js"],
    ["CanopyMember", "assets/js/member.js"],
    ["CanopyChatbot", "assets/js/chatbot.js"],
    ["CanopyPlantService", "assets/js/services/plant-service.js"],
    ["CanopyPlantMatchService", "assets/js/services/plant-match-service.js"],
  ];

  for (const [globalName, path] of sharedModules) {
    try {
      await window.CanopyLayout.ensureScript(globalName, path);
    } catch (error) {
      console.error(`共用模組 ${globalName} 載入失敗。`, error);
    }
  }

  for (const moduleName of [
    "CanopyNavigation",
    "CanopySearch",
    "CanopyMember",
    "CanopyCart",
    "CanopyModal",
    "CanopyToast",
    "CanopyChatbot",
    "CanopyFilters",
    "CanopyPlants",
    "CanopyPlantDetail",
    "CanopyQuiz",
    "CanopyQuizResult",
    "CanopyCare",
    "CanopyCareDetail",
    "CanopyAbout",
    "CanopyMemberPages",
    "CanopyCommercePages",
    "CanopyAdmin",
  ]) {
    await initModule(moduleName);
  }

  document.documentElement.dataset.appReady = "true";
});

async function initModule(moduleName) {
  const module = window[moduleName];
  if (!module || typeof module.init !== "function") return;

  try {
    await module.init();
  } catch (error) {
    console.error(`初始化 ${moduleName} 失敗。`, error);
  }
}
