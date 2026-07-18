"use strict";

window.CanopyAbout = (() => {
  let initialized = false;
  const journey = {
    source: {
      number: "01",
      eyebrow: "RESPONSIBLE SOURCE",
      title: "從可追溯的來源開始",
      description: "我們先理解植物從哪裡來、如何培育，再決定它是否適合進入室內生活。",
      detail: "選品不只看外觀，也評估根系狀態、植株穩定性與後續照護資訊是否足夠。",
    },
    grow: {
      number: "02",
      eyebrow: "GREENHOUSE",
      title: "讓植物在穩定環境中準備",
      description: "出貨前保留觀察與整理時間，避免剛換盆、剛受壓的植株立刻進入配送。",
      detail: "穩定的光、水與通風，比用大量處理追求短期完美更重要。",
    },
    select: {
      number: "03",
      eyebrow: "RIGHT PLANT",
      title: "把適合放在稀有之前",
      description: "透過環境條件與植物配對，讓選擇回到光線、濕度、空間與生活節奏。",
      detail: "真正適合的植物，才能在購買之後持續成為生活的一部分。",
    },
    pack: {
      number: "04",
      eyebrow: "LESS BUT ENOUGH",
      title: "用必要的材料保護活體植物",
      description: "包裝的目標是固定盆器、保護葉片並維持短程濕度，不用裝飾性耗材增加體積。",
      detail: "每一層都應該有清楚用途，也應該容易拆解、分類與再次利用。",
    },
    home: {
      number: "05",
      eyebrow: "A NEW MICROCLIMATE",
      title: "抵達後，故事才真正開始",
      description: "商品頁與照護資源會陪使用者完成拆箱、適應位置與日常觀察。",
      detail: "我們希望交付的不只是一盆植物，而是一套能長期維持的室內微氣候。",
    },
  };

  const sustainability = {
    source: {
      title: "選品與來源",
      description: "先確認合法、穩定與可追溯，再談品種與外觀。",
      points: ["保留來源與批次紀錄", "拒絕不明野採與無法說明的來源", "以健康根系與環境適應性作為選品條件"],
    },
    packaging: {
      title: "減量包裝",
      description: "減少不必要裝飾，但不犧牲活體植物配送所需的保護。",
      points: ["優先使用單一材質或容易拆解的結構", "依植株尺寸調整固定材料", "提供清楚的拆解與分類指引"],
    },
    delivery: {
      title: "配送安排",
      description: "將配送資訊說清楚，降低重複配送與等待造成的耗損。",
      points: ["讓收件人掌握出貨與到貨狀態", "避免不適合植物配送的極端時段", "發生異常時保留快速聯絡管道"],
    },
    recycling: {
      title: "盆器與材料循環",
      description: "讓育苗盆、外箱與固定材料有再次使用的可能。",
      points: ["提供盆器清潔與再利用方式", "規劃回收或集中返還機制", "讓使用者回饋最難處理的包材"],
    },
  };

  const packageLayers = {
    box: {
      label: "外箱",
      title: "可拆解的外部保護",
      description: "依植物高度選擇接近的箱型，降低多餘空間與填充需求；外箱保留清楚的拆解方向。",
    },
    support: {
      label: "固定層",
      title: "穩住盆器，而不是塞滿箱子",
      description: "固定層集中承受盆器重量，避免土球位移與植株在箱內反覆碰撞。",
    },
    moisture: {
      label: "保濕層",
      title: "只保護需要的範圍",
      description: "保濕材料集中在介質與盆器，避免整株密封造成悶熱與凝水。",
    },
  };

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  function selectJourney(key) {
    const item = journey[key];
    if (!item) return;
    document.querySelectorAll("[data-journey-stage]").forEach((button) => {
      const active = button.dataset.journeyStage === key;
      button.setAttribute("aria-selected", String(active));
      button.classList.toggle("about-journey-tab--active", active);
    });
    const visual = document.querySelector("[data-journey-visual]");
    if (visual) visual.dataset.stage = key;
    setText("[data-journey-number]", item.number);
    setText("[data-journey-eyebrow]", item.eyebrow);
    setText("[data-journey-title]", item.title);
    setText("[data-journey-description]", item.description);
    setText("[data-journey-detail]", item.detail);
  }

  function selectSustainability(key) {
    const item = sustainability[key];
    if (!item) return;
    document.querySelectorAll("[data-sustainability-key]").forEach((button) => {
      const active = button.dataset.sustainabilityKey === key;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("about-impact-option--active", active);
    });
    setText("[data-impact-title]", item.title);
    setText("[data-impact-description]", item.description);
    const list = document.querySelector("[data-impact-points]");
    list.replaceChildren(...item.points.map((value) => {
      const entry = document.createElement("li");
      entry.textContent = value;
      return entry;
    }));
  }

  function selectPackageLayer(key) {
    const item = packageLayers[key];
    if (!item) return;
    document.querySelectorAll("[data-package-layer]").forEach((button) => {
      const active = button.dataset.packageLayer === key;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("package-layer-button--active", active);
    });
    setText("[data-package-label]", item.label);
    setText("[data-package-title]", item.title);
    setText("[data-package-description]", item.description);
  }

  function getChoices() {
    try {
      const value = JSON.parse(localStorage.getItem("canopy_sustainability_choices"));
      return new Set(Array.isArray(value) ? value : []);
    } catch {
      return new Set();
    }
  }

  function renderChoices(choices) {
    document.querySelectorAll("[data-choice]").forEach((button) => {
      const active = choices.has(button.dataset.choice);
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("about-choice--active", active);
    });
    const count = choices.size;
    setText("[data-choice-count]", count ? `已選擇 ${count} 項` : "尚未選擇");
  }

  function toggleChoice(button) {
    const choices = getChoices();
    const key = button.dataset.choice;
    if (choices.has(key)) choices.delete(key);
    else choices.add(key);
    localStorage.setItem("canopy_sustainability_choices", JSON.stringify([...choices]));
    renderChoices(choices);
    window.CanopyToast?.show?.(choices.has(key) ? "已加入你的永續選擇" : "已取消選擇");
  }

  function initReveals() {
    const elements = document.querySelectorAll("[data-about-reveal]");
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16 });
    elements.forEach((element) => observer.observe(element));
  }

  function initScrollProgress() {
    const bar = document.querySelector("[data-about-progress]");
    if (!bar) return;
    const update = () => {
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const value = documentHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / documentHeight)) : 0;
      bar.style.transform = `scaleX(${value})`;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function init() {
    if (initialized || !document.querySelector("[data-about-page]")) return;
    initialized = true;
    document.addEventListener("click", (event) => {
      const journeyButton = event.target.closest("[data-journey-stage]");
      if (journeyButton) selectJourney(journeyButton.dataset.journeyStage);
      const sustainabilityButton = event.target.closest("[data-sustainability-key]");
      if (sustainabilityButton) selectSustainability(sustainabilityButton.dataset.sustainabilityKey);
      const layerButton = event.target.closest("[data-package-layer]");
      if (layerButton) selectPackageLayer(layerButton.dataset.packageLayer);
      const choiceButton = event.target.closest("[data-choice]");
      if (choiceButton) toggleChoice(choiceButton);
    });
    selectJourney("source");
    selectSustainability("source");
    selectPackageLayer("box");
    renderChoices(getChoices());
    initReveals();
    initScrollProgress();
  }

  return { init };
})();
