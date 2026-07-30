import type { Account, JournalLineInput } from "@/types/models";

export function toYenInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

export function validateJournalLines(
  lines: JournalLineInput[],
  accountsById: Map<string, Account>,
  options?: { allowInactiveAccounts?: boolean },
): string | null {
  const usable = lines.filter(
    (l) => l.accountId || l.debit > 0 || l.credit > 0 || l.memo.trim(),
  );

  if (usable.length < 2) {
    return "仕訳明細は2行以上必要です。";
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const [index, line] of usable.entries()) {
    const row = index + 1;
    const debit = toYenInt(line.debit);
    const credit = toYenInt(line.credit);

    if (!line.accountId) {
      return `${row}行目: 勘定科目を選択してください。`;
    }

    const account = accountsById.get(line.accountId);
    if (!account) {
      return `${row}行目: 勘定科目が見つかりません。`;
    }
    if (!account.isPostable) {
      return `${row}行目: 集計科目には仕訳できません。`;
    }
    if (!options?.allowInactiveAccounts && !account.isActive) {
      return `${row}行目: 無効な勘定科目です。`;
    }
    if (debit < 0 || credit < 0) {
      return `${row}行目: 金額は0以上である必要があります。`;
    }
    if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
      return `${row}行目: 借方または貸方のどちらか一方に金額を入力してください。`;
    }

    totalDebit += debit;
    totalCredit += credit;
  }

  if (totalDebit === 0 || totalCredit === 0) {
    return "借方・貸方の合計は0より大きい必要があります。";
  }
  if (totalDebit !== totalCredit) {
    return `貸借が一致しません（借方 ${totalDebit.toLocaleString()} / 貸方 ${totalCredit.toLocaleString()}）。`;
  }

  return null;
}

export function summarizeLines(lines: JournalLineInput[]) {
  return lines.reduce(
    (acc, line) => {
      acc.debit += toYenInt(line.debit);
      acc.credit += toYenInt(line.credit);
      return acc;
    },
    { debit: 0, credit: 0 },
  );
}

export function formatYen(amount: number): string {
  return `¥${toYenInt(amount).toLocaleString("ja-JP")}`;
}

export function downloadCsv(filename: string, rows: string[][]) {
  const escape = (cell: string) => `"${cell.replaceAll('"', '""')}"`;
  const body = rows.map((row) => row.map((c) => escape(String(c))).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
