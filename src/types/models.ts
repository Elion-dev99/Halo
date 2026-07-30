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

export type MemberStatus = "active" | "invited" | "disabled";

export interface Organization {
  id: string;
  name: string;
  fiscalYearStartMonth: number;
  currency: "JPY";
  /** デフォルト売掛金科目コード（例: 1100） */
  defaultArAccountCode: string;
  /** デフォルト買掛金科目コード（例: 2000） */
  defaultApAccountCode: string;
  /** デフォルト現金/預金科目コード（例: 1010） */
  defaultCashAccountCode: string;
  /** デフォルト売上科目コード（例: 4000） */
  defaultRevenueAccountCode: string;
  /** デフォルト費用科目コード（例: 5900） */
  defaultExpenseAccountCode: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

export interface OrgMember {
  uid: string;
  role: MemberRole;
  email: string;
  displayName: string;
  status: MemberStatus;
  joinedAt: Date;
  updatedAt?: Date;
}

export interface OrgInvite {
  id: string;
  email: string;
  role: Exclude<MemberRole, "owner">;
  invitedBy: string;
  createdAt: Date;
  status: "pending" | "accepted" | "revoked";
}

export interface OrganizationSettingsInput {
  name: string;
  fiscalYearStartMonth: number;
  defaultArAccountCode: string;
  defaultApAccountCode: string;
  defaultCashAccountCode: string;
  defaultRevenueAccountCode: string;
  defaultExpenseAccountCode: string;
}

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  owner: "オーナー",
  admin: "管理者",
  accountant: "経理",
  viewer: "閲覧者",
};

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  parentId: string | null;
  isPostable: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountInput {
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  parentId: string | null;
  isPostable: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface AccountingPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  createdAt: Date;
  closedAt?: Date;
  closedBy?: string;
}

export interface JournalLineInput {
  accountId: string;
  debit: number;
  credit: number;
  memo: string;
}

export interface JournalLine extends JournalLineInput {
  id: string;
  lineNo: number;
}

export interface Journal {
  id: string;
  date: string;
  memo: string;
  status: JournalStatus;
  periodId: string | null;
  entryNumber: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  postedAt?: Date;
  postedBy?: string;
  voidedAt?: Date;
  voidedBy?: string;
  voidReason?: string;
  totalDebit: number;
  totalCredit: number;
}

export interface JournalWithLines extends Journal {
  lines: JournalLine[];
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: "資産",
  liability: "負債",
  equity: "純資産",
  revenue: "収益",
  expense: "費用",
};

export const JOURNAL_STATUS_LABELS: Record<JournalStatus, string> = {
  draft: "下書き",
  posted: "転記済",
  void: "取消",
};

export const DEFAULT_NORMAL_BALANCE: Record<AccountType, NormalBalance> = {
  asset: "debit",
  liability: "credit",
  equity: "credit",
  revenue: "credit",
  expense: "debit",
};
