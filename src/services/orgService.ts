import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
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
