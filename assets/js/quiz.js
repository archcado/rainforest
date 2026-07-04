"use strict";

/**
 * quiz.js
 * ─────────────────────────────────────────────
 * 植物配對測驗
 * 職責：測驗流程控制、答案收集、進度顯示、結果計算。
 *       目前為骨架，計分邏輯待測驗題目資料確認後實作。
 * ─────────────────────────────────────────────
 */

window.CanopyQuiz = {
  _answers: {},
  _currentStep: 0,
  _questions: [],

  init(questions) {
    this._questions = questions || [];
    this._answers   = {};
    this._currentStep = 0;
    this.render();
  },

  /** 記錄答案並前進 */
  answer(questionId, value) {
    this._answers[questionId] = value;
    this._currentStep++;

    if (this._currentStep >= this._questions.length) {
      this.showResult();
    } else {
      this.render();
    }
  },

  render() {
    const question = this._questions[this._currentStep];
    if (!question) return;

    const progressBar   = document.querySelector(".quiz-progress__fill");
    const progressLabel = document.querySelector(".quiz-progress__label");
    const total = this._questions.length;
    const pct   = Math.round((this._currentStep / total) * 100);

    if (progressBar)   progressBar.style.width   = `${pct}%`;
    if (progressLabel) progressLabel.textContent  = `${this._currentStep + 1} / ${total}`;

    // 頁面可覆寫 CanopyQuiz.renderQuestion 以客製化渲染
    this.renderQuestion(question);
  },

  renderQuestion(question) {
    const container = document.querySelector(".quiz-question");
    if (!container) return;
    container.querySelector(".quiz-question__text")
      && (container.querySelector(".quiz-question__text").textContent = question.question);
  },

  showResult() {
    // 計分後跳轉結果頁，params 待資料結構確認後補充
    const params = new URLSearchParams({ answers: JSON.stringify(this._answers) });
    window.location.href = `quiz-result.html?${params.toString()}`;
  },
};
