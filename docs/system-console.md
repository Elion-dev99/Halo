# システム開発・運用コンソール（隠し）

一般利用者のサイドメニューには表示しません。

## アクセス方法

1. 自分をプラットフォーム管理者にする（どちらか）
   - **Env**: `VITE_PLATFORM_ADMIN_EMAILS=your@email.com` を設定して再ビルド／再デプロイ
   - **Firestore**: `platformAdmins/{あなたのUID}` ドキュメントを Console で作成  
     ```
     { "email": "your@email.com", "disabled": false }
     ```
2. ログイン後、サイドバーの **H ロゴを 2.5 秒以内に 5 回クリック**
3. `/sys` が開き、フッター付近に控えめな `·` リンクが出ます（解錠はセッション単位）

非管理者はロゴを連打しても無反応です。`/sys` 直打ちもホームへリダイレクトされます。

## メンバー一覧が失敗する場合

旧メンバー doc に `status` が無いと、古いルールだと permission-denied になります。

1. リポジトリの最新 `firestore.rules` を Firebase Console で **公開**
2. ページを再読み込み（ログイン時に自分の `status` を自動補完）
3. まだ駄目なら `/sys` → 「現在組織のメンバーを補完」
