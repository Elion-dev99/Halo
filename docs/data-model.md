# Halo データモデル（会計コア）

## 設計方針

- **組織（company）単位のマルチテナント**。ユーザー個人直下に会計データを置かない
- 仕訳はヘッダ + 明細。明細はサブコレクション
- **残高の正**: 転記済（`posted`）仕訳明細の集計。勘定科目ドキュメントに累計残高を持たない
- 金額は整数の **円（JPY）** のみ（多通貨は範囲外）
- 日時は ISO 8601 文字列または Firestore `Timestamp`（実装時に統一。推奨: `Timestamp`）

## コレクション一覧

```
users/{uid}
organizations/{orgId}
organizations/{orgId}/members/{uid}
organizations/{orgId}/periods/{periodId}
organizations/{orgId}/accounts/{accountId}
organizations/{orgId}/journals/{journalId}
organizations/{orgId}/journals/{journalId}/lines/{lineId}
```

---

## `users/{uid}`

Firebase Auth の UID と 1:1。プロフィールと所属組織のポインタ。

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| email | string | ✓ | Auth と同期 |
| displayName | string | ✓ | 表示名 |
| defaultOrgId | string | ✓ | 主に使う組織 |
| createdAt | timestamp | ✓ | |
| updatedAt | timestamp | ✓ | |

旧モデルの `plan` / `company` 文字列直書きは廃止。会社情報は `organizations` へ。

---

## `organizations/{orgId}`

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| name | string | ✓ | 会社名 |
| fiscalYearStartMonth | number | ✓ | 会計年度開始月（1–12）。初期値 4 |
| currency | string | ✓ | 固定 `"JPY"` |
| createdAt | timestamp | ✓ | |
| createdBy | string | ✓ | uid |
| updatedAt | timestamp | ✓ | |

---

## `organizations/{orgId}/members/{uid}`

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| role | string | ✓ | `owner` \| `admin` \| `accountant` \| `viewer` |
| displayName | string | | 組織内表示名 |
| joinedAt | timestamp | ✓ | |

Security Rules のメンバー判定に使用する。

---

## `organizations/{orgId}/periods/{periodId}`

会計期間（月次を想定。四半期・年次は表示上の集約で対応可能）。

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| name | string | ✓ | 例: `2026-04` |
| startDate | string | ✓ | `YYYY-MM-DD` |
| endDate | string | ✓ | `YYYY-MM-DD` |
| status | string | ✓ | `open` \| `closed` |
| createdAt | timestamp | ✓ | |
| closedAt | timestamp | | クローズ時 |
| closedBy | string | | uid |

### 期間ルール

- 仕訳の転記時、仕訳日が含まれる `open` 期間を `periodId` に設定する
- `closed` 期間への **新規転記・転記済の編集は禁止**
- クローズ済み期間の仕訳を訂正する場合は、**取消（void）+ オープン期間への逆仕訳 / 訂正仕訳**（Stage 3 で実装）
- 下書き（`draft`）は期間未確定でも可。転記時に期間を確定

---

## `organizations/{orgId}/accounts/{accountId}`

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| code | string | ✓ | 科目コード。組織内ユニーク |
| name | string | ✓ | 科目名 |
| type | string | ✓ | 下記タイプ |
| normalBalance | string | ✓ | `debit` \| `credit` |
| parentId | string \| null | | 親科目。階層用 |
| isPostable | boolean | ✓ | false なら集計科目（仕訳不可） |
| isActive | boolean | ✓ | 無効時は新規仕訳に選べない |
| sortOrder | number | | 表示順 |
| createdAt | timestamp | ✓ | |
| updatedAt | timestamp | ✓ | |

### 勘定科目タイプ

| type | 日本語 | 正規残高（default） | 財務諸表 |
|------|--------|---------------------|----------|
| `asset` | 資産 | debit | BS |
| `liability` | 負債 | credit | BS |
| `equity` | 純資産 | credit | BS |
| `revenue` | 収益 | credit | PL |
| `expense` | 費用 | debit | PL |

