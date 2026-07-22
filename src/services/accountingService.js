import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  runTransaction
} from "firebase/firestore";
import { db } from "../config/firebase.js";

/**
 * 勘定科目の種類
 */
export const ACCOUNT_TYPES = {
  ASSET: "asset",           // 資産
  LIABILITY: "liability",   // 負債
  EQUITY: "equity",         // 資本
  REVENUE: "revenue",       // 収益
  EXPENSE: "expense"        // 費用
};

/**
 * 取引の種類
 */
export const TRANSACTION_TYPES = {
  DEBIT: "debit",           // 借方
  CREDIT: "credit"          // 貸方
};

/**
 * 勘定科目を作成
 * @param {string} userId - ユーザーID
 * @param {Object} accountData - 勘定科目のデータ
 */
export const createAccount = async (userId, accountData) => {
  try {
    const accountsRef = collection(db, "users", userId, "accounts");
    const docRef = await addDoc(accountsRef, {
      ...accountData,
      createdAt: new Date(),
      updatedAt: new Date(),
      balance: 0
    });
    return { id: docRef.id, ...accountData };
  } catch (error) {
    console.error("Error creating account:", error);
    throw error;
  }
};

/**
 * 勘定科目を取得
 * @param {string} userId - ユーザーID
 */
export const getAccounts = async (userId) => {
  try {
    const accountsRef = collection(db, "users", userId, "accounts");
    const q = query(accountsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting accounts:", error);
    throw error;
  }
};

/**
 * 取引を記録（仕訳）
 * @param {string} userId - ユーザーID
 * @param {Object} journalEntry - 仕訳データ
 */
export const createJournalEntry = async (userId, journalEntry) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const journalsRef = collection(db, "users", userId, "journals");
      const journalDocRef = await addDoc(journalsRef, {
        ...journalEntry,
        date: journalEntry.date || new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "posted"
      });

      // 対象勘定科目の残高を更新
      for (const detail of journalEntry.details) {
        const accountRef = doc(db, "users", userId, "accounts", detail.accountId);
        const accountDoc = await transaction.get(accountRef);
        const currentBalance = accountDoc.data().balance || 0;

        let newBalance = currentBalance;
        if (detail.type === TRANSACTION_TYPES.DEBIT) {
          newBalance += detail.amount;
        } else {
          newBalance -= detail.amount;
        }

        transaction.update(accountRef, { balance: newBalance });
      }

      return { id: journalDocRef.id, ...journalEntry };
    });
  } catch (error) {
    console.error("Error creating journal entry:", error);
    throw error;
  }
};

/**
 * 取引一覧を取得
 * @param {string} userId - ユーザーID
 * @param {number} limitCount - 取得件数
 */
export const getJournalEntries = async (userId, limitCount = 50) => {
  try {
    const journalsRef = collection(db, "users", userId, "journals");
    const q = query(journalsRef, orderBy("date", "desc"), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting journal entries:", error);
    throw error;
  }
};

/**
 * 期間内の取引を取得
 * @param {string} userId - ユーザーID
 * @param {Date} startDate - 開始日
 * @param {Date} endDate - 終了日
 */
export const getJournalEntriesByDateRange = async (userId, startDate, endDate) => {
  try {
    const journalsRef = collection(db, "users", userId, "journals");
    const q = query(
      journalsRef,
      where("date", ">=", Timestamp.fromDate(startDate)),
      where("date", "<=", Timestamp.fromDate(endDate)),
      orderBy("date", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting journal entries by date range:", error);
    throw error;
  }
};

/**
 * 取引を更新
 * @param {string} userId - ユーザーID
 * @param {string} journalId - 仕訳ID
 * @param {Object} updates - 更新データ
 */
export const updateJournalEntry = async (userId, journalId, updates) => {
  try {
    const journalRef = doc(db, "users", userId, "journals", journalId);
    await updateDoc(journalRef, {
      ...updates,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error("Error updating journal entry:", error);
    throw error;
  }
};

/**
 * 取引を削除
 * @param {string} userId - ユーザーID
 * @param {string} journalId - 仕訳ID
 */
export const deleteJournalEntry = async (userId, journalId) => {
  try {
    const journalRef = doc(db, "users", userId, "journals", journalId);
    await deleteDoc(journalRef);
  } catch (error) {
    console.error("Error deleting journal entry:", error);
    throw error;
  }
};

/**
 * 試算表を生成
 * @param {string} userId - ユーザーID
 */
export const generateTrialBalance = async (userId) => {
  try {
    const accounts = await getAccounts(userId);
    const trialBalance = {};

    accounts.forEach(account => {
      trialBalance[account.id] = {
        name: account.name,
        type: account.type,
        debit: account.type === ACCOUNT_TYPES.ASSET || account.type === ACCOUNT_TYPES.EXPENSE ? account.balance : 0,
        credit: account.type === ACCOUNT_TYPES.LIABILITY || account.type === ACCOUNT_TYPES.EQUITY || account.type === ACCOUNT_TYPES.REVENUE ? account.balance : 0
      };
    });

    return trialBalance;
  } catch (error) {
    console.error("Error generating trial balance:", error);
    throw error;
  }
};

/**
 * 損益計算書を生成
 * @param {string} userId - ユーザーID
 */
export const generateIncomeStatement = async (userId) => {
  try {
    const accounts = await getAccounts(userId);
    
    const revenues = accounts
      .filter(a => a.type === ACCOUNT_TYPES.REVENUE)
      .reduce((sum, a) => sum + a.balance, 0);

    const expenses = accounts
      .filter(a => a.type === ACCOUNT_TYPES.EXPENSE)
      .reduce((sum, a) => sum + a.balance, 0);

    const netIncome = revenues - expenses;

    return {
      revenues,
      expenses,
      netIncome
    };
  } catch (error) {
    console.error("Error generating income statement:", error);
    throw error;
  }
};

/**
 * 貸借対照表を生成
 * @param {string} userId - ユーザーID
 */
export const generateBalanceSheet = async (userId) => {
  try {
    const accounts = await getAccounts(userId);

    const assets = accounts
      .filter(a => a.type === ACCOUNT_TYPES.ASSET)
      .reduce((sum, a) => sum + a.balance, 0);

    const liabilities = accounts
      .filter(a => a.type === ACCOUNT_TYPES.LIABILITY)
      .reduce((sum, a) => sum + a.balance, 0);

    const equity = accounts
      .filter(a => a.type === ACCOUNT_TYPES.EQUITY)
      .reduce((sum, a) => sum + a.balance, 0);

    return {
      assets,
      liabilities,
      equity,
      totalLiabilitiesAndEquity: liabilities + equity
    };
  } catch (error) {
    console.error("Error generating balance sheet:", error);
    throw error;
  }
};