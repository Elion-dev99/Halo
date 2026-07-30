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
  Invoice,
  InvoiceLine,
  InvoiceLineInput,
  InvoiceStatus,
} from "@/types/arAp";
import type { Account } from "@/types/models";

function invoicesCol(orgId: string) {
  return collection(db, "organizations", orgId, "invoices");
}

function paymentsCol(orgId: string) {
  return collection(db, "organizations", orgId, "payments");
}

function mapLines(raw: unknown): InvoiceLine[] {
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
      revenueAccountId: String(row.revenueAccountId ?? ""),
    };
  });
}

function mapInvoice(id: string, data: Record<string, unknown>): Invoice {
  return {
    id,
    number: String(data.number ?? ""),
    customerId: String(data.customerId ?? ""),
    customerName: String(data.customerName ?? ""),
    issueDate: String(data.issueDate ?? ""),
    dueDate: String(data.dueDate ?? ""),
    status: data.status as InvoiceStatus,
    currency: "JPY",
    subtotal: Number(data.subtotal ?? 0),
    taxAmount: Number(data.taxAmount ?? 0),
    total: Number(data.total ?? 0),
    amountPaid: Number(data.amountPaid ?? 0),
    balanceDue: Number(data.balanceDue ?? 0),
    arAccountId: String(data.arAccountId ?? ""),
    memo: String(data.memo ?? ""),
    journalId: (data.journalId as string | null) ?? null,
    lines: mapLines(data.lines),
    createdBy: String(data.createdBy ?? ""),
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    postedAt: (data.postedAt as { toDate?: () => Date })?.toDate?.() ?? null,
  };
}

function prepareLines(lines: InvoiceLineInput[]): InvoiceLine[] {
  if (lines.length === 0) throw new Error("明細を1行以上入力してください。");
  return lines.map((line, index) => {
    const quantity = Number(line.quantity);
    const unitPrice = Number(line.unitPrice);
    if (!line.description.trim()) {
      throw new Error(`明細 ${index + 1}: 摘要を入力してください。`);
    }
    if (!(quantity > 0)) throw new Error(`明細 ${index + 1}: 数量は正の数にしてください。`);
    if (!(unitPrice >= 0)) throw new Error(`明細 ${index + 1}: 単価は0以上にしてください。`);
    if (!line.revenueAccountId) {
      throw new Error(`明細 ${index + 1}: 売上科目を選択してください。`);
    }
    return {
      id: `line-${index + 1}`,
      description: line.description.trim(),
      quantity,
      unitPrice,
      amount: Math.round(quantity * unitPrice),
      revenueAccountId: line.revenueAccountId,
    };
  });
}

async function nextInvoiceNumber(orgId: string, issueDate: string): Promise<string> {
  const year = issueDate.slice(0, 4);
  const seqRef = doc(db, "organizations", orgId, "meta", "sequences");
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(seqRef);
    const key = `invoice-${year}`;
    const current = Number(snap.data()?.[key] ?? 0) + 1;
    tx.set(seqRef, { [key]: current, updatedAt: serverTimestamp() }, { merge: true });
    return `INV-${year}-${String(current).padStart(4, "0")}`;
  });
}

function findAccountByCode(accounts: Account[], code: string): Account | undefined {
  return accounts.find((a) => a.code === code && a.isActive && a.isPostable);
}

export async function listInvoices(orgId: string): Promise<Invoice[]> {
  const snap = await getDocs(query(invoicesCol(orgId), orderBy("issueDate", "desc")));
  return snap.docs.map((d) => mapInvoice(d.id, d.data()));
}

export async function getInvoice(
  orgId: string,
  invoiceId: string,
): Promise<Invoice | null> {
  const snap = await getDoc(doc(db, "organizations", orgId, "invoices", invoiceId));
  if (!snap.exists()) return null;
  return mapInvoice(snap.id, snap.data());
}

