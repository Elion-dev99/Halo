import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { MissingOrganizationNotice } from "@/components/OrganizationSetupPanel";
import { ROLE_LABELS } from "@/domain/permissions";

const MODULES = [
  {
    name: "総勘定元帳（GL）",
    status: "有効",
    description: "科目・期間・仕訳・試算表・PL・BS",
    to: "/journals",
  },
  {
    name: "売掛（AR）",
    status: "有効",
    description: "顧客・売上請求書・入金消込",
    to: "/invoices",
  },
  {
    name: "買掛（AP）",
    status: "有効",
    description: "仕入先・買掛請求・支払消込",
    to: "/bills",
  },
  {
    name: "組織 RBAC",
    status: "有効",
    description: "owner / admin / accountant / viewer",
    to: "/settings/members",
  },
  {
    name: "銀行照合",
    status: "予定",
    description: "次イテレーション（NetSuite Bank Reconciliation）",
    to: null,
  },
  {
    name: "税金 / 消費税",
    status: "予定",
    description: "税コード・仮受/仮払消費税の分離計上",
    to: null,
  },
  {
    name: "固定資産",
    status: "予定",
    description: "資産台帳・減価償却",
    to: null,
  },
  {
    name: "在庫・原価",
    status: "予定",
    description: "在庫評価・原価計算",
    to: null,
  },
  {
    name: "多通貨 / 連結",
    status: "予定",
    description: "為替・子会社連結",
    to: null,
  },
] as const;

export function FeaturesSettingsPage() {
  const { organization, role } = useAuth();
  if (!organization) return <MissingOrganizationNotice />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>機能設定</h2>
          <p className="muted">
            有効な会計モジュールと、NetSuite 相当ロードマップ上の予定機能です。
          </p>
        </div>
        {role ? <p className="muted">権限: {ROLE_LABELS[role]}</p> : null}
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>モジュール</th>
                <th>状態</th>
                <th>説明</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {MODULES.map((mod) => (
                <tr key={mod.name}>
                  <td>{mod.name}</td>
                  <td>
                    <span
                      className={
                        mod.status === "有効" ? "badge-ok" : "badge-muted"
                      }
                    >
                      {mod.status}
                    </span>
                  </td>
                  <td>{mod.description}</td>
                  <td>
                    {mod.to ? (
                      <Link className="btn btn-ghost" to={mod.to}>
                        開く
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted">
          詳細は <code>docs/NETSUITE_ROADMAP.md</code> を参照してください。
        </p>
      </div>
    </div>
  );
}
