# Cloudflare Pages で動作確認する

独自サーバー・独自ドメインなしで、無料の `*.pages.dev` 上で Halo を確認できます。

フロントは Cloudflare Pages、認証・DB はこれまでどおり **Firebase** です。

## いちばん簡単な方法（ダッシュボード）

### 1. Cloudflare アカウント

1. [Cloudflare](https://dash.cloudflare.com/sign-up) に無料登録
2. 左メニュー **Workers & Pages** を開く

### 2. GitHub リポジトリを接続

1. **Create** → **Pages** → **Connect to Git**
2. `Elion-dev99/Halo` を選択（未連携なら GitHub を Authorize）
3. ビルド設定:

| 項目 | 値 |
|------|-----|
| Framework preset | `None` / Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/`（そのまま） |
| Production branch | `main` |

### 3. 環境変数（Firebase）

Cloudflare Pages の **Settings → Environment variables** に、本番（Production）へ次を追加します（`.env.example` と同じキー）:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`（任意）

必要なら `VITE_BASE_PATH=/` も明示（省略時も `/`）。

保存後、**Retry deployment** で再ビルドしてください。

### 4. 公開 URL

デプロイ完了後:

`https://halo-accounting.pages.dev`  
（プロジェクト名によって変わります。Workers & Pages のプロジェクト画面に表示）

独自ドメインは後から Settings → Custom domains で追加できます。今は不要です。

### 5. Firebase 側の許可

Firebase Console → Authentication → Settings → **Authorized domains** に、Pages のホストを追加します。

例:

- `halo-accounting.pages.dev`
- プレビュー用があれば `*.pages.dev` 相当のホスト（表示されているホスト名をそのまま追加）

あわせて `firestore.rules` をデプロイ済みであること:

```bash
npx firebase deploy --only firestore:rules
```

---

## 代替: GitHub Actions（自動デプロイ）

リポジトリに [`.github/workflows/deploy-cloudflare.yml`](../.github/workflows/deploy-cloudflare.yml) があります。

### GitHub Secrets

Repository → Settings → Secrets and variables → Actions:

| Secret | 内容 |
|--------|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token（Pages Edit 権限） |
| `CLOUDFLARE_ACCOUNT_ID` | アカウント ID（Workers & Pages 右サイド） |
| `VITE_FIREBASE_*` | 上記と同じ Firebase 変数一式 |

### API Token の作り方

1. Cloudflare → My Profile → API Tokens → Create Token
2. テンプレート **Edit Cloudflare Workers** を使うか、カスタムで:
   - Account → Cloudflare Pages → Edit
   - Account → Account Settings → Read（必要に応じて）
3. 生成したトークンを `CLOUDFLARE_API_TOKEN` に保存

初回は Cloudflare 側に Pages プロジェクト `halo-accounting` が無い場合、ダッシュボードで同名プロジェクトを先に作るか、Actions 実行時に Wrangler が作成します。

`main` への push で自動デプロイされます。

---

## 代替: ローカルから Wrangler で直接アップロード

```bash
cp .env.example .env.local
# Firebase 値を記入

npm install
npm run build
npx wrangler login
npx wrangler pages deploy dist --project-name=halo-accounting
```

または:

```bash
npm run deploy:cf
```

---

## 動作確認チェックリスト

1. `https://<project>.pages.dev` が開く
2. `/login` や `/journals/new` を直接開いても 404 にならない（SPA `_redirects`）
3. 新規登録・ログインができる（Firebase Authorized domains 設定済み）
4. 勘定科目・期間がシードされている
5. 仕訳転記 → 試算表に反映される

## トラブルシュート

| 症状 | 確認 |
|------|------|
| 真っ白 / Missing Firebase env | Pages の Environment variables 未設定 or 再デプロイ忘れ |
| ログインできない / unauthorized-domain | Firebase Authorized domains に pages.dev を追加 |
| リロードで 404 | `public/_redirects` がビルド成果物に含まれているか（`dist/_redirects`） |
| Firestore permission denied | `firestore.rules` 未デプロイ、または未ログイン |
