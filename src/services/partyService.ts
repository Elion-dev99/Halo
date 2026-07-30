import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import type { Customer, CustomerInput, Vendor, VendorInput } from "@/types/arAp";

function customersCol(orgId: string) {
  return collection(db, "organizations", orgId, "customers");
}

function vendorsCol(orgId: string) {
  return collection(db, "organizations", orgId, "vendors");
}

function mapCustomer(id: string, data: Record<string, unknown>): Customer {
  return {
    id,
    code: String(data.code ?? ""),
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    phone: String(data.phone ?? ""),
    address: String(data.address ?? ""),
    paymentTermsDays: Number(data.paymentTermsDays ?? 30),
    isActive: data.isActive !== false,
    notes: String(data.notes ?? ""),
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
  };
}

function mapVendor(id: string, data: Record<string, unknown>): Vendor {
  return {
    id,
    code: String(data.code ?? ""),
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    phone: String(data.phone ?? ""),
    address: String(data.address ?? ""),
    paymentTermsDays: Number(data.paymentTermsDays ?? 30),
    isActive: data.isActive !== false,
    notes: String(data.notes ?? ""),
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
  };
}

function validateParty(input: CustomerInput | VendorInput) {
  if (!input.code.trim()) throw new Error("コードを入力してください。");
  if (!input.name.trim()) throw new Error("名称を入力してください。");
  if (input.paymentTermsDays < 0) {
    throw new Error("支払条件（日数）は 0 以上にしてください。");
  }
}

export async function listCustomers(orgId: string): Promise<Customer[]> {
  const snap = await getDocs(query(customersCol(orgId), orderBy("code")));
  return snap.docs.map((d) => mapCustomer(d.id, d.data()));
}

export async function getCustomer(
  orgId: string,
  customerId: string,
): Promise<Customer | null> {
  const snap = await getDoc(doc(db, "organizations", orgId, "customers", customerId));
  if (!snap.exists()) return null;
  return mapCustomer(snap.id, snap.data());
}

export async function createCustomer(
  orgId: string,
  input: CustomerInput,
): Promise<string> {
  validateParty(input);
  const ref = doc(customersCol(orgId));
  await setDoc(ref, {
    ...input,
    code: input.code.trim(),
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    notes: input.notes.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCustomer(
  orgId: string,
  customerId: string,
  input: CustomerInput,
): Promise<void> {
  validateParty(input);
  await updateDoc(doc(db, "organizations", orgId, "customers", customerId), {
    ...input,
    code: input.code.trim(),
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    notes: input.notes.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function listVendors(orgId: string): Promise<Vendor[]> {
  const snap = await getDocs(query(vendorsCol(orgId), orderBy("code")));
  return snap.docs.map((d) => mapVendor(d.id, d.data()));
}

export async function getVendor(
  orgId: string,
  vendorId: string,
): Promise<Vendor | null> {
  const snap = await getDoc(doc(db, "organizations", orgId, "vendors", vendorId));
  if (!snap.exists()) return null;
  return mapVendor(snap.id, snap.data());
}

export async function createVendor(
  orgId: string,
  input: VendorInput,
): Promise<string> {
  validateParty(input);
  const ref = doc(vendorsCol(orgId));
  await setDoc(ref, {
    ...input,
    code: input.code.trim(),
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    notes: input.notes.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateVendor(
  orgId: string,
  vendorId: string,
  input: VendorInput,
): Promise<void> {
  validateParty(input);
  await updateDoc(doc(db, "organizations", orgId, "vendors", vendorId), {
    ...input,
    code: input.code.trim(),
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    notes: input.notes.trim(),
    updatedAt: serverTimestamp(),
  });
}
