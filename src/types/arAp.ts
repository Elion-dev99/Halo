import type { MemberRole } from "./models";
import { can, type Permission } from "@/domain/permissions";

export type Customer = {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  paymentTermsDays: number;
  isActive: boolean;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Vendor = {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  paymentTermsDays: number;
  isActive: boolean;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
};

export type InvoiceStatus = "draft" | "open" | "partial" | "paid" | "void";
export type BillStatus = "draft" | "open" | "partial" | "paid" | "void";

export type InvoiceLine = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  revenueAccountId: string;
};

export type Invoice = {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  currency: "JPY";
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  arAccountId: string;
  memo: string;
  journalId: string | null;
  lines: InvoiceLine[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  postedAt: Date | null;
};

export type BillLine = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  expenseAccountId: string;
};

export type Bill = {
  id: string;
  number: string;
  vendorId: string;
  vendorName: string;
  issueDate: string;
  dueDate: string;
  status: BillStatus;
  currency: "JPY";
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  apAccountId: string;
  memo: string;
  journalId: string | null;
  lines: BillLine[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  postedAt: Date | null;
};

export type Payment = {
  id: string;
  type: "customer_receipt" | "vendor_payment";
  partyId: string;
  partyName: string;
  documentId: string;
  documentNumber: string;
  paymentDate: string;
  amount: number;
  cashAccountId: string;
  memo: string;
  journalId: string | null;
  createdBy: string;
  createdAt: Date;
};

export type CustomerInput = Omit<
  Customer,
  "id" | "createdAt" | "updatedAt"
>;

export type VendorInput = Omit<Vendor, "id" | "createdAt" | "updatedAt">;

export type InvoiceLineInput = Omit<InvoiceLine, "id" | "amount"> & {
  amount?: number;
};

export type BillLineInput = Omit<BillLine, "id" | "amount"> & {
  amount?: number;
};

export function requirePermission(
  role: MemberRole | null | undefined,
  permission: Permission,
): void {
  if (!can(role, permission)) {
    throw new Error("この操作を行う権限がありません。");
  }
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "下書き",
  open: "未収",
  partial: "一部入金",
  paid: "入金済",
  void: "取消",
};

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  draft: "下書き",
  open: "未払",
  partial: "一部支払",
  paid: "支払済",
  void: "取消",
};
