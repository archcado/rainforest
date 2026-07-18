# CANOPY 植物資料模型 v2.1

## 核心調整

原始資料把植物身分、照護、商品與庫存集中成少量欄位，無法支援完整植物詳情頁、篩選、SEO、圖片規範、商品規格與後續後端拆表。

v2.1 將單一植物商品讀取模型拆成：

1. `identity`：名稱、分類與植物學身分。
2. `catalog`：商城分類、顯示順序、標籤與篩選鍵。
3. `summary`：列表及詳情頁文案。
4. `morphology`：株型、生長速度與成熟尺寸。
5. `environmentProfile`：光照、濕度、溫度與生長速度的可視化範圍。
6. `care`：光照、澆水、濕度、溫度、介質比例、施肥與常見問題。
7. `safety`：寵物毒性、風險與警示。
8. `commerce`：價格、庫存、SKU、商品尺寸、內容物與配送。
9. `media`：卡片圖、主圖與商品圖庫。
10. `relations`：相關植物。
11. `seo`：搜尋引擎資訊。
12. `editorial`：資料審核與來源追蹤。

## 關鍵原則

- 澆水不使用固定星期作為唯一判斷，改用介質狀態。
- `petFriendly` 不能只保留布林值，需記錄毒性對象、風險說明與專業諮詢提醒。
- 介質配方使用結構化百分比，單一商品的比例總和必須為 100%。
- 原本的照護分級已移除，列表與詳情頁改為顯示具體介質類型。
- 一個植物可以有多個 SKU、尺寸與價格。
- 促銷價使用 `salePrice`，原價使用 `price`；若需明確指定劃線價，可使用 `compareAtPrice`。只有劃線價高於目前售價時，前台才顯示折扣資訊。
- 植物學名稱與園藝商品名稱分開保存。
- 十六種正式商品使用 `catalog.displayOrder` 控制列表順序，不應寫死於 HTML。
- 正式資料的商品尺寸、盆徑與庫存不得使用 `null`；未知時應先標記為不可販售。
- 正式後端可拆成 Plant、PlantCareProfile、ProductVariant、Inventory、PlantMedia 與 PlantContent 等資料表。

## 商品價格欄位

一般售價維持既有結構：

```json
{
  "price": { "amount": 680, "currency": "TWD" }
}
```

需要促銷時，在同一個商品規格加入 `salePrice`；商城卡片會顯示優惠價、刪除線原價及自動計算的折扣比例：

```json
{
  "price": { "amount": 680, "currency": "TWD" },
  "salePrice": { "amount": 580, "currency": "TWD" }
}
```

後台若採用「目前售價＋建議售價」模式，也可提供 `compareAtPrice`。不得只靠前端樣式判定促銷，售價與原價都必須來自商品資料。
