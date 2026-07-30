import type { MemberRole } from "@/types/models";

export type Permission =
  | "org:read"
  | "org:write"
  | "members:read"
  | "members:write"
  | "accounts:read"
  | "accounts:write"
  | "periods:read"
  | "periods:write"
  | "journals:read"
  | "journals:write"
  | "journals:post"
  | "reports:read"
  | "parties:read"
  | "parties:write"
  | "ar:read"
  | "ar:write"
  | "ap:read"
  | "ap:write"
  | "settings:read"
  | "settings:write";

const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  owner: [
    "org:read",
    "org:write",
    "members:read",
    "members:write",
    "accounts:read",
    "accounts:write",
    "periods:read",
    "periods:write",
    "journals:read",
    "journals:write",
    "journals:post",
    "reports:read",
    "parties:read",
    "parties:write",
    "ar:read",
    "ar:write",
    "ap:read",
    "ap:write",
    "settings:read",
    "settings:write",
  ],
  admin: [
    "org:read",
    "org:write",
    "members:read",
    "members:write",
    "accounts:read",
    "accounts:write",
    "periods:read",
    "periods:write",
    "journals:read",
    "journals:write",
    "journals:post",
    "reports:read",
    "parties:read",
    "parties:write",
    "ar:read",
    "ar:write",
    "ap:read",
    "ap:write",
    "settings:read",
    "settings:write",
  ],
  accountant: [
    "org:read",
    "members:read",
    "accounts:read",
    "accounts:write",
    "periods:read",
    "periods:write",
    "journals:read",
    "journals:write",
    "journals:post",
    "reports:read",
    "parties:read",
    "parties:write",
    "ar:read",
    "ar:write",
    "ap:read",
    "ap:write",
    "settings:read",
  ],
  viewer: [
    "org:read",
    "members:read",
    "accounts:read",
    "periods:read",
    "journals:read",
    "reports:read",
    "parties:read",
    "ar:read",
    "ap:read",
    "settings:read",
  ],
};

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "オーナー",
  admin: "管理者",
  accountant: "経理",
  viewer: "閲覧者",
};

export function permissionsFor(role: MemberRole | null | undefined): Set<Permission> {
  if (!role) return new Set();
  return new Set(ROLE_PERMISSIONS[role]);
}

export function can(
  role: MemberRole | null | undefined,
  permission: Permission,
): boolean {
  return permissionsFor(role).has(permission);
}

export function canAny(
  role: MemberRole | null | undefined,
  required: Permission[],
): boolean {
  return required.some((p) => can(role, p));
}
