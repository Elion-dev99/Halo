# Halo アーキテクチャ（会計コア）

## 概要

Halo を Vanilla JS MVP から **React SPA + Firebase** に全面改修する。  
第1到達目標は会計コアのみ。AP/AR・在庫等は後続 Plan。

```
┌─────────────────────────────────────────────┐
│  React SPA (Vite + TypeScript)              │
│  React Router / 画面コンポーネント            │
│  services/（Firestore・Auth 呼び出し）         │
└──────────────────┬──────────────────────────┘
                   │ Firebase SDK
┌──────────────────▼──────────────────────────┐
│  Firebase Auth          Cloud Firestore     │
│  (email/password)       (組織単位データ)     │
│  Security Rules                             │
└─────────────────────────────────────────────┘
```

## 技術選定

| 層 | 選択 | 理由 |
|----|------|------|
| UI | React 18+ + TypeScript | 保守性・型安全・全面改修方針 |
| ビルド | Vite | 現行リポジトリ踏襲、高速 DX |
| ルーティング | React Router | SPA 標準 |
| 認証 | Firebase Authentication | 現行資産の継続 |
| DB | Cloud Firestore | 現行資産の継続、リアルタイム可 |
| デプロイ | **Cloudflare Pages**（動作確認用 `*.pages.dev`） / 任意で GitHub Pages | 独自サーバー不要 |

## ディレクトリ構成（Stage 1 以降の目標）

```
Halo/
├── docs/                    # 設計・作業マークダウン
├── firestore.rules          # セキュリティルール
├── package.json
├── vite.config.ts
├── index.html               # React エントリ（単一）
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── config/
    │   └── firebase.ts      # VITE_FIREBASE_* のみ
    ├── types/               # ドメイン型
    ├── services/            # Auth / Org / Account / Journal / Report
    ├── hooks/
    ├── components/
    │   ├── layout/          # AppShell, Sidebar, Header
    │   └── common/
    ├── pages/
    │   ├── LoginPage.tsx
    │   ├── RegisterPage.tsx
    │   ├── DashboardPage.tsx
    │   ├── AccountsPage.tsx
    │   ├── PeriodsPage.tsx
    │   ├── JournalsPage.tsx
    │   ├── JournalFormPage.tsx
    │   ├── GeneralLedgerPage.tsx
    │   ├── TrialBalancePage.tsx
    │   ├── IncomeStatementPage.tsx
    │   └── BalanceSheetPage.tsx
    └── styles/
```

## ルーティング（案）

| パス | 画面 | 認証 |
|------|------|------|
| `/login` | ログイン | 不要 |
| `/register` | 登録（組織作成含む） | 不要 |
| `/` | ダッシュボード | 必要 |
| `/accounts` | 勘定科目 | 必要 |
| `/periods` | 会計期間 | 必要 |
| `/journals` | 仕訳一覧 | 必要 |
| `/journals/new` | 仕訳入力 | 必要 |
| `/journals/:id` | 仕訳詳細 / 編集 | 必要 |
| `/reports/general-ledger` | 総勘定元帳 | 必要 |
| `/reports/trial-balance` | 試算表 | 必要 |
| `/reports/income-statement` | 損益計算書 | 必要 |
| `/reports/balance-sheet` | 貸借対照表 | 必要 |

## サービス境界

| サービス | 責務 |
|----------|------|
| `authService` | 登録・ログイン・ログアウト・セッション監視 |
| `orgService` | 組織作成、メンバー取得、現在組織コンテキスト |
| `periodService` | 会計期間 CRUD、open/close |
| `accountService` | 勘定科目 CRUD、初期科目セット投入 |
| `journalService` | 仕訳 CRUD、転記、void、一覧フィルタ |
| `reportService` | 総勘定元帳・試算表・PL・BS の集計（転記済のみ） |

**原則**: 残高は科目ドキュメントに保持しない。レポート・残高は `status === 'posted'` の仕訳明細から都度集計する（キャッシュが必要になったら後続で最適化）。

## 認証・マルチテナント

1. ユーザー登録時に `organizations/{orgId}` を 1 件作成し、作成者を `members/{uid}`（role: `owner`）に入れる
2. クライアントはログイン後、所属組織をコンテキストとして保持する
3. すべての会計データは `organizations/{orgId}/...` 配下
4. Firestore Rules: 認証済みかつ当該組織の `members` に存在する UID のみ読書き可

### ロール（Stage 0〜4 の最小）

| role | 権限 |
|------|------|
| `owner` | 全操作 |
| `admin` | マスタ・仕訳・レポート（組織削除以外） |
| `accountant` | 仕訳・レポート、科目の参照 |
| `viewer` | 参照のみ |

Stage 1〜2 では UI 上の細分化は最小限（全員 owner/admin 相当でも可）。Rules には role フィールドを持たせ、段階的に厳格化する。

## UI 方針

- NetSuite 風の **サイドナビ骨格**（モジュール一覧）を参考にする
- 会計コア画面のみ実装。他モジュールはナビに「準備中」または非表示
- 日本語 UI
- 既存の purple-gradient ダッシュボードは廃棄し、業務アプリとして落ち着いた業務 UI にする（Stage 1 でトークン定義）

## レガシー整理方針（Stage 1 で実施）

| 現行 | 方針 |
|------|------|
| `login.html` / `register.html` / `plan.html` | 削除。React ルートに一本化 |
| `assets/` の旧 JS/CSS | 参照が無くなれば削除。必要なら色味だけ `styles/` に移植 |
| `core/` / `db/` / `modules/` 空スタブ | 削除 |
| 旧 `src/services/*.js` / `src/js/app.js` | React 実装に置換後削除 |
| 課金プラン (`plan.html`) | 会計コア範囲外。削除して登録直後にアプリへ |

## 環境変数

`.env.local`（`.env.example` を踏襲）:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

CDN 直書きの Firebase config は禁止。

## Stage 1 で確定した項目

- デプロイ先: **Cloudflare Pages**（動作確認の主経路。`docs/cloudflare-pages.md`）／旧 GitHub Pages ワークフローも残置
- CSS アプローチ: **グローバル CSS 変数**（`src/styles/global.css`）
- パッケージマネージャ: **npm**
- レガシー: `login.html` / `register.html` / `plan.html` / `assets/` / `core/` / `db/` / `modules/` を削除し React に一本化
