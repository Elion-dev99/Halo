import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { appendDefaultAccountsToBatch } from "@/services/accountService";
import { appendFiscalYearPeriodsToBatch } from "@/services/periodService";
import type {
  Organization,
  OrganizationSettingsInput,
  OrgMember,
} from "@/types/models";

const ORG_DEFAULTS = {
  defaultArAccountCode: "1100",
  defaultApAccountCode: "2000",
  defaultCashAccountCode: "1010",
  defaultRevenueAccountCode: "4000",
  defaultExpenseAccountCode: "5900",
} as const;

function mapOrganization(id: string, data: Record<string, unknown>): Organization {
  return {
    id,
    name: data.name as string,
    fiscalYearStartMonth: Number(data.fiscalYearStartMonth ?? 4),
    currency: "JPY",
    defaultArAccountCode: String(
      data.defaultArAccountCode ?? ORG_DEFAULTS.defaultArAccountCode,
    ),
    defaultApAccountCode: String(
      data.defaultApAccountCode ?? ORG_DEFAULTS.defaultApAccountCode,
    ),
    defaultCashAccountCode: String(
      data.defaultCashAccountCode ?? ORG_DEFAULTS.defaultCashAccountCode,
    ),
    defaultRevenueAccountCode: String(
      data.defaultRevenueAccountCode ?? ORG_DEFAULTS.defaultRevenueAccountCode,
    ),
    defaultExpenseAccountCode: String(
      data.defaultExpenseAccountCode ?? ORG_DEFAULTS.defaultExpenseAccountCode,
    ),
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    createdBy: data.createdBy as string,
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
  };
}

export async function getOrganization(
  orgId: string,
): Promise<Organization | null> {
  const snap = await getDoc(doc(db, "organizations", orgId));
  if (!snap.exists()) return null;
  return mapOrganization(snap.id, snap.data());
}

export async function getMembership(
  orgId: string,
  uid: string,
): Promise<OrgMember | null> {
  const snap = await getDoc(doc(db, "organizations", orgId, "members", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    role: data.role,
    email: (data.email as string) ?? "",
    displayName: (data.displayName as string) ?? "",
    status: (data.status as OrgMember["status"]) ?? "active",
    joinedAt: data.joinedAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.(),
  };
}

/**
 * Auth ユーザー向けに組織・プロフィール・初期マスタを作る。
 * 登録バッチが途中失敗したアカウントの復旧にも使う。
 */
export async function bootstrapOrganization(params: {
  uid: string;
  email: string;
  displayName: string;
  organizationName: string;
}): Promise<{ orgId: string }> {
  const fiscalYearStartMonth = 4;
  const displayName = params.displayName.trim() || "ユーザー";
  const organizationName = params.organizationName.trim();
  if (!organizationName) {
    throw new Error("組織名を入力してください。");
  }

  const orgRef = doc(collection(db, "organizations"));
  const userRef = doc(db, "users", params.uid);
  const memberRef = doc(
    db,
    "organizations",
    orgRef.id,
    "members",
    params.uid,
  );

  const bootstrap = writeBatch(db);
  bootstrap.set(orgRef, {
    name: organizationName,
    fiscalYearStartMonth,
    currency: "JPY",
    ...ORG_DEFAULTS,
    createdAt: serverTimestamp(),
    createdBy: params.uid,
    updatedAt: serverTimestamp(),
  });
  bootstrap.set(memberRef, {
    role: "owner",
    email: params.email,
    displayName,
    status: "active",
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  bootstrap.set(
    userRef,
    {
      email: params.email,
      displayName,
      defaultOrgId: orgRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await bootstrap.commit();

  const seed = writeBatch(db);
  appendDefaultAccountsToBatch(seed, orgRef.id);
  appendFiscalYearPeriodsToBatch(seed, orgRef.id, fiscalYearStartMonth);
  await seed.commit();

  return { orgId: orgRef.id };
}

export async function updateOrganizationSettings(
  orgId: string,
  input: OrganizationSettingsInput,
): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("組織名を入力してください。");
  const month = Number(input.fiscalYearStartMonth);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("会計年度開始月は 1〜12 で指定してください。");
  }

  await updateDoc(doc(db, "organizations", orgId), {
    name,
    fiscalYearStartMonth: month,
    defaultArAccountCode: input.defaultArAccountCode.trim(),
    defaultApAccountCode: input.defaultApAccountCode.trim(),
    defaultCashAccountCode: input.defaultCashAccountCode.trim(),
    defaultRevenueAccountCode: input.defaultRevenueAccountCode.trim(),
    defaultExpenseAccountCode: input.defaultExpenseAccountCode.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function linkUserToOrg(params: {
  uid: string;
  email: string;
  displayName: string;
  orgId: string;
}): Promise<void> {
  await setDoc(
    doc(db, "users", params.uid),
    {
      email: params.email,
      displayName: params.displayName.trim(),
      defaultOrgId: params.orgId,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateUserProfile(params: {
  uid: string;
  displayName: string;
}): Promise<void> {
  const displayName = params.displayName.trim();
  if (!displayName) throw new Error("表示名を入力してください。");
  await updateDoc(doc(db, "users", params.uid), {
    displayName,
    updatedAt: serverTimestamp(),
  });
}