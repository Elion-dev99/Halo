import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { listAccounts } from "@/services/accountService";
import { listPeriods } from "@/services/periodService";
import type {
  Account,
  AccountingPeriod,
  Journal,
  JournalLine,
  JournalLineInput,
  JournalStatus,
  JournalWithLines,
} from "@/types/models";
import {
  summarizeLines,
  toYenInt,
  validateJournalLines,
} from "@/utils/accounting";

function journalsCol(orgId: string) {
  return collection(db, "organizations", orgId, "journals");
}

function linesCol(orgId: string, journalId: string) {
  return collection(db, "organizations", orgId, "journals", journalId, "lines");
}

function mapJournal(id: string, data: Record<string, unknown>): Journal {
  return {
    id,
    date: data.date as string,
    memo: (data.memo as string) ?? "",
    status: data.status as JournalStatus,
    periodId: (data.periodId as string | null) ?? null,
    entryNumber: (data.entryNumber as string | null) ?? null,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    createdBy: data.createdBy as string,
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    postedAt: (data.postedAt as { toDate?: () => Date })?.toDate?.(),
    postedBy: data.postedBy as string | undefined,
    voidedAt: (data.voidedAt as { toDate?: () => Date })?.toDate?.(),
    voidedBy: data.voidedBy as string | undefined,
    voidReason: data.voidReason as string | undefined,
    totalDebit: Number(data.totalDebit ?? 0),
    totalCredit: Number(data.totalCredit ?? 0),
  };
}

function mapLine(id: string, data: Record<string, unknown>): JournalLine {
  return {
    id,
    lineNo: Number(data.lineNo ?? 0),
    accountId: data.accountId as string,
    debit: Number(data.debit ?? 0),
    credit: Number(data.credit ?? 0),
    memo: (data.memo as string) ?? "",
  };
}

function normalizeLines(lines: JournalLineInput[]): JournalLineInput[] {
  return lines
    .filter((l) => l.accountId || l.debit > 0 || l.credit > 0 || l.memo.trim())
    .map((l) => ({
      accountId: l.accountId,
      debit: toYenInt(l.debit),
      credit: toYenInt(l.credit),
      memo: l.memo.trim(),
    }));
}

export function findPeriodForDate(
  periods: AccountingPeriod[],
  date: string,
): AccountingPeriod | undefined {
  return periods.find((p) => p.startDate <= date && p.endDate >= date);
}

async function assertCanPost(
  orgId: string,
  date: string,
): Promise<AccountingPeriod> {
  const periods = await listPeriods(orgId);
  const period = findPeriodForDate(periods, date);
  if (!period) {
    throw new Error(`仕訳日 ${date} に対応する会計期間がありません。`);
  }
  if (period.status !== "open") {
    throw new Error(
      `会計期間 ${period.name} はクローズ済みのため転記できません。`,
    );
  }
  return period;
}

async function replaceLines(
  orgId: string,
  journalId: string,
  lines: JournalLineInput[],
) {
  const existing = await getDocs(linesCol(orgId, journalId));
  const batch = writeBatch(db);
  for (const d of existing.docs) {
    batch.delete(d.ref);
  }
  normalizeLines(lines).forEach((line, index) => {
    const ref = doc(linesCol(orgId, journalId));
    batch.set(ref, {
      lineNo: index + 1,
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
      memo: line.memo,
    });
  });
  await batch.commit();
}

export async function listJournals(orgId: string): Promise<Journal[]> {
  const snap = await getDocs(query(journalsCol(orgId), orderBy("date", "desc")));
  return snap.docs.map((d) => mapJournal(d.id, d.data()));
}

export async function listPostedJournals(orgId: string): Promise<Journal[]> {
  const snap = await getDocs(
    query(journalsCol(orgId), where("status", "==", "posted")),
  );
  return snap.docs
    .map((d) => mapJournal(d.id, d.data()))
    .sort((a, b) => a.date.localeCompare(b.date) || a.entryNumber?.localeCompare(b.entryNumber ?? "") || 0);
}

export async function getJournalLines(
  orgId: string,
  journalId: string,
): Promise<JournalLine[]> {
  const snap = await getDocs(query(linesCol(orgId, journalId), orderBy("lineNo")));
  return snap.docs.map((d) => mapLine(d.id, d.data()));
}

export async function getJournalWithLines(
  orgId: string,
  journalId: string,
): Promise<JournalWithLines | null> {
  const snap = await getDoc(doc(db, "organizations", orgId, "journals", journalId));
  if (!snap.exists()) return null;
  const lines = await getJournalLines(orgId, journalId);
  return { ...mapJournal(snap.id, snap.data()), lines };
}

export async function createDraftJournal(params: {
  orgId: string;
  uid: string;
  date: string;
  memo: string;
  lines: JournalLineInput[];
  accounts?: Account[];
}): Promise<string> {
  const accounts = params.accounts ?? (await listAccounts(params.orgId));
  const accountsById = new Map(accounts.map((a) => [a.id, a]));
  const lines = normalizeLines(params.lines);
  const error = validateJournalLines(lines, accountsById);
  if (error) throw new Error(error);

  const totals = summarizeLines(lines);
  const ref = doc(journalsCol(params.orgId));
  await setDoc(ref, {
    date: params.date,
    memo: params.memo.trim(),
    status: "draft",
    periodId: null,
    entryNumber: null,
    totalDebit: totals.debit,
    totalCredit: totals.credit,
    createdAt: serverTimestamp(),
    createdBy: params.uid,
    updatedAt: serverTimestamp(),
  });
  await replaceLines(params.orgId, ref.id, lines);
  return ref.id;
}

