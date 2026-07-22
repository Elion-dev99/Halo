# 🎯 Halo - 統合会計システム

統合会計システム Halo は、Firebase と Firestore を活用した現代的なクラウドベースの会計管理ツールです。

## 📋 機能

### 🔐 認証機能
- ユーザー登録
- メール・パスワードによるログイン
- ユーザー情報管理

### 📊 会計機能
- **勘定科目管理**: 資産、負債、資本、収益、費用の5種類の勘定科目を管理
- **仕訳記録**: 複式簿記による取引記録
- **試算表**: 勘定科目の残高確認
- **損益計算書**: 収益と費用から純利益を算出
- **貸借対照表**: 資産、負債、資本のバランス確認

### 💾 データベース
- Firebase Authentication による安全な認証
- Firestore による柔軟なデータ管理
- リアルタイムデータ同期

## 🚀 セットアップ

### 前提条件
- Node.js 16.0 以上
- npm または yarn

### インストール

1. リポジトリをクローン
```bash
git clone https://github.com/Elion-dev99/Halo.git
cd Halo
```

2. 依存パッケージをインストール
```bash
npm install
```

3. 環境変数を設定
```bash
cp .env.example .env.local
```

`.env.local` ファイルに Firebase の設定情報を入力してください：

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

4. 開発サーバーを起動
```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

## 📁 プロジェクト構造

```
Halo/
├── src/
│   ├── config/
│   │   └── firebase.js          # Firebase設定
│   ├── services/
│   │   ├── authService.js       # 認証関連の処理
│   │   └── accountingService.js # 会計処理
│   ├── js/
│   │   └── app.js              # メインアプリケーション
│   └── css/
│       └── style.css           # スタイル
├── index.html                   # メインHTML
├── package.json
├── vite.config.js
└── README.md
```

## 🔧 使用技術

- **フロントエンド**: HTML, CSS, Vanilla JavaScript
- **バックエンド**: Firebase (Authentication, Firestore, Storage)
- **ビルドツール**: Vite
- **その他**: Chart.js (グラフ表示用), date-fns (日付処理用)

## 📖 APIドキュメント

### 認証サービス (`authService.js`)

#### `registerUser(email, password, userData)`
新規ユーザーを登録します。

```javascript
await registerUser("user@example.com", "password123", {
  name: "山田太郎",
  company: "〇〇会社"
});
```

#### `loginUser(email, password)`
ユーザーをログインさせます。

```javascript
const user = await loginUser("user@example.com", "password123");
```

#### `logoutUser()`
ユーザーをログアウトさせます。

```javascript
await logoutUser();
```

### 会計サービス (`accountingService.js`)

#### `createAccount(userId, accountData)`
新しい勘定科目を作成します。

```javascript
await createAccount(userId, {
  name: "現金",
  type: "asset"
});
```

#### `createJournalEntry(userId, journalEntry)`
仕訳を記録します。

```javascript
await createJournalEntry(userId, {
  description: "現金で売上を受け取った",
  details: [
    { accountId: "account1", type: "debit", amount: 10000 },
    { accountId: "account2", type: "credit", amount: 10000 }
  ]
});
```

#### `generateTrialBalance(userId)`
試算表を生成します。

```javascript
const trialBalance = await generateTrialBalance(userId);
```

#### `generateIncomeStatement(userId)`
損益計算書を生成します。

```javascript
const statement = await generateIncomeStatement(userId);
console.log(statement);
// { revenues: 100000, expenses: 50000, netIncome: 50000 }
```

#### `generateBalanceSheet(userId)`
貸借対照表を生成します。

```javascript
const sheet = await generateBalanceSheet(userId);
console.log(sheet);
// { assets: 100000, liabilities: 40000, equity: 60000, totalLiabilitiesAndEquity: 100000 }
```

## 🔒 セキュリティに関する注意

⚠️ **重要**: Firebase の認証情報を public リポジトリに公開しないでください。

- `.env.local` ファイルは `.gitignore` に登録されています
- 本番環境では環境変数を安全に管理してください
- Firebase のセキュリティルールを適切に設定してください

## 📝 Firestore のスキーマ

### Users コレクション
```
users/
├── {uid}/
│   ├── email: string
│   ├── name: string
│   ├── company: string
│   ├── role: string
│   ├── department: string
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   ├── isActive: boolean
│   ├── accounts/ (subcollection)
│   │   └── {accountId}/
│   │       ├── name: string
│   │       ├── type: string (asset|liability|equity|revenue|expense)
│   │       ├── code: string
│   │       ├── balance: number
│   │       ├── createdAt: timestamp
│   │       └── updatedAt: timestamp
│   └── journals/ (subcollection)
│       └── {journalId}/
│           ├── description: string
│           ├── date: timestamp
│           ├── status: string (posted|draft)
│           ├── details: array
│           │   └── [
│           │       { accountId, type, amount }
│           │     ]
│           ├── createdAt: timestamp
│           └── updatedAt: timestamp
```

## 🛣️ 今後の予定

- [ ] 複数ユーザーでのコラボレーション機能
- [ ] PDFエクスポート機能
- [ ] グラフベースの財務分析
- [ ] モバイルアプリ化
- [ ] 税務計算機能
- [ ] 在庫管理機能
- [ ] 顧客・仕入先管理

## 🤝 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を説明してください。

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 💬 サポート

問題や質問がある場合は、[GitHubのissues](https://github.com/Elion-dev99/Halo/issues)で報告してください。

---

**作成者**: Elion-dev99  
**最終更新**: 2026年7月22日