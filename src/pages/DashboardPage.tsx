import { Link } from "react-router-dom";
import { OrganizationSetupPanel } from "@/components/OrganizationSetupPanel";
import { useAuth } from "@/context/AuthContext";

export function DashboardPage() {
  const { user, profile, organization, needsOrganizationSetup } = useAuth();

  if (needsOrganizationSetup) {
    return (
      <section className="page">
        <OrganizationSetupPanel />
      </section>
    );
  }

  const displayName =
    profile?.displayName || user?.displayName || user?.email || "—";

  return (
    <section className="page">
      <header className="page-header">
        <h2>ダッシュボード</h2>
        <p className="muted">
          会計コア（勘定科目・期間・仕訳・財務諸表）が利用できます。
        </p>
      </header>

      <div className="info-grid">
        <div className="info-block">
          <h3>組織</h3>
          <p>{organization?.name ?? "—"}</p>
        </div>
        <div className="info-block">
          <h3>ユーザー</h3>
          <p>{displayName}</p>
        </div>
        <div className="info-block">
          <h3>通貨</h3>
          <p>{organization?.currency ?? "JPY"}</p>
        </div>
        <div className="info-block">
          <h3>会計年度開始月</h3>
          <p>
            {organization ? `${organization.fiscalYearStartMonth}月` : "—"}
          </p>
        </div>
      </div>

      <div className="quick-links">
        <Link className="quick-link" to="/journals/new">
          仕訳を入力
        </Link>
        <Link className="quick-link" to="/reports/trial-balance">
          試算表
        </Link>
        <Link className="quick-link" to="/accounts">
          勘定科目
        </Link>
        <Link className="quick-link" to="/periods">
          会計期間
        </Link>
      </div>
    </section>
  );
}
