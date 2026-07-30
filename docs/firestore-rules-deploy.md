# Firestore ルール公開手順

組織セットアップや設定・AR/AP で権限エラーになる場合:

1. Firebase Console → プロジェクト `halo-31be8`
2. Firestore Database → **ルール**
3. リポジトリの `firestore.rules` を貼り付けて **公開**
4. （任意）**インデックス** タブで `firestore.indexes.json` 相当の複合インデックスを作成
   - `emailInvites/{email}/items` の `status`
   - `organizations/{orgId}/invites` の `status`

ロール別の書き込み制限:
- owner / admin: 設定・メンバー・全マスタ/取引
- accountant: マスタ・仕訳・AR/AP（メンバー・組織設定の変更は不可）
- viewer: 読取のみ
