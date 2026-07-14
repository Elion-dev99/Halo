import { createJournalEntry } from "../../core/ledger/journal.js";
import { saveJournal } from "../../db/journalStore.js";
import { updateTrialBalance } from "../../core/ledger/trialBalance.js";

document.getElementById("save-journal").addEventListener("click", () => {
    const date = document.getElementById("je-date").value;
    const debitAccount = document.getElementById("je-debit-account").value;
    const debitAmount = Number(document.getElementById("je-debit-amount").value);
    const creditAccount = document.getElementById("je-credit-account").value;
    const creditAmount = Number(document.getElementById("je-credit-amount").value);

    const entry = createJournalEntry({
        date,
        debitAccount,
        debitAmount,
        creditAccount,
        creditAmount
    });

    saveJournal(entry);
    updateTrialBalance();

    console.log("保存完了:", entry);
});
