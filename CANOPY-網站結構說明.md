# CANOPY 雨林植物網站結構說明

> 文件用途：說明 CANOPY 網站的資訊架構、頁面職責、資料夾配置、共用元件與後續開發順序。  
> 適用對象：前端開發者、後端開發者、UI/UX 設計者，以及協助開發的 AI 工具。  
> 專案階段：設計系統已定調，準備進入正式網站骨架與功能頁建置。

---

## 1. 專案定位

CANOPY 是一個以「雨林植物選品、科學照護、植物配對、個人植物管理與環境永續」為核心的植物平台。

網站不只提供盆栽銷售，也應協助使用者：

1. 找到適合自身環境與生活方式的植物。
2. 理解植物所需的光照、濕度、介質與澆水條件。
3. 建立個人植物清單與照護紀錄。
4. 透過測驗降低選購錯誤與照護失敗。
5. 理解品牌在植物來源、包裝與配送上的永續原則。

---

## 2. 核心網站架構

正式網站分為五個主要功能領域：

```text
CANOPY
├─ 植物商城
├─ 照護知識
├─ 植物配對測驗
├─ 我的植物
└─ 永續計畫
```

### 2.1 植物商城

負責植物探索、篩選、查看詳情與購買流程。

主要功能：

- 植物列表
- 關鍵字搜尋
- 條件篩選
- 植物詳情
- 收藏
- 加入購物車
- 購物車確認
- 結帳
- 訂單完成

建議篩選條件：

- 光照需求
- 環境濕度
- 照護難度
- 是否寵物友善
- 空間大小
- 植物尺寸
- 價格區間
- 庫存狀態

---

### 2.2 照護知識

負責提供結構化、可查詢且可實際執行的植物照護內容。

主要分類：

- 新手照護
- 光照
- 澆水
- 濕度與溫度
- 介質
- 換盆
- 施肥
- 病蟲害
- 常見症狀診斷

每篇照護文章建議包含：

- 問題描述
- 適用植物
- 常見症狀
- 可能原因
- 判斷方式
- 處理步驟
- 預防方式
- 延伸閱讀

---

### 2.3 植物配對測驗

依使用者的實際環境與照護能力推薦合適植物。

測驗條件建議包含：

- 居家光照
- 可維持的濕度
- 每週可投入的照護時間
- 是否飼養寵物
- 植物種植經驗
- 空間大小
- 偏好植株尺寸
- 葉形與外觀偏好

測驗結果應顯示：

- 推薦植物
- 配對程度
- 推薦原因
- 照護難度
- 主要注意事項
- 前往植物詳情
- 重新測驗

---

### 2.4 我的植物

提供登入後的個人植物管理功能。

主要功能：

- 個人植物清單
- 新增植物
- 植物照護狀態
- 澆水紀錄
- 施肥紀錄
- 換盆紀錄
- 生長照片
- 每日觀察
- 提醒與通知
- 健康狀態紀錄

這一區是「已擁有植物的長期管理中心」，不應與商城收藏功能混為同一概念。

---

### 2.5 永續計畫

說明品牌在植物來源、包裝、物流與教育上的原則。

主要內容：

- 永續選品原則
- 合法與負責任來源
- 原生種與外來種說明
- 環保包裝
- 低耗材配送
- 盆器回收
- 植物照護教育
- 品牌承諾

永續內容應避免只停留在口號，需具體說明品牌採取的行動與衡量方式。

---

## 3. 首頁資訊架構

首頁負責建立品牌印象並引導使用者進入核心功能。

```text
首頁
├─ Header
├─ Hero 品牌主視覺
├─ 植物配對測驗入口
├─ 精選植物
├─ 依環境探索植物
├─ 照護知識精選
├─ 我的植物功能介紹
├─ 永續計畫摘要
├─ 電子報訂閱
└─ Footer
```

### 3.1 Header

建議正式導覽：

```text
植物商城｜照護知識｜植物配對｜我的植物｜永續計畫
```

右側功能：

