# CANOPY 設計規範

本文件說明 CANOPY 品牌視覺系統、設計語言與使用原則。

設計系統的實作細節（CSS 變數、元件範例）請參閱 `design-system.html`。

---

## 品牌色票

所有顏色定義於 `assets/css/tokens.css`，直接引用自 `design-system.html` 的 CSS 變數。

### 主要背景色（優先使用）

| 名稱 | CSS 變數 | 說明 |
|------|----------|------|
| 葉白 | `--leaf-white` | 最淺背景，主要頁面底色 |
| 霧面白 | `--mist-surface` | 次要背景、卡片底色 |
| 霧白 50 | `--canopy-50` | 極淺綠調白色 |

### 品牌綠色系

| 名稱 | CSS 變數 | 使用場合 |
|------|----------|----------|
| 鼠尾草綠 | `--canopy-200` ~ `--canopy-300` | 輕柔背景、標籤 |
| 青草綠 | `--grass-400` ~ `--grass-500` | 按鈕、連結、互動元素 |
| 森林綠 | `--canopy-700` ~ `--canopy-900` | 標題、主要文字 |

### 粉色系（嚴格限制使用）

| 名稱 | CSS 變數 | 使用規範 |
|------|----------|----------|
| 嫩粉 | `--blush-100` ~ `--blush-200` | 僅限小面積點綴 |
| 粉紅 | `--blush-400` ~ `--blush-500` | 僅限斑葉植物標籤或狀態點 |

> ⚠️ **禁止** 使用粉色作為大面積頁面背景。粉色只用於植物新葉、斑葉或小面積狀態標記。

---

## 字體系統

```css
--font-sans:   'Noto Sans TC', sans-serif;   /* 主要 UI 字體 */
--font-serif:  'Noto Serif TC', serif;        /* 標題裝飾字體 */
--font-mono:   'JetBrains Mono', monospace;   /* 程式碼 */
```

字體大小尺度請參閱 `tokens.css` 中的 `--text-*` 系列變數。

---

## 間距系統

使用 4px 基礎單位，間距變數命名為 `--space-1` 至 `--space-24`。

避免使用任意 px 值，優先使用 `tokens.css` 中定義的間距變數。

---

## 圓角

| 名稱 | CSS 變數 | 用途 |
|------|----------|------|
| 微 | `--radius-sm` | 輸入框、標籤 |
| 中 | `--radius-md` | 卡片 |
| 大 | `--radius-lg` | 大型卡片、面板 |
| 全圓 | `--radius-full` | Badge、圓形按鈕 |

---

## 陰影

| 名稱 | CSS 變數 | 用途 |
|------|----------|------|
| 淺 | `--shadow-sm` | 卡片預設 |
| 中 | `--shadow-md` | 卡片 hover、下拉選單 |
| 深 | `--shadow-lg` | Modal、浮層 |

---

## 響應式斷點

```
--breakpoint-sm: 480px
--breakpoint-md: 768px
--breakpoint-lg: 1024px
--breakpoint-xl: 1280px
```

設計優先考量行動版（Mobile First），再向上擴充桌面版。

---

## 動畫與過渡

- 輕量互動（hover、focus）：`--duration-fast: 150ms`
- 元件展開收合：`--duration-normal: 250ms`
- 頁面轉場：`--duration-slow: 400ms`
- 緩動函式：`--ease-default: cubic-bezier(0.4, 0, 0.2, 1)`

---

## 圖片使用規範

- 植物圖片優先使用 WebP 格式
- 所有 `<img>` 必須有 `alt` 屬性
- 裝飾性圖片使用 `alt=""` 或 CSS `background-image`
- 圖片存放位置：`assets/images/` 依類型分目錄

---

## 禁止事項

- 禁止大面積粉色背景
- 禁止修改 `design-system.html` 中已確認的品牌色票
- 禁止使用大量行內 CSS（`style` 屬性）
- 禁止任意擴充 tokens 而不在本文件說明
