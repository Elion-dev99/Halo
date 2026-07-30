# Halo — 統合会計システム

Firebase Auth / Firestore をバックエンドにしたクラウド会計アプリです。  
フロントエンドは React + TypeScript + Vite。会計コア（第1到達目標）まで実装済みです。

設計・進捗は [`docs/WORKPLAN.md`](docs/WORKPLAN.md) を参照してください。

## 動作確認（サーバーなし）

独自ドメインや VPS がなくても、**Cloudflare Pages** の無料 URL（`*.pages.dev`）で確認できます。

手順: [`docs/cloudflare-pages.md`](docs/cloudflare-pages.md)

```bash
npm run build
npx wrangler deploy
```

または Cloudflare ダッシュボードで GitHub リポジトリを接続してください。

## 機能（会計コア）

- 認証・組織作成（登録時）
- 勘定科目マスタ（初期科目セット付き）
- 会計期間（月次・オープン/クローズ）
- 仕訳（複数借方/貸方・下書き・転記・取消）
- 総勘定元帳 / 試算表 / 損益計算書 / 貸借対照表（CSV 出力）

## セットアップ

```bash
git clone https://github.com/Elion-dev99/Halo.git
cd Halo
npm install
cp .env.example .env.local
```

`.env.local` に Firebase 設定を記入し、`firestore.rules` をデプロイします。

```bash
npx firebase deploy --only firestore:rules
npm run dev
```

`http://localhost:3000` を開きます。

### ビルド

```bash
npm run build
```

GitHub Pages 向けは Actions で `VITE_BASE_PATH=/Halo/` と Firebase secrets を使用します。

## ドキュメント

| ファイル | 内容 |
|----------|------|
| [docs/WORKPLAN.md](docs/WORKPLAN.md) | 段階作業と確認ゲート |
| [docs/architecture.md](docs/architecture.md) | アーキテクチャ |
| [docs/data-model.md](docs/data-model.md) | Firestore データモデル |
| [docs/accounting-core-scope.md](docs/accounting-core-scope.md) | スコープ |
