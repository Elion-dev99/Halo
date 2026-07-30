import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { appendDefaultAccountsToBatch } from "@/services/accountService";
import { appendFiscalYearPeriodsToBatch } from "@/services/periodService";
import type { UserProfile } from "@/types/models";

export function subscribeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function login(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

export async function register(params: {
  email: string;
  password: string;
  displayName: string;
  organizationName: string;
}) {
  const { email, password, displayName, organizationName } = params;
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });

  const fiscalYearStartMonth = 4;
  const orgRef = doc(collection(db, "organizations"));
  const userRef = doc(db, "users", cred.user.uid);
  const memberRef = doc(
    db,
    "organizations",
    orgRef.id,
    "members",
    cred.user.uid,
  );
  const batch = writeBatch(db);

  batch.set(orgRef, {
    name: organizationName.trim(),
    fiscalYearStartMonth,
    currency: "JPY",
    createdAt: serverTimestamp(),
    createdBy: cred.user.uid,
    updatedAt: serverTimestamp(),
  });

  batch.set(memberRef, {
    role: "owner",
    displayName: displayName.trim(),
    joinedAt: serverTimestamp(),
  });

  batch.set(userRef, {
    email,
    displayName: displayName.trim(),
    defaultOrgId: orgRef.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  appendDefaultAccountsToBatch(batch, orgRef.id);
  appendFiscalYearPeriodsToBatch(batch, orgRef.id, fiscalYearStartMonth);

  await batch.commit();
  return { user: cred.user, orgId: orgRef.id };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    email: data.email as string,
    displayName: data.displayName as string,
    defaultOrgId: data.defaultOrgId as string,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };
}
