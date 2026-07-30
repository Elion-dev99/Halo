import type { Account, JournalLineInput, JournalStatus } from "@/types/models";

export type JournalSide = "debit" | "credit";

export interface JournalDraft {
  date: string;
  memo: string;
  lines: JournalLineInput[];
}

export function createEmptyLine(): JournalLineInput {
  return { accountId: "", debit: 0, credit: 0, memo: "" };
}

export function createInitialDraft(date = todayISO()): JournalDraft {
  return {
    date,
    memo: "",
    lines: [createEmptyLine(), createEmptyLine()],
  };
}

export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 入力値を円の非負整数へ正規化 */
export function parseAmount(value: string | number): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) return 0;
    return Math.round(value);
  }
  const cleaned = value.replace(/[,\s円¥]/g, "").trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

export function setLineAmount(
  line: JournalLineInput,
  side: JournalSide,
  raw: string | number,
): JournalLineInput {
  const amount = parseAmount(raw);
  if (side === "debit") {
    return { ...line, debit: amount, credit: amount > 0 ? 0 : line.credit };
  }
  return { ...line, credit: amount, debit: amount > 0 ? 0 : line.debit };
}

export function isLineBlank(line: JournalLineInput): boolean {
  return !line.accountId && line.debit === 0 && line.credit === 0 && !line.memo.trim();
}

/**
 * 保存用に明細を正規化。
 * - 空行除去
 * - 金額を整数化
 * - 借方・貸方の同時入力は大きい方を優先（通常UIでは起きない）
 */
export function normalizeLines(lines: JournalLineInput[]): JournalLineInput[] {
  return lines
    .filter((line) => !isLineBlank(line))
    .map((line) => {
      let debit = parseAmount(line.debit);
      let credit = parseAmount(line.credit);
      if (debit > 0 && credit > 0) {
        if (debit >= credit) credit = 0;
        else debit = 0;
      }
      return {
        accountId: line.accountId.trim(),
        debit,
        credit,
        memo: line.memo.trim(),
      };
    });
}

export function summarizeLines(lines: JournalLineInput[]): {
  debit: number;
  credit: number;
  difference: number;
  balanced: boolean;
} {
  const normalized = normalizeLines(lines);
  const debit = normalized.reduce((s, l) => s + l.debit, 0);
  const credit = normalized.reduce((s, l) => s + l.credit, 0);
  return {
    debit,
    credit,
    difference: debit - credit,
    balanced: debit === credit && debit > 0,
  };
}

export function validateJournalDraft(
  draft: JournalDraft,
  accountsById: Map<string, Account>,
  options?: { allowInactiveAccounts?: boolean },
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
    return "仕訳日の形式が不正です。";
  }

  const lines = normalizeLines(draft.lines);
  if (lines.length < 2) {
    return "仕訳明細は2行以上必要です。";
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const row = i + 1;
    const line = lines[i]!;
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
    if (line.debit < 0 || line.credit < 0) {
      return `${row}行目: 金額は0以上である必要があります。`;
    }
    if ((line.debit > 0 && line.credit > 0) || (line.debit === 0 && line.credit === 0)) {
      return `${row}行目: 借方または貸方のどちらか一方に金額を入力してください。`;
    }
    totalDebit += line.debit;
    totalCredit += line.credit;
  }

  if (totalDebit === 0 || totalCredit === 0) {
    return "借方・貸方の合計は0より大きい必要があります。";
  }
  if (totalDebit !== totalCredit) {
    return `貸借が一致しません（借方 ${totalDebit.toLocaleString()} / 貸方 ${totalCredit.toLocaleString()}）。`;
  }
  return null;
}

export function canEditJournal(status: JournalStatus): boolean {
  return status === "draft";
}

export function canPostJournal(status: JournalStatus): boolean {
  return status === "draft";
}

export function canVoidJournal(status: JournalStatus): boolean {
  return status === "draft" || status === "posted";
}

export function canDeleteJournal(status: JournalStatus): boolean {
  return status === "draft";
}

export function formatYen(amount: number): string {
  return `¥${parseAmount(amount).toLocaleString("ja-JP")}`;
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
