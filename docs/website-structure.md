# CANOPY 網站結構

> 更新日期：2026-07-19
> 專案階段：公開商城前端與十六種正式植物商品資料。

## 1. 專案定位

CANOPY 是以熱帶觀葉植物選品、商品說明、環境配對、照護資源與永續理念為核心的植物商城。

目前優先完成公開商城體驗，不把網站發展成植物照護紀錄工具。登入後的帳戶、訂單與收藏功能保留現有骨架，待購物流程穩定後再重新規劃。

## 2. 本階段網站架構

```text
CANOPY
├─ 首頁
├─ 植物商城
│  ├─ 十六種植物列表
│  └─ 植物商品詳情
├─ 照護資源
│  ├─ 照護指南
│  ├─ 問題診斷
│  ├─ 好物分享
│  └─ 空間靈感
├─ 植物配對
└─ 關於 CANOPY
   ├─ 品牌故事
   ├─ 植物旅程
   ├─ 核心價值
   ├─ 永續行動
   └─ 一起參與
```

正式 Header 導覽：

```text
植物商城｜照護資源｜植物配對｜關於 CANOPY
```

Header 的文字連結使用底部青草綠橫線表示 Hover 與目前頁面，不使用大面積背景色塊。

會員入口固定保留在 Header；窄螢幕會先隱藏次要的收藏捷徑，不隱藏登入／會員中心入口。

## 3. 照護資源

照護資源使用 `data/care-articles.json` 作為單一內容來源，目前包含十六篇內容，分為照護指南、問題診斷、好物分享與空間靈感。列表頁提供全文搜尋、內容類型與主題篩選，文章可收藏在瀏覽器中；詳情頁提供章節導覽、重點摘要、相關植物與延伸閱讀。

文章提供可執行的觀察方式，不把固定澆水日、固定施肥次數或未驗證偏方當作通用答案。

## 4. 植物商城

植物列表只讀取 `data/plants-detailed-v2.json`，不得另建重複商品資料。

篩選條件：

- 光照需求
- 介質類型
- 濕度需求
- 植物尺寸
- 寵物安全
- 價格區間

介質類型固定為：

- 粗顆粒排水型
- 均衡保水型
- 保濕透氣型
- 高排水礦物型

「照護難度」已移除，不再出現在 JSON、商品卡、篩選器或商品詳情。

## 5. 植物商品詳情

每項商品同時提供植物知識與購買資訊。

```text
商品詳情
├─ 商品圖集
├─ 名稱、學名與售價
├─ 庫存與商品規格
├─ 植株高度、盆徑與裝飾盆說明
├─ 適生環境概覽
│  ├─ 光照範圍
│  ├─ 濕度範圍
│  ├─ 溫度範圍
│  └─ 生長速度
├─ 完整照護說明
├─ 建議介質比例
├─ 活體植物差異
├─ 包裝配送
├─ 寵物與兒童安全
└─ 相關植物
```

適生環境以 HTML/CSS 範圍指示器呈現，不使用沒有統計意義的圓餅圖。介質比例使用水平堆疊條，所有比例總和必須為 100%。

## 6. 十六種正式植物

| ID | 植物 | 學名 |
|---|---|---|
| plant-001 | 龜背芋 | Monstera deliciosa |
| plant-002 | 黑葉觀音蓮 | Alocasia × amazonica |
| plant-003 | 黃金葛 | Epipremnum aureum |
| plant-004 | 心葉蔓綠絨 | Philodendron hederaceum |
| plant-005 | 白紋蔓綠絨 | Philodendron 'Birkin' |
| plant-006 | 琴葉榕 | Ficus lyrata |
| plant-007 | 黑金剛橡皮樹 | Ficus elastica 'Burgundy' |
| plant-008 | 青蘋果竹芋 | Goeppertia orbifolia |
| plant-009 | 白天堂鳥 | Strelitzia nicolai |
| plant-010 | 白鶴芋 | Spathiphyllum wallisii |
| plant-011 | 金錢樹 | Zamioculcas zamiifolia |
| plant-012 | 虎尾蘭 | Dracaena trifasciata |
| plant-013 | 袖珍椰子 | Chamaedorea elegans |
| plant-014 | 鳥巢蕨 | Asplenium nidus |
| plant-015 | 波士頓腎蕨 | Nephrolepis exaltata 'Bostoniensis' |
| plant-016 | 鏡面草 | Pilea peperomioides |

## 7. 關於 CANOPY

原本分開的品牌故事與永續計畫整合為一個敘事頁，包含可切換的植物旅程、永續行動主題、包裝分層探索與使用者優先行動選擇。互動選擇先保存在瀏覽器，再透過全站回饋入口蒐集文字建議；尚無營運佐證的數字不得呈現為既成成果。

舊的 `pages/sustainability/sustainability.html` 保留為相容入口，會導向「關於 CANOPY」的永續行動段落。

## 8. 會員中心與已移除範圍

會員中心定位為商城帳號管理，包含個人資料、收件地址、密碼、收藏、購物車與訂單紀錄。以下照護紀錄功能維持移除：

- 個人植物清單
- 植物日誌
- 澆水、施肥與換盆紀錄
- 成長照片時間軸
- 照護提醒與健康狀態追蹤

這些功能不保留隱藏入口或失效頁面。未來若重新評估實體植物照護追蹤，應另行定義需求，不與商城會員中心混用。

## 9. 主要檔案

```text
rainforest/
├─ index.html
├─ design-system/design-system.html
├─ pages/
│  ├─ plants/
│  │  ├─ plants.html
│  │  └─ plant-detail.html
│  ├─ care/
│  ├─ quiz/
│  ├─ sustainability/（舊連結相容入口）
│  ├─ commerce/
│  ├─ member/
│  └─ system/
├─ components/
├─ assets/
│  ├─ css/
│  ├─ js/
│  │  ├─ services/plant-service.js
│  │  └─ pages/plant-detail.js
│  └─ images/
├─ data/
│  ├─ plants-detailed-v2.json
│  ├─ quiz-questions.json
│  └─ match-rules.json
└─ tests/
```

## 10. 資料原則

- 每筆植物商品必須包含 `identity`、`catalog`、`summary`、`morphology`、`environmentProfile`、`care`、`safety`、`commerce` 與 `media`。
- 澆水使用介質狀態判斷，不使用固定星期作為唯一依據。
- 商品尺寸、盆徑、庫存與 SKU 必須是可直接顯示的商品欄位。
- 寵物安全需保留文字說明與專業諮詢提醒。
- 活體植物必須說明個體差異，不能暗示實際出貨會與示意圖完全相同。
- 所有頁面共用 `components/header.html` 與 `components/footer.html`。

## 11. 後續階段

1. 補齊十六種商品實拍或正式 WebP 圖片。
2. 驗證購物車與結帳流程。
3. 串接真實庫存與訂單 API。
4. 重新規劃登入後會員中心。
5. 依實際使用需求決定是否增加個人化功能。
