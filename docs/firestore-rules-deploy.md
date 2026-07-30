# Firestore セキュリティルールの公開

組織セットアップで `Missing or insufficient permissions` が出る場合、  
ほぼ確実に **Firestore ルールが未公開**、または古いルールのままです。

## 手順（コンソール）

1. [Firebase Console](https://console.firebase.google.com/) → プロジェクト **halo-31be8**
2. 左メニュー **Firestore Database**
3. 上タブ **ルール**
4. リポジトリの [`firestore.rules`](../firestore.rules) の内容を **すべてコピーして貼り付け**
5. **公開** を押す
6. Halo の画面で組織セットアップを再実行

## CLI の場合

```bash
npx firebase login
npx firebase use halo-31be8
npx firebase deploy --only firestore:rules
```

`firebase.json` はリポジトリに含まれています。
