import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { can } from "@/domain/permissions";
import type { MemberRole, OrgInvite, OrgMember } from "@/types/models";
import { requirePermission } from "@/types/arAp";

function membersCol(orgId: string) {
  return collection(db, "organizations", orgId, "members");
}

function inviteRef(orgId: string, email: string) {
  return doc(db, "organizations", orgId, "invites", email.trim().toLowerCase());
}

function emailInviteItemRef(email: string, orgId: string) {
  return doc(
    db,
    "emailInvites",
    email.trim().toLowerCase(),
    "items",
    orgId,
  );
}

function mapMember(uid: string, data: Record<string, unknown>): OrgMember {
  return {
    uid,
    role: data.role as MemberRole,
    email: String(data.email ?? ""),
    displayName: String(data.displayName ?? ""),
    status: (data.status as OrgMember["status"]) ?? "active",
    joinedAt: (data.joinedAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.(),
  };
}

export async function listMembers(orgId: string): Promise<OrgMember[]> {
  const snap = await getDocs(membersCol(orgId));
  return snap.docs
    .map((d) => mapMember(d.id, d.data()))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "ja"));
}

export async function listPendingInvites(orgId: string): Promise<OrgInvite[]> {
  // where クエリは未作成インデックスや空コレクションで失敗しやすいため全件取得してフィルタ
  const snap = await getDocs(collection(db, "organizations", orgId, "invites"));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        email: String(data.email ?? d.id),
        role: data.role as OrgInvite["role"],
        invitedBy: String(data.invitedBy ?? ""),
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        status: (data.status as OrgInvite["status"]) ?? "pending",
      };
    })
    .filter((i) => i.status === "pending");
}

