"use strict";

window.CanopyQuizResult = (() => {
  const ANSWERS_KEY = "canopy_plant_match_answers_v2";
  let initialized = false;

  function setState(state) {
    ["loading", "content", "empty", "error"].forEach((key) => {
      const element = document.querySelector(`#result-${key}`);
      if (element) element.hidden = key !== state;
    });
  }

  async function loadQuestions() {
    const response = await fetch(
      window.CanopyPlantService.resolveProjectURL("data/quiz-questions.json"),
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) throw new Error(`問卷題目載入失敗（HTTP ${response.status}）`);
    const payload = await response.json();
    return Array.isArray(payload) ? payload : payload.questions || [];
  }

  function readAnswers() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(ANSWERS_KEY) || "null");
      return saved?.answers && typeof saved.answers === "object" ? saved.answers : null;
    } catch {
      return null;
    }
  }

  function renderAnswerSummary(questions, answers) {
    const container = document.querySelector("#result-profile-list");
    const items = questions.map((question) => {
      const option = question.options.find((candidate) => candidate.value === answers[question.id]);
      const item = document.createElement("div");
      item.className = "result-profile__item";
      const term = document.createElement("dt");
      term.textContent = question.category;
      const value = document.createElement("dd");
      value.textContent = option?.label || "未作答";
      item.append(term, value);
      return item;
    });
    container.replaceChildren(...items);
  }

  function createList(items, className) {
    const list = document.createElement("ul");
    list.className = className;
    items.forEach((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      list.append(item);
    });
    return list;
  }

  function createMatchCard(match, index) {
    const { plant } = match;
    const article = document.createElement("article");
    article.className = `match-card${index === 0 ? " match-card--primary" : ""}`;
    article.dataset.plantId = plant.id;

    const media = document.createElement("a");
    media.className = "match-card__media";
    media.href = plant.detailURL;

    const image = document.createElement("img");
    image.src = plant.image;
    image.alt = plant.imageAlt;
    image.loading = index === 0 ? "eager" : "lazy";
    image.width = 640;
    image.height = 800;
    image.addEventListener(
      "error",
      () => {
        image.src = window.CanopyPlantService.getFallbackImage();
      },
      { once: true },
    );
    media.append(image);

    const body = document.createElement("div");
    body.className = "match-card__body";

    const scoreRow = document.createElement("div");
    scoreRow.className = "match-card__score-row";
    const level = document.createElement("span");
    level.className = `match-level match-level--${match.level.key}`;
    level.textContent = match.level.label;
    const score = document.createElement("strong");
    score.className = "match-card__score";
    score.textContent = `${match.score} / 100`;
    scoreRow.append(level, score);

    const title = document.createElement("h2");
    title.className = "match-card__title";
    const titleLink = document.createElement("a");
    titleLink.href = plant.detailURL;
    titleLink.textContent = plant.name;
    title.append(titleLink);

    const scientific = document.createElement("p");
    scientific.className = "match-card__scientific";
    scientific.textContent = plant.scientificName;

    const reasonTitle = document.createElement("h3");
    reasonTitle.className = "match-card__section-title";
    reasonTitle.textContent = "符合原因";

    const reasons = createList(
      match.reasons.length ? match.reasons : ["整體環境與照護條件達到推薦門檻"],
      "match-card__list",
    );

    body.append(scoreRow, title, scientific, reasonTitle, reasons);

    if (match.cautions.length) {
      const cautionTitle = document.createElement("h3");
      cautionTitle.className = "match-card__section-title match-card__section-title--caution";
      cautionTitle.textContent = "購入前注意";
      body.append(cautionTitle, createList(match.cautions, "match-card__list match-card__list--caution"));
    }

    const purchase = document.createElement("div");
    purchase.className = "match-card__purchase";
    const price = document.createElement("p");
    price.className = "match-card__price";
    price.textContent = window.CanopyPlantService.formatCurrency(plant.price, plant.currency);
    const stock = document.createElement("span");
    stock.className = "badge badge--green";
    stock.textContent = plant.stockLabel;
    purchase.append(price, stock);

    const actions = document.createElement("div");
    actions.className = "match-card__actions";
    const detail = document.createElement("a");
    detail.className = "btn btn--secondary";
    detail.href = plant.detailURL;
    detail.textContent = "查看完整照護";
    const cart = document.createElement("button");
    cart.className = "btn btn--primary";
    cart.type = "button";
    cart.dataset.addToCart = plant.id;
    cart.dataset.name = plant.name;
    cart.dataset.price = String(plant.price);
    cart.textContent = "加入購物車";
    actions.append(detail, cart);

    body.append(purchase, actions);
    article.append(media, body);
    return article;
  }

  function renderNoMatches(result, answers) {
    const title = document.querySelector("#result-empty-title");
    const description = document.querySelector("#result-empty-description");
    const suggestion = document.querySelector("#result-empty-suggestion");

    if (result.blocked) {
      title.textContent = "目前不建議直接購入植物";
      description.textContent = result.blockReason;
      suggestion.textContent = result.suggestion || "調整環境後可以重新進行配對。";
    } else if (answers.petAccess === "reachable") {
      title.textContent = "目前沒有符合寵物安全條件的商品";
      description.textContent = "現有商品資料中的植物都不適合讓貓狗接觸，因此系統沒有強行產生推薦。";
      suggestion.textContent = "後續加入經可靠來源查證的寵物友善植物後，這組條件就能產生安全選擇。";
    } else {
      title.textContent = "目前沒有同時符合條件的商品";
      description.textContent = "光照、空間、預算或庫存條件排除了目前商品。";
      suggestion.textContent = "可以調整擺放位置、預算或空間條件後重新配對。";
    }

    setState("empty");
  }

  async function render() {
    const answers = readAnswers();
    if (!answers) {
      document.querySelector("#result-empty-title").textContent = "尚未完成植物配對";
      document.querySelector("#result-empty-description").textContent = "請先回答八題環境與購買需求。";
      document.querySelector("#result-empty-suggestion").textContent = "完成後，系統會從可購買植物中提供最多三個結果。";
      setState("empty");
      return;
    }

    const [questions, result] = await Promise.all([
      loadQuestions(),
      window.CanopyPlantMatchService.match(answers),
    ]);
    renderAnswerSummary(questions, answers);

    if (!result.matches.length) {
      renderNoMatches(result, answers);
      return;
    }

    const primary = result.matches[0];
    document.querySelector("#result-title").textContent = `${primary.plant.name}最符合你的條件`;
    document.querySelector("#result-description").textContent =
      `系統從目前可購買植物中，依必要安全條件與七個加權面向選出 ${result.matches.length} 個結果。`;
    document.querySelector("#result-plants").replaceChildren(
      ...result.matches.map(createMatchCard),
    );
    setState("content");
  }

  async function init() {
    if (initialized || !document.querySelector("#match-results-app")) return;
    initialized = true;
    setState("loading");

    try {
      await render();
    } catch (error) {
      console.error("植物配對結果載入失敗。", error);
      setState("error");
    }
  }

  return { init };
})();
