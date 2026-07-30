# 秘密情報・API の設定場所

ワークフロー（`.github/workflows/*.yml`）の中には **API キー本体は書きません**。  
`${{ secrets.名前 }}` は「GitHub に登録した秘密情報を実行時に差し込む」ための参照です。

いまのデプロイ経路に応じて、設定場所が違います。

```
┌─────────────────────────────┐
│  A. Cloudflare ダッシュボード │  ← いま使っている経路（推奨）
│     Workers & Pages Variables │
└─────────────────────────────┘

┌─────────────────────────────┐
│  B. GitHub Actions Secrets    │  ← workflow 経由デプロイ用（任意）
│     Repository Secrets        │
└─────────────────────────────┘
```

---

## A. Cloudflare でデプロイしている場合（いまこちら）

Cloudflare が `npm run build` → `wrangler deploy` する構成です。  
**Firebase の値は Cloudflare 側に入れます。** GitHub Secrets は不要です。

### 手順

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → プロジェクト（例: `halo`）
2. **Settings** → **Variables and Secrets**（または Environment variables）
3. **Production**（必要なら Preview も）に次を追加（種類は Plaintext で可。機密扱いしたいなら Secret）:

| 変数名 | 例・取得元 |
|--------|------------|
| `VITE_FIREBASE_API_KEY` | Firebase Console → プロジェクト設定 → マイアプリ |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | プロジェクト ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` など |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | senderId |
| `VITE_FIREBASE_APP_ID` | appId |
| `VITE_FIREBASE_MEASUREMENT_ID` | 任意（Analytics） |

4. **Save** のあと **必ず再デプロイ**（変数はビルド時に Vite へ埋め込まれるため）
5. Firebase Console → Authentication → Settings → **Authorized domains** に Cloudflare のホストを追加

> Cloudflare の API Token は、ダッシュボード連携デプロイでは不要です。  
> GitHub Actions から Cloudflare へ推すときだけ `CLOUDFLARE_*` が必要です。

詳細: [cloudflare-pages.md](cloudflare-pages.md)

---

## B. GitHub Actions でデプロイする場合

Secrets 登録済みなら次で実行できます。

1. GitHub リポジトリ → **Actions**
2. 左の **Deploy to Cloudflare**
3. **Run workflow** → branch `main` → **Run workflow**
4. 緑になれば成功。URL 例: `https://halo.elion-dev08.workers.dev`

`main` への push でも自動実行されます（`deploy-cloudflare.yml`）。

対象ワークフロー:

- `.github/workflows/deploy-cloudflare.yml` → Cloudflare へデプロイ
- `.github/workflows/deploy.yml` → GitHub Pages へデプロイ

どちらも **Repository secrets** が必要です。未設定のまま push で動かさないよう、既定は手動実行（`workflow_dispatch`）にしてあります。

### 手順

1. GitHub リポジトリ → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
2. 下表を 1 件ずつ登録

#### Firebase（両ワークフロー共通）

| Secret 名 | 内容 |
|-----------|------|
| `VITE_FIREBASE_API_KEY` | Firebase API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | 任意 |

#### Cloudflare（`deploy-cloudflare.yml` のみ）

| Secret 名 | 内容 |
|-----------|------|
| `CLOUDFLARE_API_TOKEN` | [API Tokens](https://dash.cloudflare.com/profile/api-tokens) で作成。権限: Account → Cloudflare Workers / Pages Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Workers & Pages 右サイドまたは Overview の Account ID（例: `d45c6b81...`） |

3. **Actions** タブ → ワークフロー選択 → **Run workflow**

---

## ローカル開発

```bash
cp .env.example .env.local
# 同じ VITE_FIREBASE_* を記入（.env.local は git 管理外）
npm run dev
```

---

## よくある誤解

| 誤解 | 実際 |
|------|------|
| workflow YAML に API キーを書く | **書かない**（漏洩するため）。Secrets / Variables に置く |
| GitHub Secrets を入れれば Cloudflare ダッシュボードビルドも使える | **別物**。ダッシュボードビルドは Cloudflare Variables が必要 |
| 変数を追加しただけ | Vite は **ビルド時** に読む。追加後は再デプロイ必須 |