旧 MVP の `capital` は `equity` に統一する。

### 初期科目セット（案・日本の基本）

Stage 2 でシード。例:

| code | name | type |
|------|------|------|
| 1000 | 現金 | asset |
| 1010 | 普通預金 | asset |
| 1100 | 売掛金 | asset |
| 1200 | 商品 | asset |
| 1500 | 建物 | asset |
| 2000 | 買掛金 | liability |
| 2100 | 未払金 | liability |
| 2200 | 借入金 | liability |
| 3000 | 資本金 | equity |
| 3100 | 繰越利益剰余金 | equity |
| 4000 | 売上高 | revenue |
| 5000 | 売上原価 | expense |
| 5100 | 給料手当 | expense |
| 5200 | 地代家賃 | expense |
| 5300 | 水道光熱費 | expense |
| 5400 | 通信費 | expense |
| 5900 | 雑費 | expense |

（最終リストは Stage 2 確認時に調整可）

---

## `organizations/{orgId}/journals/{journalId}`

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| date | string | ✓ | 仕訳日 `YYYY-MM-DD` |
| memo | string | | 摘要 |
| status | string | ✓ | `draft` \| `posted` \| `void` |
| periodId | string \| null | | 転記時に設定 |
| entryNumber | string \| null | | 転記時に採番（例: `JE-2026-0001`） |
| createdAt | timestamp | ✓ | |
| createdBy | string | ✓ | uid |
| updatedAt | timestamp | ✓ | |
| postedAt | timestamp | | |
| postedBy | string | | |
| voidedAt | timestamp | | |
| voidedBy | string | | |
| voidReason | string | | |

### ステータス遷移

```
draft ──post──► posted ──void──► void
  │                               ▲
  └──────────void（未転記破棄）───┘  ※ draft の void は削除扱いにしてもよい
```

- `posted` → 内容編集不可。訂正は void のうえ新規仕訳
- `void` は集計対象外
- レポートは `posted` のみ

---

## `organizations/{orgId}/journals/{journalId}/lines/{lineId}`

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| lineNo | number | ✓ | 表示順 1..n |
| accountId | string | ✓ | 仕訳可能科目 |
| debit | number | ✓ | 円。0 以上の整数 |
| credit | number | ✓ | 円。0 以上の整数 |
| memo | string | | 行摘要 |

### 明細バリデーション

- 各行: `(debit > 0) XOR (credit > 0)`（両方 > 0 や両方 0 は不可）
- 仕訳全体: `sum(debit) === sum(credit)` かつ合計 > 0
- 最低 2 行
- `isPostable === true` かつ `isActive === true` の科目のみ

---

## 集計ロジック（論理）

科目残高（期間内）:

```
rawDebit  = sum(posted lines.debit  for account)
rawCredit = sum(posted lines.credit for account)

if normalBalance === 'debit':
  balance = rawDebit - rawCredit
else:
  balance = rawCredit - rawDebit
```

- **試算表**: 全 postable 科目の rawDebit / rawCredit（または balance）
- **PL**: revenue・expense の期間残高から当期純利益
- **BS**: asset・liability・equity + 当期純利益の反映
- **総勘定元帳**: 科目 × 期間の posted 明細を日付順 + ランニング残高

---

## 旧データとの関係

現行 `users/{uid}/accounts`・`users/{uid}/journals` は **移行対象外**（全面改修・破壊的変更）。  
必要なら後でワンショット移行スクリプトを別途検討する。Stage 0〜4 では新モデルのみ。

## Security Rules（骨子）

```
match /organizations/{orgId}/{document=**} {
  allow read, write: if request.auth != null
    && exists(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid));
}
```

細かい role 制限は Stage 1〜2 で段階的に追加。