- 搜尋
- 收藏
- 購物車
- 會員登入／帳戶
- 行動版選單

### 3.2 Hero

應包含：

- CANOPY 品牌名稱
- 核心標語
- 品牌簡介
- 主要 CTA
- 次要 CTA
- 品牌植物主視覺

建議主要 CTA：

- 探索植物
- 開始植物配對

### 3.3 依環境探索植物

可使用以下入口：

- 明亮散射光
- 低光環境
- 高濕度環境
- 新手適合
- 寵物友善
- 小空間適合

---

## 4. 建議頁面清單

### 4.1 公開頁面

```text
index.html
plants.html
plant-detail.html
care.html
care-detail.html
quiz.html
quiz-result.html
sustainability.html
about.html
contact.html
login.html
register.html
```

### 4.2 商城流程頁面

```text
cart.html
checkout.html
order-complete.html
order-detail.html
```

### 4.3 會員頁面

```text
account.html
favorites.html
orders.html
my-plants.html
plant-journal.html
notifications.html
```

### 4.4 系統與輔助頁面

```text
search-results.html
privacy.html
terms.html
shipping.html
404.html
```

---

## 5. 建議資料夾結構

```text
canopy/
├─ index.html
├─ README.md
├─ docs/
│  ├─ website-structure.md
│  ├─ design-guidelines.md
│  ├─ component-rules.md
│  └─ development-guide.md
│
├─ pages/
│  ├─ plants/
│  │  ├─ plants.html
│  │  └─ plant-detail.html
│  │
│  ├─ care/
│  │  ├─ care.html
│  │  └─ care-detail.html
│  │
│  ├─ quiz/
│  │  ├─ quiz.html
│  │  └─ quiz-result.html
│  │
│  ├─ sustainability/
│  │  └─ sustainability.html
│  │
│  ├─ commerce/
│  │  ├─ cart.html
│  │  ├─ checkout.html
│  │  ├─ order-complete.html
│  │  └─ order-detail.html
│  │
│  ├─ member/
│  │  ├─ account.html
│  │  ├─ favorites.html
│  │  ├─ orders.html
│  │  ├─ my-plants.html
│  │  ├─ plant-journal.html
│  │  └─ notifications.html
│  │
│  └─ system/
│     ├─ login.html
│     ├─ register.html
│     ├─ search-results.html
│     ├─ privacy.html
│     ├─ terms.html
│     ├─ shipping.html
│     └─ 404.html
│
├─ components/
│  ├─ header.html
│  ├─ footer.html
│  ├─ mobile-nav.html
│  ├─ search-panel.html
│  ├─ plant-card.html
│  ├─ care-card.html
│  ├─ filter-panel.html
│  ├─ breadcrumb.html
│  ├─ newsletter.html
│  ├─ modal.html
│  ├─ toast.html
│  └─ empty-state.html
│
├─ assets/
│  ├─ css/
│  │  ├─ tokens.css
│  │  ├─ reset.css
│  │  ├─ base.css
│  │  ├─ layout.css
│  │  ├─ components.css
│  │  ├─ utilities.css
│  │  └─ pages/
│  │     ├─ home.css
│  │     ├─ plants.css
│  │     ├─ plant-detail.css
│  │     ├─ care.css
│  │     ├─ quiz.css
│  │     ├─ member.css
│  │     └─ commerce.css
│  │
│  ├─ js/
│  │  ├─ main.js
│  │  ├─ layout.js
│  │  ├─ navigation.js
│  │  ├─ search.js
│  │  ├─ modal.js
│  │  ├─ toast.js
│  │  ├─ filters.js
│  │  ├─ cart.js
│  │  ├─ quiz.js
│  │  └─ plant-journal.js
│  │
│  ├─ images/
│  │  ├─ brand/
│  │  ├─ hero/
│  │  ├─ plants/
│  │  ├─ care/
│  │  ├─ sustainability/
│  │  └─ placeholders/
│  │
│  └─ icons/
│     ├─ ui/
│     ├─ plant-status/
│     └─ social/
│
├─ data/
│  ├─ plants.json
│  ├─ care-articles.json
│  ├─ quiz-questions.json
│  ├─ quiz-results.json
│  └─ navigation.json
│
└─ design-system/
   └─ design-system.html
```

