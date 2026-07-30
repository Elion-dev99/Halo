import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { bootstrapOrganization } from "@/services/orgService";
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
  await updateProfile(cred.user, { displayName: displayName.trim() });

  try {
    const { orgId } = await bootstrapOrganization({
      uid: cred.user.uid,
      email,
      displayName,
      organizationName,
    });
    return { user: cred.user, orgId };
  } catch (error) {
    // Auth ユーザーは残るので、画面から組織セットアップで復旧できる
    console.error("Organization bootstrap failed after Auth signup", error);
    throw error;
  }
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
