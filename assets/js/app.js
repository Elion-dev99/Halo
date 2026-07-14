// ==============================
// 必要な処理（装置）を読み込む
// ==============================
import { createJournalEntry } from "../../core/ledger/journal.js";   // 仕訳データを組み立てる装置
import { saveJournal } from "../../db/journalStore.js";              // IndexedDBに保存する装置
import { updateTrialBalance } from "../../core/ledger/trialBalance.js"; // 試算表を更新する装置

// =======================================
// 「仕訳を保存」ボタンが押された時の処理
// =======================================
document.getElementById("save-journal").addEventListener("click", () => {

    // -------------------------
    // 入力フォームから値を取得
    // -------------------------
    const date = document.getElementById("je-date").value;                     // 日付
    const debitAccount = document.getElementById("je-debit-account").value;    // 借方科目
    const debitAmount = Number(document.getElementById("je-debit-amount").value); // 借方金額
    const creditAccount = document.getElementById("je-credit-account").value;  // 貸方科目
    const creditAmount = Number(document.getElementById("je-credit-amount").value); // 貸方金額

    // ★ 空欄チェック（どれか1つでも空なら止める）
if (!date || !debitAccount || !creditAccount || !debitAmount || !creditAmount) {
    alert("未入力の項目があります");
    return; // ここで処理を止める
}
 
    // -----------------------------------------
    // 仕訳データを journal.js の形式に組み立て
    // -----------------------------------------
    const entry = createJournalEntry({
        date,
        debitAccount,
        debitAmount,
        creditAccount,
        creditAmount
    });

    // -------------------------
    // 仕訳を IndexedDB に保存
    // -------------------------
    saveJournal(entry);

    // -------------------------
    // 試算表を再計算して画面に反映
    // -------------------------
    updateTrialBalance();

    // -------------------------
    // デバッグ用ログ（保存された仕訳を確認）
    // -------------------------
    console.log("保存完了:", entry);
});
