import { doc, getDoc, getDocs, collection, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebase";
import type { Organization } from "@/types/models";

const UNLOCK_KEY = "halo.sysUnlocked";

/** ビルド時 allowlist（カンマ区切りメール） */
export function platformAdminEmailsFromEnv(): string[] {
  const raw = import.meta.env.VITE_PLATFORM_ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return platformAdminEmailsFromEnv().includes(email.trim().toLowerCase());
}

export async function isFirestorePlatformAdmin(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, "platformAdmins", uid));
    return snap.exists() && snap.data()?.disabled !== true;
  } catch {
    return false;
  }
}

export async function resolvePlatformAdmin(params: {
  uid: string;
  email: string | null | undefined;
}): Promise<boolean> {
  if (isEmailPlatformAdmin(params.email)) return true;
  return isFirestorePlatformAdmin(params.uid);
}

export function isSysUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSysUnlocked(unlocked: boolean): void {
  try {
    if (unlocked) sessionStorage.setItem(UNLOCK_KEY, "1");
    else sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    // ignore
  }
}

export async function listAllOrganizations(): Promise<Organization[]> {
  const snap = await getDocs(collection(db, "organizations"));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: String(data.name ?? ""),
      fiscalYearStartMonth: Number(data.fiscalYearStartMonth ?? 4),
      currency: "JPY" as const,
      defaultArAccountCode: String(data.defaultArAccountCode ?? "1100"),
      defaultApAccountCode: String(data.defaultApAccountCode ?? "2000"),
      defaultCashAccountCode: String(data.defaultCashAccountCode ?? "1010"),
      defaultRevenueAccountCode: String(data.defaultRevenueAccountCode ?? "4000"),
      defaultExpenseAccountCode: String(data.defaultExpenseAccountCode ?? "5900"),
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      createdBy: String(data.createdBy ?? ""),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    };
  });
}

export async function listPlatformAdminDocs(): Promise<
  Array<{ uid: string; email: string; note: string }>
> {
  const snap = await getDocs(collection(db, "platformAdmins"));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      email: String(data.email ?? ""),
      note: String(data.note ?? ""),
    };
  });
}

export async function upsertPlatformAdmin(params: {
  uid: string;
  email: string;
  note?: string;
  grantedBy: string;
}): Promise<void> {
  await setDoc(
    doc(db, "platformAdmins", params.uid),
    {
      email: params.email.trim().toLowerCase(),
      note: params.note?.trim() ?? "",
      grantedBy: params.grantedBy,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      disabled: false,
    },
    { merge: true },
  );
}

export async function removePlatformAdmin(uid: string): Promise<void> {
  await deleteDoc(doc(db, "platformAdmins", uid));
}
