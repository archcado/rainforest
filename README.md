# CANOPY Rainforest

CANOPY 是以十六種雨林觀葉植物選品、完整商品說明、科學照護、植物配對與永續理念為核心的前端商城專案。

## 目前範圍

- 十六種植物商品的單一 JSON 資料來源
- 植物列表、光照／濕度／介質／尺寸／價格篩選
- 商品規格、適生環境範圍、介質比例與配送安全說明
- 植物配對與照護知識
- 公開商城優先；個人植物管理與照護紀錄已移除

## 正式設計規格

- 視覺與元件規格：`design-system/design-system.html`
- Design Tokens 實作：`assets/css/tokens.css`
- 共用元件樣式：`assets/css/components.css`
- 版面實作：`assets/css/layout.css`

正式頁面不得自行建立另一套品牌色、圓角、陰影、按鈕或表單系統。新增元件時，先在 Design System 中確認規格，再加入正式 CSS。

## 植物配對流程

植物配對功能會依光照、空氣環境、照護時間、種植經驗、寵物接觸、可用空間、株型偏好與預算，從已發布且可購買的植物中計算條件符合度。

```text
pages/quiz/quiz.html
  -> data/quiz-questions.json
  -> assets/js/quiz.js
  -> pages/quiz/quiz-result.html
  -> assets/js/services/plant-service.js
  -> assets/js/services/plant-match-service.js
  -> data/match-rules.json
  -> assets/js/pages/quiz-result.js
```

## 本機啟動

請使用 HTTP 伺服器，不要直接以 `file://` 開啟頁面。

```bash
python -m http.server 8080
```

開啟：`http://localhost:8080/`