---

## 6. 資料夾職責

### `pages/`

存放正式功能頁面。頁面應依功能領域分類，不要將所有 HTML 集中放在同一層。

### `components/`

存放跨頁面共用的結構元件，例如 Header、Footer、植物卡片與 Modal。

元件不應包含單一頁面的特殊版面邏輯。

### `assets/css/`

CSS 建議依下列層級拆分：

```text
tokens.css       設計變數
reset.css        瀏覽器預設重設
base.css         全站基礎元素
layout.css       Header、Footer、Grid、Container
components.css   共用元件
utilities.css    少量工具類別
pages/*.css      單一功能頁樣式
```

### `assets/js/`

存放互動與功能邏輯。應避免把全部 JavaScript 都放在 `main.js`。

### `assets/images/`

依用途分類圖片，不以單純流水號混放。

### `data/`

目前若尚未串接後端，可先以 JSON 作為假資料來源；正式串接 API 後，仍可保留作為測試與備援資料。

### `design-system/`

只存放設計系統展示與元件測試頁，不應與正式網站首頁混用。

---

## 7. Design System 定位

目前的 `design-system.html` 是視覺與元件規範頁，不是正式首頁。

應包含：

```text
Design System
├─ Brand Foundation
├─ Color Tokens
├─ Typography
├─ Buttons
├─ Form Elements
├─ Status Badges
├─ Plant Cards
├─ Information Cards
├─ Header
├─ Footer
├─ Modal
├─ Drawer
├─ Toast
├─ Dropdown
├─ Accordion
├─ Empty State
└─ Responsive States
```

設計系統的目的：

1. 確認視覺語言。
2. 統一元件外觀。
3. 測試互動狀態。
4. 避免不同頁面各自產生不一致樣式。
5. 作為 AI 與開發者共同參照的規格頁。

---

## 8. 共用元件規劃

### 8.1 基礎元件

- Button
- Input
- Select
- Textarea
- Checkbox
- Radio
- Badge
- Tag
- Icon Button
- Divider
- Tooltip

### 8.2 導覽元件

- Header
- Desktop Navigation
- Mobile Navigation
- Breadcrumb
- Search Panel
- User Menu

### 8.3 內容元件

- Plant Card
- Care Article Card
- Information Card
- Recommendation Card
- Sustainability Card
- Empty State
- Loading State

### 8.4 互動元件

- Modal
- Drawer
- Dropdown
- Accordion
- Toast
- Tabs
- Pagination
- Filter Panel

### 8.5 商城元件

- Product Quantity
- Cart Item
- Price Summary
- Checkout Steps
- Order Status
- Stock Badge

### 8.6 個人植物元件

- My Plant Card
- Care Timeline
- Watering Record
- Growth Photo
- Reminder Item
- Health Status

---

## 9. 命名規範

### 9.1 檔案與資料夾

統一使用小寫 kebab-case：

```text
plant-detail.html
care-detail.css
plant-journal.js
search-results.html
```

禁止混用：

```text
PlantDetail.html
plant_detail.html
plantDetail.html
```

### 9.2 CSS 類別

建議採語意化 kebab-case：

```css
.plant-card
.plant-card__image
.plant-card__title
.plant-card__meta
.plant-card--featured
```

### 9.3 JavaScript

變數與函式使用 camelCase：

```js
const mobileNav = document.querySelector(".mobile-nav");

function openMobileNav() {}
function closeMobileNav() {}
```

### 9.4 圖片命名

```text
monstera-deliciosa-01.webp
alocasia-amazonica-card.webp
canopy-home-hero.webp
watering-guide-cover.webp
```

---

## 10. 頁面共用骨架

正式頁面應共享相同骨架：

```html
<body>
  <header class="site-header"></header>

  <main class="site-main">
    <section class="page-hero"></section>
    <section class="page-content"></section>
  </main>

  <footer class="site-footer"></footer>
</body>
```

