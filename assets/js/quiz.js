"use strict";

window.CanopyQuiz = (() => {
  const STATE_KEY = "canopy_plant_match_state_v2";
  const ANSWERS_KEY = "canopy_plant_match_answers_v2";
  let initialized = false;
  let questions = [];
  let answers = {};
  let currentStep = 0;
  let elements = {};

  function cacheElements() {
    elements = {
      form: document.querySelector("#plant-match-form"),
      loading: document.querySelector("#quiz-loading"),
      error: document.querySelector("#quiz-error"),
      retry: document.querySelector("#quiz-retry"),
      category: document.querySelector("#quiz-question-category"),
      title: document.querySelector("#quiz-question-text"),
      help: document.querySelector("#quiz-question-help"),
      options: document.querySelector("#quiz-options"),
      previous: document.querySelector("#quiz-prev"),
      next: document.querySelector("#quiz-next"),
      reset: document.querySelector("#quiz-reset"),
      progressBar: document.querySelector("#quiz-progress-bar"),
      progressLabel: document.querySelector("#quiz-progress-label"),
      message: document.querySelector("#quiz-message"),
    };
  }

  async function loadQuestions() {
    const response = await fetch(
      window.CanopyPlantService.resolveProjectURL("data/quiz-questions.json"),
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) throw new Error(`問卷題目載入失敗（HTTP ${response.status}）`);
    const payload = await response.json();
    const source = Array.isArray(payload) ? payload : payload.questions;
    if (!Array.isArray(source) || source.length === 0) {
      throw new TypeError("問卷資料沒有可用題目。");
    }
    questions = source;
  }

  function restoreState() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STATE_KEY) || "null");
      if (!saved || typeof saved !== "object") return;
      const validIds = new Set(questions.map((question) => question.id));
      answers = Object.fromEntries(
        Object.entries(saved.answers || {}).filter(([id]) => validIds.has(id)),
      );
      currentStep = Math.min(
        Math.max(Number(saved.currentStep) || 0, 0),
        questions.length - 1,
      );
    } catch {
      answers = {};
      currentStep = 0;
    }
  }

  function saveState() {
    sessionStorage.setItem(
      STATE_KEY,
      JSON.stringify({ currentStep, answers, updatedAt: new Date().toISOString() }),
    );
  }

  function setStatus(status) {
    elements.loading.hidden = status !== "loading";
    elements.error.hidden = status !== "error";
    elements.form.hidden = status !== "ready";
  }

  function createOption(question, option) {
    const label = document.createElement("label");
    label.className = "quiz-option";

    const input = document.createElement("input");
    input.className = "quiz-option__input sr-only";
    input.type = "radio";
    input.name = `question-${question.id}`;
    input.value = option.value;
    input.checked = answers[question.id] === option.value;

    const marker = document.createElement("span");
    marker.className = "quiz-option__marker";
    marker.setAttribute("aria-hidden", "true");

    const copy = document.createElement("span");
    copy.className = "quiz-option__copy";

    const title = document.createElement("span");
    title.className = "quiz-option__title";
    title.textContent = option.label;

    const description = document.createElement("span");
    description.className = "quiz-option__description";
    description.textContent = option.description || "";

    copy.append(title, description);
    label.append(input, marker, copy);
    label.classList.toggle("quiz-option--selected", input.checked);
    return label;
  }

  function updateSelectionStyles() {
    elements.options.querySelectorAll(".quiz-option").forEach((option) => {
      const input = option.querySelector("input");
      option.classList.toggle("quiz-option--selected", Boolean(input?.checked));
    });
  }

  function render() {
    const question = questions[currentStep];
    if (!question) return;

    const progress = Math.round(((currentStep + 1) / questions.length) * 100);
    elements.category.textContent = question.category || "植物配對";
    elements.title.textContent = question.question;
    elements.help.textContent = question.help || "";
    elements.options.replaceChildren(
      ...question.options.map((option) => createOption(question, option)),
    );
    elements.progressBar.value = currentStep + 1;
    elements.progressBar.max = questions.length;
    elements.progressBar.textContent = `${currentStep + 1} / ${questions.length}`;
    elements.progressLabel.textContent = `第 ${currentStep + 1} 題，共 ${questions.length} 題`;
    elements.previous.hidden = currentStep === 0;
    elements.next.disabled = !answers[question.id];
    elements.next.textContent = currentStep === questions.length - 1 ? "查看配對結果" : "下一題";
    elements.message.textContent = "";
    saveState();
    elements.title.focus({ preventScroll: true });
  }

  function handleAnswer(event) {
    const input = event.target.closest("input[type='radio']");
    if (!input) return;
    const question = questions[currentStep];
    answers[question.id] = input.value;
    elements.next.disabled = false;
    elements.message.textContent = "已記錄此題答案。";
    updateSelectionStyles();
    saveState();
  }

  function goPrevious() {
    if (currentStep <= 0) return;
    currentStep -= 1;
    render();
  }

  function goNext() {
    const question = questions[currentStep];
    if (!answers[question.id]) {
      elements.message.textContent = "請先選擇一個最接近實際情況的答案。";
      return;
    }

    if (currentStep < questions.length - 1) {
      currentStep += 1;
      render();
      return;
    }

    sessionStorage.setItem(
      ANSWERS_KEY,
      JSON.stringify({ answers, completedAt: new Date().toISOString() }),
    );
    sessionStorage.removeItem(STATE_KEY);
    window.location.href = window.CanopyPlantService.resolveProjectURL(
      "pages/quiz/quiz-result.html",
    );
  }

  function reset() {
    answers = {};
    currentStep = 0;
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(ANSWERS_KEY);
    render();
  }

  function bindEvents() {
    elements.options.addEventListener("change", handleAnswer);
    elements.previous.addEventListener("click", goPrevious);
    elements.form.addEventListener("submit", (event) => {
      event.preventDefault();
      goNext();
    });
    elements.reset.addEventListener("click", reset);
    elements.retry.addEventListener("click", () => window.location.reload());
  }

  async function init() {
    if (initialized) return;
    cacheElements();
    if (!elements.form) return;

    initialized = true;
    bindEvents();
    setStatus("loading");

    try {
      await loadQuestions();
      restoreState();
      setStatus("ready");
      render();
    } catch (error) {
      console.error("植物配對問卷載入失敗。", error);
      setStatus("error");
    }
  }

  return { init, reset };
})();
