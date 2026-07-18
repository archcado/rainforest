# CANOPY 開發指南

本文件說明 CANOPY 商城前端、會員 API 與商品管理後台的開發設定、程式碼規範與常見注意事項。

---

## 本機環境設定

### 必要工具
- 文字編輯器（推薦 VS Code）
- Node.js 20 以上

### 啟動完整功能

```bash
npm start
# 瀏覽 http://localhost:3000
```

管理員帳號、n8n Webhook 等設定請參考根目錄 `.env.example`。伺服器以 HttpOnly Cookie、CSRF Header 與角色權限共用會員／管理員驗證機制。

### 僅預覽靜態頁面

**VS Code Live Server**
1. 安裝擴充：[Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. 在 `index.html` 右鍵 → Open with Live Server
3. 瀏覽器自動開啟並熱重載

**Python**
```bash
python -m http.server 8080
# 瀏覽 http://localhost:8080
```

**Node.js（npx，無需安裝）**
```bash
npx serve .
```

靜態伺服器不提供會員、訂單、後台、客服與回饋 API。

---

## CSS 架構

### 載入順序（每頁必須依此順序）

```html
<link rel="stylesheet" href="tokens.css">      <!-- 1. Design Tokens（CSS 變數） -->
<link rel="stylesheet" href="reset.css">        <!-- 2. Browser Reset -->
<link rel="stylesheet" href="base.css">         <!-- 3. 全域基礎樣式 -->
<link rel="stylesheet" href="layout.css">       <!-- 4. 版面結構 -->
<link rel="stylesheet" href="components.css">   <!-- 5. 共用元件 -->
<link rel="stylesheet" href="utilities.css">    <!-- 6. 工具類別 -->
<link rel="stylesheet" href="pages/xxx.css">    <!-- 7. 頁面專屬（最後載入） -->
```

### 各層職責

| 檔案 | 職責 | 禁止 |
|------|------|------|
| `tokens.css` | CSS 變數（顏色、字體、間距等） | 任何選擇器 |
| `reset.css` | 瀏覽器預設重設 | 品牌樣式 |
| `base.css` | html/body/標題/連結基礎 | 元件樣式 |
| `layout.css` | Container/Header/Footer/Grid | 單頁特殊樣式 |
| `components.css` | 跨頁共用元件 | 頁面業務邏輯 |
| `utilities.css` | 少量可重用工具類別 | 複雜元件 |
| `pages/*.css` | 單一功能領域 | 全域影響樣式 |

---

## CSS 相對路徑深度規則

這是最容易出錯的地方，請嚴格遵守：

| 頁面位置 | CSS/JS 路徑前綴 | 範例 |
|----------|-----------------|------|
| 根目錄（`index.html`） | `./assets/` | `./assets/css/tokens.css` |
| `pages/*/` 下所有頁面 | `../../assets/` | `../../assets/css/tokens.css` |

> 所有 `pages/` 下的子目錄深度均為 2 層（`pages/plants/`、`pages/member/` 等），
> 因此統一使用 `../../assets/` 即可覆蓋所有情況。

---

## JavaScript 模組規範

### 基本結構

每個 JS 模組使用 `window.Canopy*` 命名空間，避免全域污染：

```js
"use strict";

window.CanopyModuleName = (function () {
  // 私有變數與函式

  function init() {
    // 公開初始化
  }

  return { init };
})();
```

### main.js 初始化流程

`main.js` 是唯一的初始化入口，在 `DOMContentLoaded` 後呼叫各模組：

```js
document.addEventListener("DOMContentLoaded", () => {
  window.CanopyNavigation?.init();
  window.CanopyModal?.init();
  window.CanopyToast?.init();
  // ... 其他模組
});
```

### 各模組職責

| 模組 | 職責 |
|------|------|
| `main.js` | 全站初始化入口 |
| `layout.js` | 共用版面（Header/Footer）載入 |
| `navigation.js` | 桌面與行動版導覽、current page 高亮 |
| `search.js` | 搜尋面板開關、搜尋執行、結果渲染 |
| `modal.js` | Modal 開關、焦點鎖定、Escape 關閉 |
| `toast.js` | 操作通知顯示與自動消失 |
| `filters.js` | 植物列表篩選、URL 參數同步 |
| `cart.js` | localStorage 購物車 CRUD、數量更新 |
| `member.js` | 登入狀態、會員 API、收藏與購物車同步 |
| `chatbot.js` | 浮動客服與意見回饋 |
| `quiz.js` | 植物配對測驗步驟流程、結果計算 |
| `pages/plant-detail.js` | 商品規格、環境範圍、介質比例與相關植物渲染 |
| `pages/member-pages.js` | 登入、註冊及會員中心頁面 |
| `pages/admin.js` | 商品管理後台 CRUD 與批次作業 |

---

## JSON 假資料規範

假資料存放於 `data/`，格式要求：

- 必須為合法 JSON（可用 [JSONLint](https://jsonlint.com/) 驗證）
- 欄位命名使用 camelCase
- 植物 ID 使用 `plant-001` 格式；slug 使用 kebab-case 字串
- 不寫入真實使用者資料或敏感資訊

---

## 可存取性基本要求

- 所有頁面必須有 `lang="zh-Hant"`
- 每頁只有一個 `<h1>`
- 互動元素必須可用鍵盤操作
- 所有圖片必須有 `alt`
- Modal 開啟時必須有焦點管理
- 表單元素必須有對應的 `<label>`

---

## Design System 說明

- 正式視覺與元件規格：`design-system/design-system.html`
- 正式程式實作：`assets/css/tokens.css`、`layout.css`、`components.css`
- 所有頁面必須沿用 Design System 的品牌色、表面、字體、圓角、陰影與互動狀態
- 修改品牌層級規格時，必須同時更新 Design System 展示頁與對應 CSS Token
- 頁面專屬 CSS 不得建立另一套按鈕、表單、Header、Footer 或植物卡片規格

### 共用版面載入

`assets/js/layout.js` 會在其他模組初始化前載入：

```text
components/header.html
components/footer.html
components/mobile-nav.html
components/search-panel.html
components/chatbot.html
```

頁面只保留 `.site-header` 與 `.site-footer` 掛載位置。共用元件使用專案根路徑撰寫連結，載入器會依實際部署子路徑轉換，支援本機與 GitHub Pages 類型的子目錄部署。

---

## API 與執行期資料

- `server/server.js`：靜態檔案、會員、訂單、商品管理與 n8n 代理 API
- `server/storage.js`：JSON 執行期資料初始化與序列化寫入
- `server/runtime/`：執行期資料，不進版控
- `data/plants-detailed-v2.json`：十六種植物的原始種子資料與靜態模式備援

前台 `plant-service.js` 會優先讀取 `/api/plants`，API 不可用時才改讀原始 JSON。正式部署若改接資料庫，應維持相同回應結構，或同步修改 service adapter。

## 自動化測試

```bash
npm test
```

提交前至少執行一次，避免共用元件路徑、植物資料與 API 權限回歸。

---

## 常見錯誤與注意事項

1. **路徑深度錯誤**：`pages/` 下的頁面忘記用 `../../assets/`
2. **覆蓋 tokens**：在元件或頁面 CSS 中覆寫 `--canopy-*` 變數
3. **全域污染**：JS 變數未包在 IIFE 或模組命名空間中
4. **共用元件混入頁面邏輯**：`header.html` 不應有特定頁面的業務判斷
5. **粉色濫用**：背景色使用 `--blush-*`（違反品牌規範）
6. **大量行內 CSS**：使用 `style=""` 而非 CSS 類別（應最小化）
