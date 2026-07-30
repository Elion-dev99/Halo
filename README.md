# Halo — 統合会計システム

Firebase Auth / Firestore をバックエンドにしたクラウド会計アプリです。  
現在は **会計コア全面改修** 中で、フロントエンドは React + TypeScript + Vite です。

設計・進捗は [`docs/WORKPLAN.md`](docs/WORKPLAN.md) を参照してください。

## セットアップ

### 前提

- Node.js 20+
- npm
- Firebase プロジェクト（Authentication の Email/Password を有効化）

### 手順

```bash
git clone https://github.com/Elion-dev99/Halo.git
cd Halo
npm install
cp .env.example .env.local
```

`.env.local` に Firebase 設定を記入します。

```bash
npm run dev
```

`http://localhost:3000` を開きます。

### ビルド

```bash
npm run build
npm run preview
```

GitHub Pages 向けビルドでは `VITE_BASE_PATH=/Halo/` を指定します（Actions で設定済み）。

### Firestore Rules

[`firestore.rules`](firestore.rules) を Firebase プロジェクトへデプロイしてください。

```bash
npx firebase deploy --only firestore:rules
```

## Stage 1 でできること

- ユーザー登録（同時に組織を 1 件作成）
- ログイン / ログアウト
- NetSuite 風サイドナビ付きアプリシェル
- ダッシュボード（組織情報の表示）
- 勘定科目・仕訳・レポート画面はプレースホルダ（Stage 2〜4）

## ドキュメント

| ファイル | 内容 |
|----------|------|
| [docs/WORKPLAN.md](docs/WORKPLAN.md) | 段階作業と確認ゲート |
| [docs/architecture.md](docs/architecture.md) | アーキテクチャ |
| [docs/data-model.md](docs/data-model.md) | Firestore データモデル |
| [docs/accounting-core-scope.md](docs/accounting-core-scope.md) | スコープ |
