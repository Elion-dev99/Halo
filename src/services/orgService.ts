import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { db } from "@/config/firebase";
import { appendDefaultAccountsToBatch } from "@/services/accountService";
import { appendFiscalYearPeriodsToBatch } from "@/services/periodService";
import type { Organization, OrgMember } from "@/types/models";

export async function getOrganization(
  orgId: string,
): Promise<Organization | null> {
  const snap = await getDoc(doc(db, "organizations", orgId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name as string,
    fiscalYearStartMonth: data.fiscalYearStartMonth as number,
    currency: "JPY",
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    createdBy: data.createdBy as string,
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };
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
    displayName: data.displayName,
    joinedAt: data.joinedAt?.toDate?.() ?? new Date(),
  };
}

function permissionError(): Error {
  return new Error(
    "Firestore の権限エラーです。Firebase Console → Firestore → ルール に、リポジトリの firestore.rules を貼り付けて「公開」してください。",
  );
}

function rethrowFirestore(error: unknown): never {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    throw permissionError();
  }
  throw error instanceof Error ? error : new Error(String(error));
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

  try {
    // 順次作成（バッチよりルール評価が分かりやすい）
    await setDoc(orgRef, {
      name: organizationName,
      fiscalYearStartMonth,
      currency: "JPY",
      createdAt: serverTimestamp(),
      createdBy: params.uid,
      updatedAt: serverTimestamp(),
    });

    await setDoc(memberRef, {
      role: "owner",
      displayName,
      joinedAt: serverTimestamp(),
    });

    await setDoc(
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

    const seed = writeBatch(db);
    appendDefaultAccountsToBatch(seed, orgRef.id);
    appendFiscalYearPeriodsToBatch(seed, orgRef.id, fiscalYearStartMonth);
    await seed.commit();
  } catch (error) {
    rethrowFirestore(error);
  }

  return { orgId: orgRef.id };
}

export async function linkUserToOrg(params: {
  uid: string;
  email: string;
  displayName: string;
  orgId: string;
}): Promise<void> {
  try {
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
  } catch (error) {
    rethrowFirestore(error);
  }
}