export async function updateDraftJournal(params: {
  orgId: string;
  journalId: string;
  date: string;
  memo: string;
  lines: JournalLineInput[];
  accounts?: Account[];
}): Promise<void> {
  const current = await getJournalWithLines(params.orgId, params.journalId);
  if (!current) throw new Error("仕訳が見つかりません。");
  if (current.status !== "draft") {
    throw new Error("下書き以外の仕訳は編集できません。");
  }

  const accounts = params.accounts ?? (await listAccounts(params.orgId));
  const accountsById = new Map(accounts.map((a) => [a.id, a]));
  const lines = normalizeLines(params.lines);
  const error = validateJournalLines(lines, accountsById);
  if (error) throw new Error(error);

  const totals = summarizeLines(lines);
  await updateDoc(doc(db, "organizations", params.orgId, "journals", params.journalId), {
    date: params.date,
    memo: params.memo.trim(),
    totalDebit: totals.debit,
    totalCredit: totals.credit,
    updatedAt: serverTimestamp(),
  });
  await replaceLines(params.orgId, params.journalId, lines);
}

export async function postJournal(params: {
  orgId: string;
  journalId: string;
  uid: string;
}): Promise<void> {
  const journal = await getJournalWithLines(params.orgId, params.journalId);
  if (!journal) throw new Error("仕訳が見つかりません。");
  if (journal.status !== "draft") {
    throw new Error("下書きのみ転記できます。");
  }

  const accounts = await listAccounts(params.orgId);
  const accountsById = new Map(accounts.map((a) => [a.id, a]));
  const error = validateJournalLines(journal.lines, accountsById);
  if (error) throw new Error(error);

  const period = await assertCanPost(params.orgId, journal.date);
  const year = journal.date.slice(0, 4);
  const seqRef = doc(db, "organizations", params.orgId, "meta", "sequences");

  await runTransaction(db, async (tx) => {
    const seqSnap = await tx.get(seqRef);
    const key = `journal-${year}`;
    const current = Number(seqSnap.data()?.[key] ?? 0) + 1;
    const entryNumber = `JE-${year}-${String(current).padStart(4, "0")}`;

    tx.set(
      seqRef,
      { [key]: current, updatedAt: serverTimestamp() },
      { merge: true },
    );
    tx.update(doc(db, "organizations", params.orgId, "journals", params.journalId), {
      status: "posted",
      periodId: period.id,
      entryNumber,
      postedAt: serverTimestamp(),
      postedBy: params.uid,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function createAndPostJournal(params: {
  orgId: string;
  uid: string;
  date: string;
  memo: string;
  lines: JournalLineInput[];
}): Promise<string> {
  const id = await createDraftJournal(params);
  await postJournal({ orgId: params.orgId, journalId: id, uid: params.uid });
  return id;
}

export async function voidJournal(params: {
  orgId: string;
  journalId: string;
  uid: string;
  reason?: string;
}): Promise<void> {
  const journal = await getJournalWithLines(params.orgId, params.journalId);
  if (!journal) throw new Error("仕訳が見つかりません。");
  if (journal.status === "void") {
    throw new Error("既に取消済みです。");
  }

  if (journal.status === "posted") {
    if (!journal.periodId) {
      throw new Error("転記済仕訳に期間が紐付いていません。");
    }
    const periodSnap = await getDoc(
      doc(db, "organizations", params.orgId, "periods", journal.periodId),
    );
    if (!periodSnap.exists()) throw new Error("会計期間が見つかりません。");
    if (periodSnap.data().status === "closed") {
      throw new Error(
        "クローズ済み期間の仕訳は取消できません。オープン期間へ訂正仕訳を起票してください。",
      );
    }
  }

  await updateDoc(doc(db, "organizations", params.orgId, "journals", params.journalId), {
    status: "void",
    voidedAt: serverTimestamp(),
    voidedBy: params.uid,
    voidReason: params.reason?.trim() || null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDraftJournal(
  orgId: string,
  journalId: string,
): Promise<void> {
  const journal = await getJournalWithLines(orgId, journalId);
  if (!journal) return;
  if (journal.status !== "draft") {
    throw new Error("下書きのみ削除できます。");
  }
  const lines = await getDocs(linesCol(orgId, journalId));
  const batch = writeBatch(db);
  for (const d of lines.docs) batch.delete(d.ref);
  batch.delete(doc(db, "organizations", orgId, "journals", journalId));
  await batch.commit();
}

/** レポート用: 転記済仕訳 + 明細 */
export async function listPostedJournalsWithLines(
  orgId: string,
): Promise<JournalWithLines[]> {
  const journals = await listPostedJournals(orgId);
  return Promise.all(
    journals.map(async (journal) => ({
      ...journal,
      lines: await getJournalLines(orgId, journal.id),
    })),
  );
}

export async function journalsTouchingAccount(
  orgId: string,
  accountId: string,
): Promise<JournalWithLines[]> {
  const all = await listPostedJournalsWithLines(orgId);
  return all.filter((j) => j.lines.some((l) => l.accountId === accountId));
}
