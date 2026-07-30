# Halo 運用手順（わかりやすい版）

このページでは、次の 2 つだけを説明します。

1. **メンバー一覧が開けないとき**の直し方  
2. **システム開発・管理者用メニュー**の出し方（一般ユーザーには見えません）

---

## 1. メンバー一覧が失敗するとき

### なぜ起きるか
昔つくったメンバー情報に「状態（status）」が無いと、Firestore が読み取りを拒否します。

### やること（順番どおり）

#### ステップ A — Firestore ルールを公開する（必須）

1. ブラウザで [Firebase Console](https://console.firebase.google.com/) を開く  
2. プロジェクト **`halo-31be8`** を選ぶ  
3. 左メニュー **ビルド → Firestore Database**  
4. 上のタブ **ルール** を開く  
5. GitHub リポジトリのファイル  
   `firestore.rules`  
   の中身を **全部コピー** して、Console のルール欄に **貼り替え**  
6. **公開** ボタンを押す  
7. 「ルールを公開しました」と出たら OK  

#### ステップ B — アプリを再読み込み

1. Halo の画面を開く（例: `https://halo.elion-dev08.workers.dev`）  
2. **一度ログアウト → 再ログイン**（またはブラウザを強制再読み込み）  
3. 左メニュー **設定 → メンバーと権限** を開く  
4. 自分の名前が一覧に出ていれば成功  

#### ステップ C — まだ失敗する場合

1. 下の「2. システムメニュー」で `/sys` を開けるようにする  
2. `/sys` の **「現在組織のメンバーを補完」** を押す  
3. もう一度 **メンバーと権限** を開く  

---

## 2. システム開発・管理者用メニュー（隠し）

一般の利用者のメニューには **出ません**。  
管理者だけが、ロゴを特定の操作で開けます。

### 全体の流れ

```
① 自分を「管理者」として登録
　　↓
② アプリをデプロイ（①でメール方式を使った場合）
　　↓
③ ログインして、H ロゴを 5 回クリック
　　↓
④ /sys 画面が開く
```

---

### ① 自分を管理者にする（どちらか一方で OK）

### ① 自分を管理者にする（どちらか一方で OK）

#### 方法ア: `VITE_PLATFORM_ADMIN_EMAILS` を設定する

**いまの本番（Cloudflare）なら、ここに書きます ↓**

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) を開く  
2. **Workers & Pages** → プロジェクト **`halo`**  
3. **Settings** → **Variables and Secrets**（または Environment variables）  
4. **Add** で次を追加:

| Variable name | Value（例） | 種類 |
|---------------|-------------|------|
| `VITE_PLATFORM_ADMIN_EMAILS` | `your@email.com` | Plain text で OK |

5. **Save**  
6. **再デプロイ**する（Variables はビルド時に埋め込まれるため、保存だけでは反映されません）  
   - Cloudflare の **Deployments** から最新を Redeploy  
   - または GitHub の `main` に何か push / Actions の **Deploy to Cloudflare** を手動実行  

複数人: `a@x.com,b@y.com`（カンマ区切り・スペース可）  
※ **Halo にログインしているメールと完全一致**させてください。

---

**GitHub Actions だけでデプロイしている場合**はこちら:

1. GitHub リポジトリ → **Settings**  
2. **Secrets and variables** → **Actions**  
3. **New repository secret**  
4. Name: `VITE_PLATFORM_ADMIN_EMAILS`  
5. Secret: 自分のメール  
6. **Deploy to Cloudflare** ワークフローを再実行  

---

**ローカル開発だけ**の場合:

プロジェクト直下の `.env.local` に書く（git には上げない）:

```
VITE_PLATFORM_ADMIN_EMAILS=your@email.com
```

そのあと `npm run build` / `npm run dev`。

---

#### 方法イ（再デプロイ不要・おすすめの代替）: Firebase に直接書く

1. Firebase Console → Firestore → **データの開始**（またはデータ）  
2. コレクションを追加（まだ無ければ）  
   - コレクション ID: `platformAdmins`  
3. ドキュメント ID: **自分の Firebase Auth UID**  
   - UID の確認: Firebase Console → Authentication → ユーザー一覧  
4. フィールド例:

| フィールド | 型 | 値 |
|------------|-----|-----|
| `email` | string | 自分のメール |
| `disabled` | boolean | `false` |

5. 保存  

> 方法イだけでも `/sys` の解錠はできます。  
> 全組織一覧など一部機能は、方法イ（Firestore の `platformAdmins`）が必要です。

---

### ② アプリを最新にする

- PR をマージしたあと、Cloudflare のデプロイが終わるのを待つ  
- または手動でデプロイ  

（方法イだけの場合でも、ルール公開と最新フロントのデプロイは推奨）

---

### ③ 隠しメニューの開き方

1. Halo に **管理者メール** でログイン  
2. 左サイドバー（スマホなら ≡ メニュー）の **青い「H」ロゴ** を見る  
3. **2〜3 秒以内に、H を 5 回すばやくクリック**  
4. 画面が **System（システムコンソール）** に切り替わる  

成功すると、メニューの下のほうに小さな **`·`（点）** も出ます。  
次回からはその点をクリックしても `/sys` に行けます（ブラウザを閉じるまで有効）。

### 一般ユーザーにはどう見えるか

| 操作 | 一般ユーザー | 管理者 |
|------|--------------|--------|
| H ロゴを連打 | 何も起きない | `/sys` が開く |
| アドレスに `/sys` と入力 | ホームに戻される | （解錠後）コンソール表示 |
| サイドメニュー | いつもどおり | 解錠後だけ小さな `·` |

---

## 3. チェックリスト（印刷用）

- [ ] `firestore.rules` を Firebase で公開した  
- [ ] ログアウト → 再ログインした  
- [ ] 「メンバーと権限」で一覧が見える  
- [ ] （管理者）`VITE_PLATFORM_ADMIN_EMAILS` か `platformAdmins/{UID}` を設定した  
- [ ] （メール方式）再デプロイした  
- [ ] H ロゴを 5 回クリックして `/sys` が開いた  

困ったときは、エラーメッセージ（赤い文字）をそのまま控えて共有してください。
