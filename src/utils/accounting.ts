import type { Account, JournalLineInput } from "@/types/models";
import {
  formatYen,
  normalizeLines,
  parseAmount,
  summarizeLines,
  validateJournalDraft,
  downloadCsv,
} from "@/domain/journalEngine";

/** @deprecated Prefer domain/journalEngine — kept for existing imports */
export function toYenInt(value: number): number {
  return parseAmount(value);
}

export function validateJournalLines(
  lines: JournalLineInput[],
  accountsById: Map<string, Account>,
  options?: { allowInactiveAccounts?: boolean },
): string | null {
  return validateJournalDraft(
    { date: "2000-01-01", memo: "", lines },
    accountsById,
    options,
  );
}

export { summarizeLines, formatYen, downloadCsv, normalizeLines };
