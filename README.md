# 中華台北羽球3對3發展協會 官方網站

完整的協會官網、會員系統、比賽報名系統與後台管理。

## 技術堆疊

- **Frontend**: Next.js 15 App Router + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Next.js Server Actions
- **ORM**: Prisma 7 + Neon PostgreSQL
- **Auth**: Auth.js v5 (Google / LINE / Facebook 登入)
- **部署**: Vercel

## 功能

### 前台
- 協會官網（首頁、關於、宗旨、賽事、聯絡）
- 會員系統（Google / LINE / Facebook 登入）
- 協會會員申請（銀行轉帳 + 末5碼驗證）
- 賽事報名（3人隊伍 + 年齡/性別自動驗證）
- 費用自動計算（有效會員/新加入/非會員）
- 會員中心（會員卡、報名紀錄、付款紀錄）

### 後台
- Dashboard（會員數、今日報名、收入統計）
- 會員管理（搜尋、確認付款）
- 賽事管理（新增/編輯賽事、組別設定）
- 報名管理（確認付款、取消報名、Excel匯出）
- 公告管理

## 快速開始

### 1. 安裝相依套件

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.local.example` 為 `.env`，填入以下設定：

```bash
cp .env.local.example .env
```

需要設定：
- `DATABASE_URL` - Neon PostgreSQL 連線字串
- `AUTH_SECRET` - 執行 `openssl rand -base64 32` 取得
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `LINE_CLIENT_ID` / `LINE_CLIENT_SECRET`
- `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET`

### 3. 初始化資料庫

```bash
# 建立資料庫表格
npm run db:push

# 填入初始資料（賽事、公告）
npm run db:seed
```

### 4. 設定管理員

登入後，在 Neon 或 Prisma Studio 中將您的帳號 role 改為 `ADMIN`：

```bash
npm run db:studio
```
找到 User 資料表，將您的 role 從 `MEMBER` 改為 `ADMIN`。

### 5. 啟動開發伺服器

```bash
npm run dev
```

## OAuth 設定指南

### Google OAuth
1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 建立專案 → APIs & Services → Credentials → Create OAuth Client ID
3. 應用程式類型：Web application
4. 已授權的重新導向 URI：`http://localhost:3000/api/auth/callback/google`

### LINE Login
1. 前往 [LINE Developers](https://developers.line.biz)
2. 建立 Provider → Create a LINE Login channel
3. Callback URL：`http://localhost:3000/api/auth/callback/line`

### Facebook Login
1. 前往 [Facebook Developers](https://developers.facebook.com)
2. 建立應用程式 → Facebook Login
3. 有效的 OAuth 重新導向 URI：`http://localhost:3000/api/auth/callback/facebook`

## 銀行轉帳設定

在 `lib/utils.ts` 中修改 `BANK_INFO`：

```ts
export const BANK_INFO = {
  bankName: "臺灣銀行",
  bankCode: "004",
  accountNumber: "您的實際帳號",
  accountName: "中華台北羽球3對3發展協會",
};
```

## 報名費規則

| 會員資格 | 費用 |
|---------|------|
| 有效協會會員 | NT$ 200（固定，不限項數）|
| 新加入會員 | NT$ 700（年費500 + 報名費200）|
| 非會員（1項）| NT$ 450 |
| 非會員（2項）| NT$ 900 |

## 驗證規則

- 隊伍固定3人
- 身分證不能重複（同隊/同賽事）
- 年齡自動計算（不接受手動輸入）
- 總年齡 / 個人最低年齡依組別驗證
- 性別組合（男3P / 女3P / 混3P）自動驗證

## 部署到 Vercel

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入並部署
vercel

# 設定環境變數
vercel env add DATABASE_URL
vercel env add AUTH_SECRET
# ... 其他變數
```

## 資料庫 Schema

主要資料表：
- `User` - 登入帳號
- `Account` / `Session` - Auth.js 資料表
- `Member` - 協會會員資料
- `Event` - 賽事
- `EventGroup` - 比賽組別
- `Registration` - 報名記錄
- `RegistrationPlayer` - 選手資料
- `Payment` - 付款記錄
- `Announcement` - 公告
