import type { AccountType, NormalBalance } from "@/types/models";
import { DEFAULT_NORMAL_BALANCE } from "@/types/models";

export interface SeedAccount {
  code: string;
  name: string;
  type: AccountType;
  normalBalance?: NormalBalance;
  isPostable?: boolean;
  sortOrder: number;
}

/** 日本の基本科目セット（Stage 2 初期投入） */
export const DEFAULT_CHART_OF_ACCOUNTS: SeedAccount[] = [
  { code: "1000", name: "現金", type: "asset", sortOrder: 1000 },
  { code: "1010", name: "普通預金", type: "asset", sortOrder: 1010 },
  { code: "1100", name: "売掛金", type: "asset", sortOrder: 1100 },
  { code: "1200", name: "商品", type: "asset", sortOrder: 1200 },
  { code: "1500", name: "建物", type: "asset", sortOrder: 1500 },
  { code: "2000", name: "買掛金", type: "liability", sortOrder: 2000 },
  { code: "2100", name: "未払金", type: "liability", sortOrder: 2100 },
  { code: "2200", name: "借入金", type: "liability", sortOrder: 2200 },
  { code: "3000", name: "資本金", type: "equity", sortOrder: 3000 },
  { code: "3100", name: "繰越利益剰余金", type: "equity", sortOrder: 3100 },
  { code: "4000", name: "売上高", type: "revenue", sortOrder: 4000 },
  { code: "5000", name: "売上原価", type: "expense", sortOrder: 5000 },
  { code: "5100", name: "給料手当", type: "expense", sortOrder: 5100 },
  { code: "5200", name: "地代家賃", type: "expense", sortOrder: 5200 },
  { code: "5300", name: "水道光熱費", type: "expense", sortOrder: 5300 },
  { code: "5400", name: "通信費", type: "expense", sortOrder: 5400 },
  { code: "5900", name: "雑費", type: "expense", sortOrder: 5900 },
];

export function withDefaults(seed: SeedAccount) {
  return {
    code: seed.code,
    name: seed.name,
    type: seed.type,
    normalBalance: seed.normalBalance ?? DEFAULT_NORMAL_BALANCE[seed.type],
    parentId: null as string | null,
    isPostable: seed.isPostable ?? true,
    isActive: true,
    sortOrder: seed.sortOrder,
  };
}
