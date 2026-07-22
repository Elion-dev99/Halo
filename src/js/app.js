import { watchAuthState, loginUser, registerUser, logoutUser } from "../services/authService.js";
import {
  createAccount,
  getAccounts,
  createJournalEntry,
  getJournalEntries,
  generateTrialBalance,
  generateIncomeStatement,
  generateBalanceSheet,
  ACCOUNT_TYPES,
  TRANSACTION_TYPES
} from "../services/accountingService.js";

// グローバル状態
let currentUser = null;
let accounts = [];

// DOM要素
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app-section");
const logoutBtn = document.getElementById("logout-btn");
const userNameDisplay = document.getElementById("user-name");

// 初期化
const initApp = async () => {
  watchAuthState(async (user) => {
    if (user) {
      currentUser = user;
      showAppInterface();
      accounts = await getAccounts(user.uid);
      displayAccounts();
      updateSelectOptions();
    } else {
      currentUser = null;
      showLoginInterface();
    }
  });
};

// ログインインターフェースを表示
const showLoginInterface = () => {
  loginSection.style.display = "flex";
  appSection.style.display = "none";
};

// アプリケーションインターフェースを表示
const showAppInterface = () => {
  loginSection.style.display = "none";
  appSection.style.display = "block";
  userNameDisplay.textContent = currentUser.displayName || currentUser.email;
};

// ログイン処理
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    await loginUser(email, password);
    loginForm.reset();
  } catch (error) {
    alert("ログイン失敗: " + error.message);
  }
});

// 登録処理
registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  const name = document.getElementById("register-name").value;
  const company = document.getElementById("register-company").value;

  try {
    await registerUser(email, password, { name, company });
    registerForm.reset();
    alert("登録完了しました。ログインしてください。");
  } catch (error) {
    alert("登録失敗: " + error.message);
  }
});

// ログアウト処理
logoutBtn?.addEventListener("click", async () => {
  try {
    await logoutUser();
  } catch (error) {
    alert("ログアウト失敗: " + error.message);
  }
});

// 勘定科目を表示
const displayAccounts = () => {
  const accountsList = document.getElementById("accounts-list");
  if (!accountsList) return;

  accountsList.innerHTML = "";
  accounts.forEach(account => {
    const item = document.createElement("div");
    item.className = "account-item";
    item.innerHTML = `
      <div class="account-info">
        <h3>${account.name}</h3>
        <p>種類: ${account.type}</p>
        <p>残高: ¥${account.balance?.toLocaleString() || 0}</p>
      </div>
    `;
    accountsList.appendChild(item);
  });
};

// セレクトボックスのオプションを更新
const updateSelectOptions = () => {
  const debitSelect = document.getElementById("debit-account");
  const creditSelect = document.getElementById("credit-account");
  
  if (!debitSelect || !creditSelect) return;

  // 既存のオプションをクリア（最初のプレースホルダーを除く）
  while (debitSelect.children.length > 1) {
    debitSelect.removeChild(debitSelect.lastChild);
  }
  while (creditSelect.children.length > 1) {
    creditSelect.removeChild(creditSelect.lastChild);
  }

  // 勘定科目をオプションとして追加
  accounts.forEach(account => {
    const option1 = document.createElement("option");
    option1.value = account.id;
    option1.textContent = `${account.name} (${account.type})`;
    debitSelect.appendChild(option1);

    const option2 = document.createElement("option");
    option2.value = account.id;
    option2.textContent = `${account.name} (${account.type})`;
    creditSelect.appendChild(option2);
  });
};

// 新しい勘定科目を追加
const addAccountForm = document.getElementById("add-account-form");
addAccountForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const name = document.getElementById("account-name").value;
  const type = document.getElementById("account-type").value;

  try {
    await createAccount(currentUser.uid, {
      name,
      type,
      code: Math.random().toString(36).substring(7)
    });
    accounts = await getAccounts(currentUser.uid);
    displayAccounts();
    updateSelectOptions();
    addAccountForm.reset();
  } catch (error) {
    alert("勘定科目追加失敗: " + error.message);
  }
});

// 仕訳を記録
const journalForm = document.getElementById("journal-form");
journalForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const description = document.getElementById("journal-description").value;
  const debitAccountId = document.getElementById("debit-account").value;
  const creditAccountId = document.getElementById("credit-account").value;
  const amount = parseFloat(document.getElementById("journal-amount").value);

  try {
    await createJournalEntry(currentUser.uid, {
      description,
      details: [
        {
          accountId: debitAccountId,
          type: TRANSACTION_TYPES.DEBIT,
          amount
        },
        {
          accountId: creditAccountId,
          type: TRANSACTION_TYPES.CREDIT,
          amount
        }
      ]
    });

    accounts = await getAccounts(currentUser.uid);
    displayAccounts();
    displayJournalEntries();
    journalForm.reset();
  } catch (error) {
    alert("仕訳記録失敗: " + error.message);
  }
});

// 仕訳一覧を表示
const displayJournalEntries = async () => {
  const journalsList = document.getElementById("journals-list");
  if (!journalsList) return;

  try {
    const journals = await getJournalEntries(currentUser.uid, 20);
    journalsList.innerHTML = "";

    journals.forEach(journal => {
      const item = document.createElement("div");
      item.className = "journal-item";
      const date = journal.date?.toDate?.() || new Date(journal.date);
      item.innerHTML = `
        <div class="journal-info">
          <p class="date">${date.toLocaleDateString()}</p>
          <p class="description">${journal.description}</p>
          <p class="details">
            ${journal.details.map(d => `${d.type}: ¥${d.amount}`).join(" / ")}
          </p>
        </div>
      `;
      journalsList.appendChild(item);
    });
  } catch (error) {
    console.error("仕訳一覧表示エラー:", error);
  }
};

// 試算表を表示
const showTrialBalance = async () => {
  try {
    const trialBalance = await generateTrialBalance(currentUser.uid);
    console.log("試算表:", trialBalance);
    alert("試算表をコンソールに出力しました");
  } catch (error) {
    alert("試算表生成失敗: " + error.message);
  }
};

// 損益計算書を表示
const showIncomeStatement = async () => {
  try {
    const statement = await generateIncomeStatement(currentUser.uid);
    alert(`損益計算書\n収益: ¥${statement.revenues}\n費用: ¥${statement.expenses}\n純利益: ¥${statement.netIncome}`);
  } catch (error) {
    alert("損益計算書生成失敗: " + error.message);
  }
};

// 貸借対照表を表示
const showBalanceSheet = async () => {
  try {
    const sheet = await generateBalanceSheet(currentUser.uid);
    alert(`貸借対照表\n資産: ¥${sheet.assets}\n負債: ¥${sheet.liabilities}\n資本: ¥${sheet.equity}`);
  } catch (error) {
    alert("貸借対照表生成失敗: " + error.message);
  }
};

// ボタンにイベントを割り当て
document.getElementById("trial-balance-btn")?.addEventListener("click", showTrialBalance);
document.getElementById("income-statement-btn")?.addEventListener("click", showIncomeStatement);
document.getElementById("balance-sheet-btn")?.addEventListener("click", showBalanceSheet);

// アプリケーション初期化
initApp();