document.getElementById("save-journal").addEventListener("click", () => {
    const date = document.getElementById("je-date").value;
    const debitAccount = document.getElementById("je-debit-account").value;
    const debitAmount = Number(document.getElementById("je-debit-amount").value);
    const creditAccount = document.getElementById("je-credit-account").value;
    const creditAmount = Number(document.getElementById("je-credit-amount").value);

    const entry = {
        id: Date.now(),
        date,
        debit: [{ account: debitAccount, amount: debitAmount }],
        credit: [{ account: creditAccount, amount: creditAmount }]
    };

    console.log("保存予定の仕訳:", entry);
});
