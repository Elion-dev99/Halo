import { listAccounts } from "@/services/accountService";
import { listPostedJournalsWithLines } from "@/services/journalService";
import { listPeriods } from "@/services/periodService";
import type {
  Account,
  AccountingPeriod,
  AccountType,
  JournalWithLines,
  NormalBalance,
} from "@/types/models";

export interface AccountBalanceRow {
  account: Account;
  debit: number;
  credit: number;
  balance: number;
}

export interface LedgerEntry {
  date: string;
  entryNumber: string | null;
  journalId: string;
  memo: string;
  lineMemo: string;
  debit: number;
  credit: number;
  balance: number;
}

function inPeriod(date: string, period: AccountingPeriod): boolean {
  return period.startDate <= date && date <= period.endDate;
}

function signedBalance(
  debit: number,
  credit: number,
  normalBalance: NormalBalance,
): number {
  return normalBalance === "debit" ? debit - credit : credit - debit;
}

export async function loadReportContext(orgId: string) {
  const [accounts, periods, journals] = await Promise.all([
    listAccounts(orgId),
    listPeriods(orgId),
    listPostedJournalsWithLines(orgId),
  ]);
  return { accounts, periods, journals };
}

export function filterJournalsByPeriod(
  journals: JournalWithLines[],
  period: AccountingPeriod | null,
): JournalWithLines[] {
  if (!period) return journals;
  return journals.filter((j) => inPeriod(j.date, period));
}

/** 期末時点（期間終了日まで）の累計。BS用 */
export function filterJournalsThroughDate(
  journals: JournalWithLines[],
  endDate: string,
): JournalWithLines[] {
  return journals.filter((j) => j.date <= endDate);
}

export function aggregateAccountBalances(
  accounts: Account[],
  journals: JournalWithLines[],
): AccountBalanceRow[] {
  const map = new Map<string, { debit: number; credit: number }>();
  for (const account of accounts) {
    map.set(account.id, { debit: 0, credit: 0 });
  }

  for (const journal of journals) {
    for (const line of journal.lines) {
      const bucket = map.get(line.accountId);
      if (!bucket) continue;
      bucket.debit += line.debit;
      bucket.credit += line.credit;
    }
  }

  return accounts
    .filter((a) => a.isPostable)
    .map((account) => {
      const raw = map.get(account.id) ?? { debit: 0, credit: 0 };
      return {
        account,
        debit: raw.debit,
        credit: raw.credit,
        balance: signedBalance(raw.debit, raw.credit, account.normalBalance),
      };
    })
    .sort((a, b) => a.account.sortOrder - b.account.sortOrder);
}

export function buildTrialBalance(
  accounts: Account[],
  journals: JournalWithLines[],
): AccountBalanceRow[] {
  return aggregateAccountBalances(accounts, journals).filter(
    (row) => row.debit !== 0 || row.credit !== 0,
  );
}

export function buildIncomeStatement(
  accounts: Account[],
  journals: JournalWithLines[],
) {
  const rows = aggregateAccountBalances(accounts, journals);
  const byType = (type: AccountType) =>
    rows.filter((r) => r.account.type === type && r.balance !== 0);

  const revenues = byType("revenue");
  const expenses = byType("expense");
  const totalRevenue = revenues.reduce((s, r) => s + r.balance, 0);
  const totalExpense = expenses.reduce((s, r) => s + r.balance, 0);
  const netIncome = totalRevenue - totalExpense;

  return { revenues, expenses, totalRevenue, totalExpense, netIncome };
}

export function buildBalanceSheet(
  accounts: Account[],
  journalsThroughEnd: JournalWithLines[],
  periodJournals: JournalWithLines[],
) {
  const cumulative = aggregateAccountBalances(accounts, journalsThroughEnd);
  const pl = buildIncomeStatement(accounts, periodJournals);

  const section = (type: AccountType) =>
    cumulative.filter((r) => r.account.type === type && r.balance !== 0);

  const assets = section("asset");
  const liabilities = section("liability");
  const equity = section("equity");

  const totalAssets = assets.reduce((s, r) => s + r.balance, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.balance, 0);
  const totalEquityBook = equity.reduce((s, r) => s + r.balance, 0);
  const totalEquity = totalEquityBook + pl.netIncome;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const balanced = totalAssets === totalLiabilitiesAndEquity;

  return {
    assets,
    liabilities,
    equity,
    netIncome: pl.netIncome,
    totalAssets,
    totalLiabilities,
    totalEquityBook,
    totalEquity,
    totalLiabilitiesAndEquity,
    balanced,
  };
}

export function buildGeneralLedger(
  account: Account,
  journals: JournalWithLines[],
): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  let running = 0;

  const sorted = [...journals].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.entryNumber ?? "").localeCompare(b.entryNumber ?? ""),
  );

  for (const journal of sorted) {
    for (const line of journal.lines) {
      if (line.accountId !== account.id) continue;
      if (account.normalBalance === "debit") {
        running += line.debit - line.credit;
      } else {
        running += line.credit - line.debit;
      }
      entries.push({
        date: journal.date,
        entryNumber: journal.entryNumber,
        journalId: journal.id,
        memo: journal.memo,
        lineMemo: line.memo,
        debit: line.debit,
        credit: line.credit,
        balance: running,
      });
    }
  }

  return entries;
}
