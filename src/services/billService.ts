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
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { createAndPostJournal, voidJournal } from "@/services/journalService";
import { listAccounts } from "@/services/accountService";
import { getOrganization } from "@/services/orgService";
import type {
  Bill,
  BillLine,
  BillLineInput,
  BillStatus,
} from "@/types/arAp";
import type { Account } from "@/types/models";

function billsCol(orgId: string) {
  return collection(db, "organizations", orgId, "bills");
}

function paymentsCol(orgId: string) {
  return collection(db, "organizations", orgId, "payments");
}

function mapLines(raw: unknown): BillLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const row = item as Record<string, unknown>;
    const quantity = Number(row.quantity ?? 0);
    const unitPrice = Number(row.unitPrice ?? 0);
    return {
      id: String(row.id ?? `line-${index + 1}`),
      description: String(row.description ?? ""),
      quantity,
      unitPrice,
      amount: Number(row.amount ?? quantity * unitPrice),
      expenseAccountId: String(row.expenseAccountId ?? ""),
    };
  });
}

function mapBill(id: string, data: Record<string, unknown>): Bill {
  return {
    id,
    number: String(data.number ?? ""),
    vendorId: String(data.vendorId ?? ""),
    vendorName: String(data.vendorName ?? ""),
    issueDate: String(data.issueDate ?? ""),
    dueDate: String(data.dueDate ?? ""),
    status: data.status as BillStatus,
    currency: "JPY",
    subtotal: Number(data.subtotal ?? 0),
    taxAmount: Number(data.taxAmount ?? 0),
    total: Number(data.total ?? 0),
    amountPaid: Number(data.amountPaid ?? 0),
    balanceDue: Number(data.balanceDue ?? 0),
    apAccountId: String(data.apAccountId ?? ""),
    memo: String(data.memo ?? ""),
    journalId: (data.journalId as string | null) ?? null,
    lines: mapLines(data.lines),
    createdBy: String(data.createdBy ?? ""),
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    postedAt: (data.postedAt as { toDate?: () => Date })?.toDate?.() ?? null,
  };
}

function prepareLines(lines: BillLineInput[]): BillLine[] {
  if (lines.length === 0) throw new Error("明細を1行以上入力してください。");
  return lines.map((line, index) => {
    const quantity = Number(line.quantity);
    const unitPrice = Number(line.unitPrice);
    if (!line.description.trim()) {
      throw new Error(`明細 ${index + 1}: 摘要を入力してください。`);
    }
    if (!(quantity > 0)) throw new Error(`明細 ${index + 1}: 数量は正の数にしてください。`);
    if (!(unitPrice >= 0)) throw new Error(`明細 ${index + 1}: 単価は0以上にしてください。`);
    if (!line.expenseAccountId) {
      throw new Error(`明細 ${index + 1}: 費用科目を選択してください。`);
    }
    return {
      id: `line-${index + 1}`,
      description: line.description.trim(),
      quantity,
      unitPrice,
      amount: Math.round(quantity * unitPrice),
      expenseAccountId: line.expenseAccountId,
    };
  });
}

async function nextBillNumber(orgId: string, issueDate: string): Promise<string> {
  const year = issueDate.slice(0, 4);
  const seqRef = doc(db, "organizations", orgId, "meta", "sequences");
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(seqRef);
    const key = `bill-${year}`;
    const current = Number(snap.data()?.[key] ?? 0) + 1;
    tx.set(seqRef, { [key]: current, updatedAt: serverTimestamp() }, { merge: true });
    return `BILL-${year}-${String(current).padStart(4, "0")}`;
  });
}

function findAccountByCode(accounts: Account[], code: string): Account | undefined {
  return accounts.find((a) => a.code === code && a.isActive && a.isPostable);
}

export async function listBills(orgId: string): Promise<Bill[]> {
  const snap = await getDocs(query(billsCol(orgId), orderBy("issueDate", "desc")));
  return snap.docs.map((d) => mapBill(d.id, d.data()));
}

