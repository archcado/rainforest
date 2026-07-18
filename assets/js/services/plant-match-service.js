"use strict";

/**
 * 植物配對服務。
 * 先套用安全、販售、庫存與空間等必要條件，再計算可解釋的加權符合度。
 */
window.CanopyPlantMatchService = (() => {
  let rulesPromise = null;

  async function loadRules() {
    if (!rulesPromise) {
      rulesPromise = fetch(window.CanopyPlantService.resolveProjectURL("data/match-rules.json"), {
        headers: { Accept: "application/json" },
      })
        .then((response) => {
          if (!response.ok) throw new Error(`配對規則載入失敗（HTTP ${response.status}）`);
          return response.json();
        })
        .catch((error) => {
          rulesPromise = null;
          throw error;
        });
    }
    return rulesPromise;
  }

  function bestMatrixScore(matrix, answer, plantValues) {
    const answerMap = matrix?.[answer] || {};
    const values = Array.isArray(plantValues) ? plantValues : [plantValues];
    return values.reduce((best, value) => Math.max(best, Number(answerMap[value] ?? 0)), 0);
  }

  function getBudgetMaximum(rules, answer) {
    return Number(rules.budgetMaximums?.[answer] ?? rules.budgetMaximums?.open ?? 999999);
  }

  function getThreshold(rules, score) {
    return (
      [...rules.thresholds]
        .sort((a, b) => b.min - a.min)
        .find((threshold) => score >= threshold.min) || null
    );
  }

  function label(rules, group, value) {
    return rules.labels?.[group]?.[value] || value || "未提供";
  }

  function evaluateHardRules(plant, answers, rules) {
    const hard = rules.hardRules || {};

    if (hard.publishedOnly && plant.status !== "published") return "尚未發布";
    if (hard.sellableOnly && !plant.sellable) return "目前不可販售";
    if (hard.inStockOnly && !plant.inStock) return "目前缺貨";
    if (hard.activeVariantRequired && !plant.activeVariant) return "沒有可購買規格";
    if (hard.petReachableRequiresPetFriendly && answers.petAccess === "reachable" && !plant.petSafe) {
      return "不符合寵物可接觸的安全條件";
    }

    const budgetMaximum = getBudgetMaximum(rules, answers.budget);
    if (hard.excludeOverBudget && plant.price > budgetMaximum) return "超出預算";

    const spaceScore = bestMatrixScore(
      rules.compatibility?.space,
      answers.space,
      plant.matchProfile.spaces,
    );
    if (hard.excludeSpaceMismatch && spaceScore <= 0) return "成熟尺寸超出可用空間";

    const lightScore = bestMatrixScore(
      rules.compatibility?.light,
      answers.light,
      plant.matchProfile.lights,
    );
    if (lightScore < Number(hard.minimumLightCompatibility || 0)) return "光照條件明顯不符";

    return null;
  }

  function calculateDimensionScores(plant, answers, rules) {
    const budgetMaximum = getBudgetMaximum(rules, answers.budget);
    const preference = answers.growthHabit;
    const growthHabit = plant.matchProfile.growthHabit;

    return {
      light: bestMatrixScore(rules.compatibility.light, answers.light, plant.matchProfile.lights),
      humidity: bestMatrixScore(
        rules.compatibility.humidity,
        answers.humidity,
        plant.matchProfile.humidity,
      ),
      careTime: bestMatrixScore(
        rules.compatibility.careTime,
        answers.careTime,
        plant.matchProfile.observationFrequency,
      ),
      experience: bestMatrixScore(
        rules.compatibility.experience,
        answers.experience,
        plant.matchProfile.environmentSensitivity,
      ),
      space: bestMatrixScore(rules.compatibility.space, answers.space, plant.matchProfile.spaces),
      growthHabit:
        preference === "no-preference" ? 1 : preference === growthHabit ? 1 : 0.45,
      budget:
        budgetMaximum >= 999999
          ? 1
          : plant.price <= budgetMaximum * 0.65
            ? 1
            : plant.price <= budgetMaximum
              ? 0.8
              : 0,
    };
  }

  function calculateScore(dimensions, weights) {
    const weighted = Object.entries(weights).reduce((sum, [key, weight]) => {
      return sum + Number(weight) * Number(dimensions[key] ?? 0);
    }, 0);
    const maximum = Object.values(weights).reduce((sum, value) => sum + Number(value), 0);
    return maximum > 0 ? Math.round((weighted / maximum) * 100) : 0;
  }

  function buildReasons(plant, answers, rules, dimensions) {
    const candidates = [
      {
        score: dimensions.light,
        text: `可適應${label(rules, "light", answers.light)}`,
      },
      {
        score: dimensions.space,
        text: `植株尺寸符合${label(rules, "space", answers.space)}`,
      },
      {
        score: dimensions.careTime,
        text: `${label(rules, "observationFrequency", plant.matchProfile.observationFrequency)}，符合你的照護時間`,
      },
      {
        score: dimensions.humidity,
        text: `可配合${label(rules, "humidity", answers.humidity)}`,
      },
      {
        score: dimensions.growthHabit,
        text:
          answers.growthHabit === "no-preference"
            ? "株型不影響本次排序"
            : `符合${label(rules, "growthHabit", answers.growthHabit)}偏好`,
      },
    ];

    return candidates
      .filter((item) => item.score >= 0.7)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.text);
  }

  function buildCautions(plant, answers, rules, dimensions) {
    const cautions = [];
    if (!plant.petSafe) cautions.push("不適合讓貓狗接觸或啃咬");
    if (plant.stockStatus === "low-stock") cautions.push("目前庫存有限");
    if (dimensions.humidity < 0.7) {
      cautions.push(`需要比${label(rules, "humidity", answers.humidity)}更穩定的濕度管理`);
    }
    if (dimensions.light < 0.7) cautions.push("光照條件需要進一步調整");
    if (dimensions.growthHabit < 0.7 && answers.growthHabit !== "no-preference") {
      cautions.push(`株型與偏好的${label(rules, "growthHabit", answers.growthHabit)}不同`);
    }
    return cautions.slice(0, 3);
  }

  async function match(answers = {}) {
    const [rules, plants] = await Promise.all([
      loadRules(),
      window.CanopyPlantService.getAll(),
    ]);

    if (rules.hardRules?.noLightWithoutGrowLight && answers.light === "no-light") {
      return {
        answers,
        blocked: true,
        blockReason: "這個位置幾乎沒有自然光，而且目前不使用植物燈，因此沒有適合直接購入的觀葉植物。",
        suggestion: "可先增加定時植物燈，或改選白天具有自然光的位置，再重新配對。",
        matches: [],
        excludedCount: plants.length,
      };
    }

    const excluded = [];
    const matches = [];

    plants.forEach((plant) => {
      const exclusionReason = evaluateHardRules(plant, answers, rules);
      if (exclusionReason) {
        excluded.push({ plantId: plant.id, reason: exclusionReason });
        return;
      }

      const dimensions = calculateDimensionScores(plant, answers, rules);
      const score = calculateScore(dimensions, rules.weights);
      const threshold = getThreshold(rules, score);
      if (!threshold) {
        excluded.push({ plantId: plant.id, reason: "整體條件符合度不足" });
        return;
      }

      matches.push({
        plant,
        score,
        level: threshold,
        dimensions,
        reasons: buildReasons(plant, answers, rules, dimensions),
        cautions: buildCautions(plant, answers, rules, dimensions),
      });
    });

    matches.sort((a, b) => b.score - a.score || a.plant.price - b.plant.price);

    return {
      answers,
      blocked: false,
      matches: matches.slice(0, 3),
      excludedCount: excluded.length,
      excluded,
      rules,
    };
  }

  return {
    loadRules,
    match,
    bestMatrixScore,
    calculateScore,
  };
})();
