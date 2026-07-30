export type MemberRole = "owner" | "admin" | "accountant" | "viewer";

export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense";

export type NormalBalance = "debit" | "credit";

export type PeriodStatus = "open" | "closed";

export type JournalStatus = "draft" | "posted" | "void";

export interface UserProfile {
  email: string;
  displayName: string;
  defaultOrgId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  fiscalYearStartMonth: number;
  currency: "JPY";
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

export interface OrgMember {
  uid: string;
  role: MemberRole;
  displayName?: string;
  joinedAt: Date;
}