export async function getBill(orgId: string, billId: string): Promise<Bill | null> {
  const snap = await getDoc(doc(db, "organizations", orgId, "bills", billId));
  if (!snap.exists()) return null;
  return mapBill(snap.id, snap.data());
}

export async function createDraftBill(params: {
  orgId: string;
  uid: string;
  vendorId: string;
  vendorName: string;
  issueDate: string;
  dueDate: string;
  apAccountId?: string;
  memo: string;
  taxAmount?: number;
  lines: BillLineInput[];
}): Promise<string> {
  const org = await getOrganization(params.orgId);
  if (!org) throw new Error("組織が見つかりません。");
  const accounts = await listAccounts(params.orgId);
  const lines = prepareLines(params.lines);
  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const taxAmount = Math.round(Number(params.taxAmount ?? 0));
  const total = subtotal + taxAmount;
  if (total <= 0) throw new Error("合計金額は正の数にしてください。");

  const apAccountId =
    params.apAccountId ||
    findAccountByCode(accounts, org.defaultApAccountCode)?.id ||
    "";
  if (!apAccountId) throw new Error("買掛金科目が見つかりません。設定を確認してください。");

  const number = await nextBillNumber(params.orgId, params.issueDate);
  const ref = doc(billsCol(params.orgId));
  await setDoc(ref, {
    number,
    vendorId: params.vendorId,
    vendorName: params.vendorName,
    issueDate: params.issueDate,
    dueDate: params.dueDate,
    status: "draft",
    currency: "JPY",
    subtotal,
    taxAmount,
    total,
    amountPaid: 0,
    balanceDue: total,
    apAccountId,
    memo: params.memo.trim(),
    journalId: null,
    lines,
    createdBy: params.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    postedAt: null,
  });
  return ref.id;
}

export async function updateDraftBill(params: {
  orgId: string;
  billId: string;
  vendorId: string;
  vendorName: string;
  issueDate: string;
  dueDate: string;
  apAccountId: string;
  memo: string;
  taxAmount?: number;
  lines: BillLineInput[];
}): Promise<void> {
  const current = await getBill(params.orgId, params.billId);
  if (!current) throw new Error("買掛請求が見つかりません。");
  if (current.status !== "draft") throw new Error("下書きのみ編集できます。");

  const lines = prepareLines(params.lines);
  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const taxAmount = Math.round(Number(params.taxAmount ?? 0));
  const total = subtotal + taxAmount;

  await updateDoc(doc(db, "organizations", params.orgId, "bills", params.billId), {
    vendorId: params.vendorId,
    vendorName: params.vendorName,
    issueDate: params.issueDate,
    dueDate: params.dueDate,
    apAccountId: params.apAccountId,
    memo: params.memo.trim(),
    subtotal,
    taxAmount,
    total,
    balanceDue: total,
    lines,
    updatedAt: serverTimestamp(),
  });
}