export async function createDraftInvoice(params: {
  orgId: string;
  uid: string;
  customerId: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  arAccountId?: string;
  memo: string;
  taxAmount?: number;
  lines: InvoiceLineInput[];
}): Promise<string> {
  const org = await getOrganization(params.orgId);
  if (!org) throw new Error("組織が見つかりません。");
  const accounts = await listAccounts(params.orgId);
  const lines = prepareLines(params.lines);
  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const taxAmount = Math.round(Number(params.taxAmount ?? 0));
  const total = subtotal + taxAmount;
  if (total <= 0) throw new Error("合計金額は正の数にしてください。");

  const arAccountId =
    params.arAccountId ||
    findAccountByCode(accounts, org.defaultArAccountCode)?.id ||
    "";
  if (!arAccountId) throw new Error("売掛金科目が見つかりません。設定を確認してください。");

  const number = await nextInvoiceNumber(params.orgId, params.issueDate);
  const ref = doc(invoicesCol(params.orgId));
  await setDoc(ref, {
    number,
    customerId: params.customerId,
    customerName: params.customerName,
    issueDate: params.issueDate,
    dueDate: params.dueDate,
    status: "draft",
    currency: "JPY",
    subtotal,
    taxAmount,
    total,
    amountPaid: 0,
    balanceDue: total,
    arAccountId,
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

export async function updateDraftInvoice(params: {
  orgId: string;
  invoiceId: string;
  customerId: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  arAccountId: string;
  memo: string;
  taxAmount?: number;
  lines: InvoiceLineInput[];
}): Promise<void> {
  const current = await getInvoice(params.orgId, params.invoiceId);
  if (!current) throw new Error("請求書が見つかりません。");
  if (current.status !== "draft") throw new Error("下書きのみ編集できます。");

  const lines = prepareLines(params.lines);
  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const taxAmount = Math.round(Number(params.taxAmount ?? 0));
  const total = subtotal + taxAmount;

  await updateDoc(doc(db, "organizations", params.orgId, "invoices", params.invoiceId), {
    customerId: params.customerId,
    customerName: params.customerName,
    issueDate: params.issueDate,
    dueDate: params.dueDate,
    arAccountId: params.arAccountId,
    memo: params.memo.trim(),
    subtotal,
    taxAmount,
    total,
    balanceDue: total,
    lines,
    updatedAt: serverTimestamp(),
  });
}

export async function postInvoice(params: {
  orgId: string;
  invoiceId: string;
  uid: string;
}): Promise<void> {
  const invoice = await getInvoice(params.orgId, params.invoiceId);
  if (!invoice) throw new Error("請求書が見つかりません。");
  if (invoice.status !== "draft") throw new Error("下書きのみ確定できます。");

  const revenueGroups = new Map<string, number>();
  for (const line of invoice.lines) {
    revenueGroups.set(
      line.revenueAccountId,
      (revenueGroups.get(line.revenueAccountId) ?? 0) + line.amount,
    );
  }

  const revenueCredits = [...revenueGroups.entries()].map(([accountId, amount]) => ({
    accountId,
    debit: 0,
    credit: amount,
    memo: `${invoice.number} 売上`,
  }));
  // 税額は当面売上側へ加算（仮受消費税科目は次イテレーション）
  if (invoice.taxAmount > 0 && revenueCredits.length > 0) {
    revenueCredits[0].credit += invoice.taxAmount;
  }

  const journalLines = [
    {
      accountId: invoice.arAccountId,
      debit: invoice.total,
      credit: 0,
      memo: `${invoice.number} ${invoice.customerName}`,
    },
    ...revenueCredits,
  ];

  const journalId = await createAndPostJournal({
    orgId: params.orgId,
    uid: params.uid,
    date: invoice.issueDate,
    memo: `売掛請求 ${invoice.number}`,
    lines: journalLines,
  });

  await updateDoc(doc(db, "organizations", params.orgId, "invoices", params.invoiceId), {
    status: "open",
    journalId,
    postedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function voidInvoice(params: {
  orgId: string;
  invoiceId: string;
  uid: string;
}): Promise<void> {
  const invoice = await getInvoice(params.orgId, params.invoiceId);
  if (!invoice) throw new Error("請求書が見つかりません。");
  if (invoice.status === "void") throw new Error("既に取消済みです。");
  if (invoice.amountPaid > 0) {
    throw new Error("入金済みの請求書は取消できません。先に入金を取り消してください。");
  }
  if (invoice.journalId) {
    await voidJournal({
      orgId: params.orgId,
      journalId: invoice.journalId,
      uid: params.uid,
      reason: `請求書 ${invoice.number} 取消`,
    });
  }
  await updateDoc(doc(db, "organizations", params.orgId, "invoices", params.invoiceId), {
    status: "void",
    balanceDue: 0,
    updatedAt: serverTimestamp(),
  });
}

export async function recordCustomerPayment(params: {
  orgId: string;
  uid: string;
  invoiceId: string;
  paymentDate: string;
  amount: number;
  cashAccountId?: string;
  memo?: string;
}): Promise<string> {
  const invoice = await getInvoice(params.orgId, params.invoiceId);
  if (!invoice) throw new Error("請求書が見つかりません。");
  if (!["open", "partial"].includes(invoice.status)) {
    throw new Error("未収または一部入金の請求書のみ入金できます。");
  }
  const amount = Math.round(params.amount);
  if (!(amount > 0)) throw new Error("入金金額は正の数にしてください。");
  if (amount > invoice.balanceDue) {
    throw new Error("入金金額が残高を超えています。");
  }

  const org = await getOrganization(params.orgId);
  if (!org) throw new Error("組織が見つかりません。");
  const accounts = await listAccounts(params.orgId);
  const cashAccountId =
    params.cashAccountId ||
    findAccountByCode(accounts, org.defaultCashAccountCode)?.id ||
    "";
  if (!cashAccountId) throw new Error("入金口座科目が見つかりません。");

  const journalId = await createAndPostJournal({
    orgId: params.orgId,
    uid: params.uid,
    date: params.paymentDate,
    memo: `入金 ${invoice.number}`,
    lines: [
      {
        accountId: cashAccountId,
        debit: amount,
        credit: 0,
        memo: `${invoice.customerName} 入金`,
      },
      {
        accountId: invoice.arAccountId,
        debit: 0,
        credit: amount,
        memo: `${invoice.number} 消込`,
      },
    ],
  });

  const amountPaid = invoice.amountPaid + amount;
  const balanceDue = invoice.total - amountPaid;
  const status: InvoiceStatus = balanceDue === 0 ? "paid" : "partial";

  const paymentRef = doc(paymentsCol(params.orgId));
  await runTransaction(db, async (tx) => {
    tx.set(paymentRef, {
      type: "customer_receipt",
      partyId: invoice.customerId,
      partyName: invoice.customerName,
      documentId: invoice.id,
      documentNumber: invoice.number,
      paymentDate: params.paymentDate,
      amount,
      cashAccountId,
      memo: params.memo?.trim() || "",
      journalId,
      createdBy: params.uid,
      createdAt: serverTimestamp(),
    });
    tx.update(doc(db, "organizations", params.orgId, "invoices", invoice.id), {
      amountPaid,
      balanceDue,
      status,
      updatedAt: serverTimestamp(),
    });
  });

  return paymentRef.id;
}
