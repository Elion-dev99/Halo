# Cloudflare Pages / Workers で動作確認する

独自サーバー・独自ドメインなしで、無料の `*.workers.dev` / `*.pages.dev` 上で Halo を確認できます。

フロントは Cloudflare、認証・DB はこれまでどおり **Firebase** です。

## 今回のエラーについて

ログに次が出る場合:

- `run wrangler deploy on a Pages project, wrangler pages deploy should be used`
- `Missing entry-point to Worker script or to assets directory`

**原因**: Cloudflare が `wrangler deploy` を実行しているのに、以前の `wrangler.toml` が Pages 専用（`pages_build_output_dir`）だけだったためです。

**修正**: `wrangler.toml` を Workers 静的アセット構成に変更済みです。

```toml
[assets]
directory = "./dist"
not_found_handling = "single-page-application"
```

この PR / ブランチをマージ（またはこのブランチで再デプロイ）してください。

---

## ダッシュボード設定（Workers & Pages）

### ビルド

| 項目 | 値 |
|------|-----|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy`（デフォルトのままで可） |
| Root directory | `/` |

> 「Build output directory」だけを使うクラシック Pages 接続の場合は `dist` を指定し、Deploy で wrangler を使わない設定でも動きます。  
> いまのエラーログは **wrangler deploy 経路** なので、上記の `wrangler.toml` 修正が必要です。

### 環境変数（Firebase）

Settings → Variables に本番用で追加:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`（任意）

変更後は必ず **再デプロイ** してください（ビルド時に Vite へ埋め込まれます）。

### Firebase Authorized domains

Authentication → Settings → Authorized domains に、公開ホストを追加:

- `halo-accounting.<account>.workers.dev` または表示されている `*.pages.dev` ホスト

```bash
npx firebase deploy --only firestore:rules
```

---

## ローカルからデプロイ

```bash
cp .env.example .env.local
# Firebase 値を記入

npm install
npm run build
npx wrangler login
npx wrangler deploy
```

または `npm run deploy:cf`

---

## 動作確認チェックリスト

1. 公開 URL が開く
2. `/login` や `/journals/new` を直接開いても 404 にならない
3. 新規登録・ログインができる
4. 仕訳転記 → 試算表に反映される

## トラブルシュート

| 症状 | 確認 |
|------|------|
| Missing entry-point / assets directory | この修正入りの `wrangler.toml` か。先に `npm run build` で `dist/` があるか |
| Missing Firebase env | Variables 未設定 or 再デプロイ忘れ |
| unauthorized-domain | Firebase Authorized domains に公開ホストを追加 |
| Firestore permission denied | rules 未デプロイ、または未ログイン |
