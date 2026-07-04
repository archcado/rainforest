# CANOPY 元件規範

本文件說明 CANOPY 共用元件的使用規則、命名規範與可存取性要求。

---

## 命名規範

### 檔案命名
- 元件 HTML 檔案：小寫 kebab-case，例如 `plant-card.html`、`care-card.html`
- CSS 類別：語意化 kebab-case，遵循 BEM 結構

### BEM 結構

```css
/* Block */
.plant-card { }

/* Element（Block 的一部分） */
.plant-card__image { }
.plant-card__title { }
.plant-card__price { }

/* Modifier（狀態或變體） */
.plant-card--featured { }
.plant-card--sold-out { }
```

---

## 元件清單與用途

| 元件檔案 | 用途 |
|----------|------|
| `header.html` | 網站頂部導覽列、LOGO、搜尋入口 |
| `footer.html` | 網站底部、各區連結、社群圖示 |
| `mobile-nav.html` | 行動版側滑導覽選單 |
| `search-panel.html` | 搜尋面板（展開疊層） |
| `plant-card.html` | 植物商品卡片 |
| `care-card.html` | 照護文章卡片 |
| `filter-panel.html` | 植物列表篩選面板 |
| `breadcrumb.html` | 麵包屑路徑導覽 |
| `newsletter.html` | 電子報訂閱表單 |
| `modal.html` | 通用 Modal 對話框 |
| `toast.html` | 操作回饋通知（Toast） |
| `empty-state.html` | 列表空白狀態提示 |

---

## ARIA 要求

### 對話框（Modal）
```html
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">...</h2>
  ...
  <button aria-label="關閉對話框">✕</button>
</div>
```

- 開啟時必須 `focus` 移至 Modal 內部
- 關閉時必須將 `focus` 歸還觸發元素
- 按 `Escape` 必須關閉

### 導覽列
```html
<nav aria-label="主要導覽">
  <a aria-current="page" href="...">...</a>
</nav>
```

- 行動版漢堡按鈕使用 `aria-expanded` 與 `aria-controls`
- 目前頁面連結加 `aria-current="page"`

### 麵包屑
```html
<nav aria-label="麵包屑">
  <ol role="list">...</ol>
</nav>
```

### Toast 通知
```html
<div role="status" aria-live="polite">
  <!-- 成功 / 一般訊息 -->
</div>
<div role="alert" aria-live="assertive">
  <!-- 錯誤訊息 -->
</div>
```

### 圖片
- 所有 `<img>` 必須有 `alt`
- 裝飾性圖片：`alt=""`
- 功能性圖片：描述其功能，而非外觀

---

## 元件使用禁止事項

- 禁止在共用元件中寫入特定頁面的業務邏輯
- 禁止在元件中寫入寫死的使用者資料（姓名、訂單等）
- 禁止在元件中寫入真實價格或庫存邏輯
- 禁止無語意的 `<div>` 堆疊（應使用正確語意標籤）
- 禁止元件內的 class 與 Design System 命名不一致

---

## 元件整合方式

目前元件為獨立 HTML 片段，頁面中使用插槽與註解標記載入位置：

```html
<header class="site-header" role="banner">
  <!-- 共用 Header 載入位置（components/header.html）-->
</header>
```

正式載入機制（JavaScript fetch、Server-Side Include 或框架）待後續決定，
**不應為此引入大型框架**。

---

## 植物卡片規格

```html
<article class="plant-card">
  <a class="plant-card__link" href="...">
    <div class="plant-card__image-wrap">
      <img class="plant-card__image" src="..." alt="植物名稱">
    </div>
    <div class="plant-card__body">
      <h3 class="plant-card__name">植物中文名</h3>
      <p class="plant-card__scientific">學名</p>
      <div class="plant-card__meta">
        <!-- 難度、光照等標籤 -->
      </div>
      <p class="plant-card__price">NT$ 980</p>
    </div>
  </a>
  <button class="btn btn--primary btn--sm plant-card__cta"
          type="button"
          data-add-to-cart="plant-slug">
    加入購物車
  </button>
</article>
```
