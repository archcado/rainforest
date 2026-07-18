"use strict";

window.CanopyChatbot = (() => {
  let initialized = false;

  function getSessionId() {
    const key = "canopy_support_session";
    let value = localStorage.getItem(key);
    if (!value) {
      value = globalThis.crypto?.randomUUID?.() || `support-${Date.now()}`;
      localStorage.setItem(key, value);
    }
    return value;
  }

  function appendMessage(text, role = "agent") {
    const container = document.querySelector("[data-chatbot-messages]");
    if (!container) return;
    const message = document.createElement("p");
    message.className = `support-message support-message--${role}`;
    message.textContent = text;
    container.append(message);
    container.scrollTop = container.scrollHeight;
  }

  function selectTab(tab) {
    document.querySelectorAll("[data-support-tab]").forEach((button) => {
      button.setAttribute("aria-selected", String(button.dataset.supportTab === tab));
    });
    document.querySelectorAll("[data-support-view]").forEach((view) => {
      view.hidden = view.dataset.supportView !== tab;
    });
  }

  function openPanel(tab = "chat") {
    const panel = document.querySelector("#support-panel");
    const toggle = document.querySelector("[data-chatbot-toggle]");
    if (!panel || !toggle) return;
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    selectTab(tab);
    window.setTimeout(() => panel.querySelector(tab === "feedback" ? "#feedback-message" : "#chatbot-message")?.focus(), 0);
  }

  function closePanel() {
    const panel = document.querySelector("#support-panel");
    const toggle = document.querySelector("[data-chatbot-toggle]");
    if (panel) panel.hidden = true;
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    }
  }

  async function postJson(path, body) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : null;
    if (!response.ok) throw new Error(data?.message || data?.error?.message || "服務目前無法使用");
    return data;
  }

  function bindChat() {
    const form = document.querySelector("[data-chatbot-form]");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.checkValidity()) return form.reportValidity();
      const input = form.elements.message;
      const submit = form.querySelector("button[type=submit]");
      const message = input.value.trim();
      appendMessage(message, "user");
      input.value = "";
      submit.disabled = true;
      try {
        const result = await postJson("/api/chat", {
          message, sessionId: getSessionId(), pageUrl: window.location.href,
          productId: new URLSearchParams(window.location.search).get("id"),
        });
        appendMessage(result.reply || result.message || "已收到你的問題。", "agent");
      } catch (error) {
        appendMessage(`${error.message} 你也可以透過聯絡表單與我們聯繫。`, "system");
      } finally {
        submit.disabled = false;
        input.focus();
      }
    });
  }

  function bindFeedback() {
    const form = document.querySelector("[data-feedback-form]");
    const status = document.querySelector("[data-feedback-status]");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.checkValidity()) return form.reportValidity();
      const submit = form.querySelector("button[type=submit]");
      submit.disabled = true;
      if (status) status.textContent = "正在送出…";
      try {
        await postJson("/api/feedback", {
          type: form.elements.type.value, message: form.elements.message.value,
          email: form.elements.email.value, pageUrl: window.location.href,
        });
        form.reset();
        if (status) status.textContent = "謝謝你的回饋，我們已經收到。";
      } catch (error) {
        if (status) status.textContent = `${error.message}，請稍後再試。`;
      } finally {
        submit.disabled = false;
      }
    });
  }

  function init() {
    if (initialized || !document.querySelector(".support-widget")) return;
    initialized = true;
    document.querySelector("[data-chatbot-toggle]")?.addEventListener("click", () => openPanel("chat"));
    document.querySelector("[data-chatbot-close]")?.addEventListener("click", closePanel);
    document.querySelectorAll("[data-support-tab]").forEach((button) => {
      button.addEventListener("click", () => selectTab(button.dataset.supportTab));
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest("[data-feedback-open]")) return;
      event.preventDefault();
      openPanel("feedback");
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !document.querySelector("#support-panel")?.hidden) closePanel();
    });
    bindChat();
    bindFeedback();
  }

  return { init, openPanel, closePanel };
})();

