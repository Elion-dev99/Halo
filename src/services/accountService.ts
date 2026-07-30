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
import { DEFAULT_CHART_OF_ACCOUNTS, withDefaults } from "@/data/defaultAccounts";
import type { Account, AccountInput } from "@/types/models";

function accountsCol(orgId: string) {
  return collection(db, "organizations", orgId, "accounts");
}

function mapAccount(id: string, data: Record<string, unknown>): Account {
  return {
    id,
    code: data.code as string,
    name: data.name as string,
    type: data.type as Account["type"],
    normalBalance: data.normalBalance as Account["normalBalance"],
    parentId: (data.parentId as string | null) ?? null,
    isPostable: Boolean(data.isPostable),
    isActive: Boolean(data.isActive),
    sortOrder: Number(data.sortOrder ?? 0),
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
  };
}

export async function listAccounts(orgId: string): Promise<Account[]> {
  const snap = await getDocs(query(accountsCol(orgId), orderBy("sortOrder")));
  return snap.docs.map((d) => mapAccount(d.id, d.data()));
}

export async function findAccountByCode(
  orgId: string,
  code: string,
  excludeId?: string,
): Promise<Account | null> {
  const snap = await getDocs(
    query(accountsCol(orgId), where("code", "==", code.trim())),
  );
  const hit = snap.docs.find((d) => d.id !== excludeId);
  if (!hit) return null;
  return mapAccount(hit.id, hit.data());
}

export async function createAccount(
  orgId: string,
  input: AccountInput,
): Promise<string> {
  const code = input.code.trim();
  if (!code) throw new Error("科目コードは必須です");
  if (!input.name.trim()) throw new Error("科目名は必須です");

  const existing = await findAccountByCode(orgId, code);
  if (existing) throw new Error(`科目コード ${code} は既に存在します`);

  const ref = doc(accountsCol(orgId));
  await setDoc(ref, {
    ...input,
    code,
    name: input.name.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAccount(
  orgId: string,
  accountId: string,
  input: AccountInput,
): Promise<void> {
  const code = input.code.trim();
  if (!code) throw new Error("科目コードは必須です");
  if (!input.name.trim()) throw new Error("科目名は必須です");
  if (input.parentId === accountId) {
    throw new Error("自分自身を親科目にはできません");
  }

  const existing = await findAccountByCode(orgId, code, accountId);
  if (existing) throw new Error(`科目コード ${code} は既に存在します`);

  await updateDoc(doc(db, "organizations", orgId, "accounts", accountId), {
    ...input,
    code,
    name: input.name.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function setAccountActive(
  orgId: string,
  accountId: string,
  isActive: boolean,
): Promise<void> {
  await updateDoc(doc(db, "organizations", orgId, "accounts", accountId), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}

/** 登録バッチ用: 標準科目を batch に追加 */
export function appendDefaultAccountsToBatch(
  batch: WriteBatch,
  orgId: string,
): void {
  for (const seed of DEFAULT_CHART_OF_ACCOUNTS) {
    const ref = doc(accountsCol(orgId));
    batch.set(ref, {
      ...withDefaults(seed),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/** 既存組織へ標準科目を投入（コード重複はスキップ） */
export async function seedDefaultAccountsIfEmpty(orgId: string): Promise<number> {
  const existing = await listAccounts(orgId);
  if (existing.length > 0) return 0;

  const batch = writeBatch(db);
  appendDefaultAccountsToBatch(batch, orgId);
  await batch.commit();
  return DEFAULT_CHART_OF_ACCOUNTS.length;
}