頁面層級原則：

```text
Header
→ Breadcrumb 或 Page Hero
→ Main Content
→ Related Content
→ Newsletter
→ Footer
```

---

## 11. 響應式設計原則

至少規劃三種主要版面：

```text
Desktop：≥ 1024px
Tablet：641px–1023px
Mobile：≤ 640px
```

### Desktop

- 顯示完整導覽
- 多欄卡片排列
- 篩選面板可固定於左側
- 植物詳情可使用雙欄結構

### Tablet

- 收合部分導覽
- 卡片改為兩欄
- 篩選改為 Drawer
- 保留主要 CTA

### Mobile

- 使用漢堡選單
- 卡片改為單欄
- CTA 按鈕需保持容易點擊
- 不使用過寬表格
- 表單欄位改為單欄
- 購物車摘要可固定於底部或分段顯示

---

## 12. 資料與後端概念

目前前端可先以靜態資料建立畫面，但頁面結構應預留後端資料來源。

主要資料實體可包含：

```text
Plant
PlantCategory
PlantCareProfile
CareArticle
User
UserPlant
PlantJournal
QuizQuestion
QuizResult
Favorite
Cart
Order
OrderItem
SustainabilityArticle
```

前端不得將商品名稱、價格、庫存與文章內容永久寫死在 HTML 中。初期可透過 JSON 模擬，後續再改為 API。

---

## 13. 開發優先順序

建議依下列順序進行：

### 第一階段：基礎規範

1. 完成 `design-system.html`
2. 拆出 `tokens.css`
3. 建立全站基礎 CSS
4. 建立 Header、Footer
5. 建立共用按鈕、表單、卡片

### 第二階段：正式網站骨架

1. 建立資料夾結構
2. 建立所有頁面的空白 HTML
3. 接入共用 Header 與 Footer
4. 確認相對路徑
5. 完成 RWD 導覽

### 第三階段：核心頁面

1. 首頁
2. 植物列表
3. 植物詳情
4. 照護知識列表
5. 照護文章詳情
6. 植物配對測驗
7. 測驗結果

### 第四階段：會員與商城

1. 登入與註冊
2. 收藏
3. 購物車
4. 結帳
5. 訂單
6. 我的植物
7. 植物日誌

### 第五階段：資料與後端整合

1. 建立 API 規格
2. 將 JSON 假資料改為 API
3. 串接會員系統
4. 串接訂單與庫存
5. 串接照護紀錄
6. 完成驗證與錯誤處理

---

## 14. AI 開發限制

協助此專案的 AI 在修改程式碼時，應遵守以下規則：

1. 先閱讀資料夾結構與既有設計系統。
2. 不任意更改已確認的品牌配色。
3. 不將大面積粉色作為頁面基底色。
4. 粉色只能作為植物新葉、斑葉或小面積狀態點綴。
5. 以霧白、鼠尾草綠、青草綠與森林綠為主要色系。
6. 不重複建立已存在的共用元件。
7. 不將單頁特殊樣式寫入全域 CSS。
8. 不任意修改其他頁面。
9. 修改前先說明影響範圍。
10. 修改後應列出變更檔案、變更內容與驗證方式。

---

## 15. 本階段開發邊界

目前先完成：

- 網站架構
- 資料夾配置
- 共用頁面骨架
- 設計系統
- Header
- Footer
- 基礎元件
- 靜態頁面結構

目前暫不處理：

- 真實付款
- 真實會員驗證
- 真實訂單寫入
- 後端資料庫
- 推播通知
- 物流 API
- 第三方登入
- 正式上線部署

---

## 16. 結論

CANOPY 的正式網站應由「商城、照護、配對、個人植物管理與永續」五個功能領域共同構成。

`design-system.html` 只負責定義視覺與元件規格；正式功能頁面應依資料夾架構拆分，並透過共用元件與一致的設計變數維持整體品質。

後續所有頁面開發都應以本文件作為資訊架構與檔案配置依據。
