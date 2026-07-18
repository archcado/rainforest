# CANOPY Rainforest

CANOPY 是以十六種雨林觀葉植物選品、完整商品說明、科學照護、植物配對與永續理念為核心的商城專案。本版本包含會員帳號、訂單、商品管理 API 與 n8n 客服預留端口。

## 目前範圍

- 十六種植物商品的單一 JSON 資料來源
- 植物列表、光照／濕度／介質／尺寸／價格篩選
- 商品規格、適生環境範圍、介質比例與配送安全說明
- 植物配對與照護資源
- 註冊、登入、忘記密碼、會員資料、地址、收藏、購物車與訂單紀錄
- 共享會員／管理員驗證機制與商品管理後台
- 商品新增、編輯、刪除、上下架、庫存調整與十六種植物 JSON 表單管理
- 浮動客服、意見回饋與 n8n Webhook 預留端口
- 個人植物管理、植物日誌、澆水及施肥紀錄維持移除

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

## 完整功能啟動

需要 Node.js 20 以上。專案沒有第三方套件，直接執行：

```bash
npm start
```

開啟：`http://localhost:3000/`

商品管理後台：`http://localhost:3000/pages/admin/index.html`

### 建立管理員帳號

管理員不使用內建預設密碼，需在啟動前設定環境變數。首次啟動時會建立管理員；後續啟動會沿用執行期資料。

macOS／Linux：

```bash
CANOPY_ADMIN_EMAIL=admin@example.com \
CANOPY_ADMIN_PASSWORD='請換成至少 10 碼的密碼' \
npm start
```

Windows PowerShell：

```powershell
$env:CANOPY_ADMIN_EMAIL="admin@example.com"
$env:CANOPY_ADMIN_PASSWORD="請換成至少 10 碼的密碼"
npm start
```

完整設定範例請參考 `.env.example`。本專案不會自動讀取 `.env`，可由部署平台注入變數，或在本機 shell 設定後啟動。

### n8n 客服與回饋

```bash
N8N_CHAT_WEBHOOK_URL='https://你的-n8n/webhook/chat' \
N8N_FEEDBACK_WEBHOOK_URL='https://你的-n8n/webhook/feedback' \
npm start
```

瀏覽器只會呼叫本站 `/api/chat` 與 `/api/feedback`；真正的 n8n URL 保留在伺服器端。未設定 n8n 時，客服會顯示尚未連線，意見回饋仍會先保存於本機執行期資料。

### 靜態預覽

仍可用 Live Server 或 Python 預覽公開頁面：

```bash
python -m http.server 8080
```

靜態模式會從原始 JSON 讀取植物資料，但會員、訂單、後台與 n8n 功能需要 `npm start`。

## 測試

```bash
npm test
```

測試包含所有 HTML 共用資源與路徑、十六種植物資料與配對，以及會員、權限、訂單、商品管理和回饋 API。

## 資料與目前邊界

- 初次啟動會把 `data/plants-detailed-v2.json` 複製為執行期商品資料，後台修改不會改寫原始種子檔。
- 執行期會員、訂單、回饋與商品資料位於 `server/runtime/`，已由 Git 忽略。
- 商品圖片目前管理圖片路徑或 URL，尚未提供二進位檔案上傳與雲端媒體庫。
- 結帳目前建立測試訂單並扣庫存，尚未串接信用卡或行動支付金流。
- 忘記密碼在非 production 模式會回傳開發用重設連結；正式部署應接上郵件服務。
