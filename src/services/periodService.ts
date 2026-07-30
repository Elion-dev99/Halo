import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type WriteBatch,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import type { AccountingPeriod, PeriodStatus } from "@/types/models";
import {
  buildFiscalYearMonths,
  fiscalYearStartYearForDate,
  type MonthPeriodDraft,
} from "@/utils/dates";

function periodsCol(orgId: string) {
  return collection(db, "organizations", orgId, "periods");
}

function mapPeriod(id: string, data: Record<string, unknown>): AccountingPeriod {
  return {
    id,
    name: data.name as string,
    startDate: data.startDate as string,
    endDate: data.endDate as string,
    status: data.status as PeriodStatus,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    closedAt: (data.closedAt as { toDate?: () => Date })?.toDate?.(),
    closedBy: data.closedBy as string | undefined,
  };
}

export async function listPeriods(orgId: string): Promise<AccountingPeriod[]> {
  const snap = await getDocs(query(periodsCol(orgId), orderBy("startDate")));
  return snap.docs.map((d) => mapPeriod(d.id, d.data()));
}

export async function createPeriod(
  orgId: string,
  draft: MonthPeriodDraft,
): Promise<string> {
  if (!draft.name.trim()) throw new Error("期間名は必須です");
  if (draft.startDate > draft.endDate) {
    throw new Error("開始日は終了日以前である必要があります");
  }

  const dup = await getDocs(
    query(periodsCol(orgId), where("name", "==", draft.name.trim())),
  );
  if (!dup.empty) throw new Error(`期間 ${draft.name} は既に存在します`);

  const ref = doc(periodsCol(orgId));
  await setDoc(ref, {
    name: draft.name.trim(),
    startDate: draft.startDate,
    endDate: draft.endDate,
    status: "open" satisfies PeriodStatus,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function setPeriodStatus(
  orgId: string,
  periodId: string,
  status: PeriodStatus,
  uid: string,
): Promise<void> {
  const ref = doc(db, "organizations", orgId, "periods", periodId);
  if (status === "closed") {
    await updateDoc(ref, {
      status,
      closedAt: serverTimestamp(),
      closedBy: uid,
    });
  } else {
    await updateDoc(ref, {
      status,
      closedAt: null,
      closedBy: null,
    });
  }
}

export function appendFiscalYearPeriodsToBatch(
  batch: WriteBatch,
  orgId: string,
  fiscalYearStartMonth: number,
  referenceDate = new Date(),
): number {
  const startYear = fiscalYearStartYearForDate(
    referenceDate,
    fiscalYearStartMonth,
  );
  const months = buildFiscalYearMonths(startYear, fiscalYearStartMonth);
  for (const month of months) {
    const ref = doc(periodsCol(orgId));
    batch.set(ref, {
      name: month.name,
      startDate: month.startDate,
      endDate: month.endDate,
      status: "open",
      createdAt: serverTimestamp(),
    });
  }
  return months.length;
}

export async function seedFiscalYearPeriodsIfEmpty(
  orgId: string,
  fiscalYearStartMonth: number,
): Promise<number> {
  const existing = await listPeriods(orgId);
  if (existing.length > 0) return 0;

  const batch = writeBatch(db);
  const count = appendFiscalYearPeriodsToBatch(
    batch,
    orgId,
    fiscalYearStartMonth,
  );
  await batch.commit();
  return count;
}

export async function createFiscalYearPeriods(
  orgId: string,
  fiscalYearStartMonth: number,
  fiscalYearStartYear: number,
): Promise<number> {
  const months = buildFiscalYearMonths(fiscalYearStartYear, fiscalYearStartMonth);
  let created = 0;
  for (const month of months) {
    const dup = await getDocs(
      query(periodsCol(orgId), where("name", "==", month.name)),
    );
    if (!dup.empty) continue;
    await createPeriod(orgId, month);
    created += 1;
  }
  return created;
}