export async function postBill(params: {
  orgId: string;
  billId: string;
  uid: string;
}): Promise<void> {
  const bill = await getBill(params.orgId, params.billId);
  if (!bill) throw new Error("買掛請求が見つかりません。");
  if (bill.status !== "draft") throw new Error("下書きのみ確定できます。");

  const expenseGroups = new Map<string, number>();
  for (const line of bill.lines) {
    expenseGroups.set(
      line.expenseAccountId,
      (expenseGroups.get(line.expenseAccountId) ?? 0) + line.amount,
    );
  }

  const expenseDebits = [...expenseGroups.entries()].map(([accountId, amount]) => ({
    accountId,
    debit: amount,
    credit: 0,
    memo: `${bill.number} 費用`,
  }));
  if (bill.taxAmount > 0 && expenseDebits.length > 0) {
    expenseDebits[0].debit += bill.taxAmount;
  }

  const journalLines = [
    ...expenseDebits,
    {
      accountId: bill.apAccountId,
      debit: 0,
      credit: bill.total,
      memo: `${bill.number} ${bill.vendorName}`,
    },
  ];

  const journalId = await createAndPostJournal({
    orgId: params.orgId,
    uid: params.uid,
    date: bill.issueDate,
    memo: `買掛請求 ${bill.number}`,
    lines: journalLines,
  });

  await updateDoc(doc(db, "organizations", params.orgId, "bills", params.billId), {
    status: "open",
    journalId,
    postedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function voidBill(params: {
  orgId: string;
  billId: string;
  uid: string;
}): Promise<void> {
  const bill = await getBill(params.orgId, params.billId);
  if (!bill) throw new Error("買掛請求が見つかりません。");
  if (bill.status === "void") throw new Error("既に取消済みです。");
  if (bill.amountPaid > 0) {
    throw new Error("支払済みの買掛請求は取消できません。");
  }
  if (bill.journalId) {
    await voidJournal({
      orgId: params.orgId,
      journalId: bill.journalId,
      uid: params.uid,
      reason: `買掛請求 ${bill.number} 取消`,
    });
  }
  await updateDoc(doc(db, "organizations", params.orgId, "bills", params.billId), {
    status: "void",
    balanceDue: 0,
    updatedAt: serverTimestamp(),
  });
}

export async function recordVendorPayment(params: {
  orgId: string;
  uid: string;
  billId: string;
  paymentDate: string;
  amount: number;
  cashAccountId?: string;
  memo?: string;
}): Promise<string> {
  const bill = await getBill(params.orgId, params.billId);
  if (!bill) throw new Error("買掛請求が見つかりません。");
  if (!["open", "partial"].includes(bill.status)) {
    throw new Error("未払または一部支払の買掛請求のみ支払できます。");
  }
  const amount = Math.round(params.amount);
  if (!(amount > 0)) throw new Error("支払金額は正の数にしてください。");
  if (amount > bill.balanceDue) {
    throw new Error("支払金額が残高を超えています。");
  }

  const org = await getOrganization(params.orgId);
  if (!org) throw new Error("組織が見つかりません。");
  const accounts = await listAccounts(params.orgId);
  const cashAccountId =
    params.cashAccountId ||
    findAccountByCode(accounts, org.defaultCashAccountCode)?.id ||
    "";
  if (!cashAccountId) throw new Error("支払口座科目が見つかりません。");

  const journalId = await createAndPostJournal({
    orgId: params.orgId,
    uid: params.uid,
    date: params.paymentDate,
    memo: `支払 ${bill.number}`,
    lines: [
      {
        accountId: bill.apAccountId,
        debit: amount,
        credit: 0,
        memo: `${bill.number} 消込`,
      },
      {
        accountId: cashAccountId,
        debit: 0,
        credit: amount,
        memo: `${bill.vendorName} 支払`,
      },
    ],
  });

  const amountPaid = bill.amountPaid + amount;
  const balanceDue = bill.total - amountPaid;
  const status: BillStatus = balanceDue === 0 ? "paid" : "partial";

  const paymentRef = doc(paymentsCol(params.orgId));
  await runTransaction(db, async (tx) => {
    tx.set(paymentRef, {
      type: "vendor_payment",
      partyId: bill.vendorId,
      partyName: bill.vendorName,
      documentId: bill.id,
      documentNumber: bill.number,
      paymentDate: params.paymentDate,
      amount,
      cashAccountId,
      memo: params.memo?.trim() || "",
      journalId,
      createdBy: params.uid,
      createdAt: serverTimestamp(),
    });
    tx.update(doc(db, "organizations", params.orgId, "bills", bill.id), {
      amountPaid,
      balanceDue,
      status,
      updatedAt: serverTimestamp(),
    });
  });

  return paymentRef.id;
}