/** 旧メンバー doc に欠落している status / email を補完 */
export async function ensureMemberDefaults(params: {
  orgId: string;
  uid: string;
  email?: string;
  displayName?: string;
}): Promise<OrgMember | null> {
  const ref = doc(db, "organizations", params.orgId, "members", params.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  const patch: {
    status?: string;
    email?: string;
    displayName?: string;
    updatedAt?: ReturnType<typeof serverTimestamp>;
  } = {};
  if (data.status == null) patch.status = "active";
  if (!data.email && params.email) patch.email = params.email;
  if (!data.displayName && params.displayName) {
    patch.displayName = params.displayName;
  }
  if (Object.keys(patch).length > 0) {
    patch.updatedAt = serverTimestamp();
    await updateDoc(ref, patch);
  }
  const fresh = await getDoc(ref);
  return fresh.exists() ? mapMember(fresh.id, fresh.data()) : null;
}

export async function inviteMember(params: {
  orgId: string;
  actorRole: MemberRole;
  invitedBy: string;
  email: string;
  role: Exclude<MemberRole, "owner">;
}): Promise<void> {
  requirePermission(params.actorRole, "members:write");
  const email = params.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("有効なメールアドレスを入力してください。");
  }

  const members = await listMembers(params.orgId);
  if (members.some((m) => m.email.toLowerCase() === email)) {
    throw new Error("このメールのメンバーは既に組織に所属しています。");
  }

  const pending = await listPendingInvites(params.orgId);
  if (pending.some((i) => i.email === email)) {
    throw new Error("このメールには既に招待が送られています。");
  }

  await setDoc(inviteRef(params.orgId, email), {
    email,
    role: params.role,
    invitedBy: params.invitedBy,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  await setDoc(emailInviteItemRef(email, params.orgId), {
    orgId: params.orgId,
    inviteId: email,
    role: params.role,
    invitedBy: params.invitedBy,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export async function revokeInvite(params: {
  orgId: string;
  actorRole: MemberRole;
  inviteId: string;
  email: string;
}): Promise<void> {
  requirePermission(params.actorRole, "members:write");
  const email = (params.email || params.inviteId).trim().toLowerCase();
  await updateDoc(inviteRef(params.orgId, email), {
    status: "revoked",
    revokedAt: serverTimestamp(),
  });
  await updateDoc(emailInviteItemRef(email, params.orgId), {
    status: "revoked",
    revokedAt: serverTimestamp(),
  }).catch(() => undefined);
}

export async function updateMemberRole(params: {
  orgId: string;
  actorUid: string;
  actorRole: MemberRole;
  targetUid: string;
  role: MemberRole;
}): Promise<void> {
  requirePermission(params.actorRole, "members:write");
  if (params.role === "owner" && params.actorRole !== "owner") {
    throw new Error("オーナー権限の付与はオーナーのみ可能です。");
  }

  const members = await listMembers(params.orgId);
  const target = members.find((m) => m.uid === params.targetUid);
  if (!target) throw new Error("メンバーが見つかりません。");

  if (target.role === "owner" && params.role !== "owner") {
    const owners = members.filter((m) => m.role === "owner" && m.status === "active");
    if (owners.length <= 1) {
      throw new Error("最後のオーナーの権限は変更できません。");
    }
  }

  await updateDoc(doc(db, "organizations", params.orgId, "members", params.targetUid), {
    role: params.role,
    updatedAt: serverTimestamp(),
  });
}

export async function setMemberStatus(params: {
  orgId: string;
  actorUid: string;
  actorRole: MemberRole;
  targetUid: string;
  status: "active" | "disabled";
}): Promise<void> {
  requirePermission(params.actorRole, "members:write");
  if (params.actorUid === params.targetUid) {
    throw new Error("自分自身のステータスは変更できません。");
  }

  const members = await listMembers(params.orgId);
  const target = members.find((m) => m.uid === params.targetUid);
  if (!target) throw new Error("メンバーが見つかりません。");

  if (target.role === "owner" && params.status === "disabled") {
    const owners = members.filter((m) => m.role === "owner" && m.status === "active");
    if (owners.length <= 1) {
      throw new Error("最後のオーナーは無効化できません。");
    }
  }

  await updateDoc(doc(db, "organizations", params.orgId, "members", params.targetUid), {
    status: params.status,
    updatedAt: serverTimestamp(),
  });
}

export async function updateMemberProfile(params: {
  orgId: string;
  uid: string;
  displayName: string;
  email?: string;
}): Promise<void> {
  await updateDoc(doc(db, "organizations", params.orgId, "members", params.uid), {
    displayName: params.displayName.trim(),
    ...(params.email ? { email: params.email } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function acceptPendingInvitesForUser(params: {
  uid: string;
  email: string;
  displayName: string;
}): Promise<string | null> {
  const email = params.email.trim().toLowerCase();
  if (!email) return null;

  let claimedOrgId: string | null = null;
  const snap = await getDocs(
    query(
      collection(db, "emailInvites", email, "items"),
      where("status", "==", "pending"),
    ),
  );

  for (const item of snap.docs) {
    const data = item.data();
    const orgId = String(data.orgId ?? item.id);
    const role = (data.role as MemberRole) || "viewer";
    if (!orgId) continue;

    const memberRef = doc(db, "organizations", orgId, "members", params.uid);
    await setDoc(memberRef, {
      role: role === "owner" ? "admin" : role,
      email: params.email,
      displayName: params.displayName,
      status: "active",
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(inviteRef(orgId, email), {
      status: "accepted",
      acceptedBy: params.uid,
      acceptedAt: serverTimestamp(),
    }).catch(() => undefined);

    await updateDoc(item.ref, {
      status: "accepted",
      acceptedBy: params.uid,
      acceptedAt: serverTimestamp(),
    });

    claimedOrgId = claimedOrgId ?? orgId;
  }

  return claimedOrgId;
}

export function assertCanAccessOrg(
  role: MemberRole | null | undefined,
  status: OrgMember["status"] | undefined,
): void {
  if (!role || status === "disabled") {
    throw new Error("この組織へのアクセス権がありません。");
  }
  if (!can(role, "org:read")) {
    throw new Error("この組織へのアクセス権がありません。");
  }
}
