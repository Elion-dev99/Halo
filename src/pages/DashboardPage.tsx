import { Link } from "react-router-dom";
import { OrganizationSetupPanel } from "@/components/OrganizationSetupPanel";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/domain/permissions";

export function DashboardPage() {
  const { user, profile, organization, role, needsOrganizationSetup, can } =
    useAuth();

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
          GL・売掛（AR）・買掛（AP）・組織権限・設定が利用できます。
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
          <h3>権限</h3>
          <p>{role ? ROLE_LABELS[role] : "—"}</p>
        </div>
        <div className="info-block">
          <h3>会計年度開始月</h3>
          <p>
            {organization ? `${organization.fiscalYearStartMonth}月` : "—"}
          </p>
        </div>
      </div>

      <div className="quick-links">
        {can("journals:write") ? (
          <Link className="quick-link" to="/journals/new">
            仕訳を入力
          </Link>
        ) : null}
        {can("ar:read") ? (
          <Link className="quick-link" to="/invoices">
            売上請求書
          </Link>
        ) : null}
        {can("ap:read") ? (
          <Link className="quick-link" to="/bills">
            買掛請求
          </Link>
        ) : null}
        {can("reports:read") ? (
          <Link className="quick-link" to="/reports/trial-balance">
            試算表
          </Link>
        ) : null}
        {can("settings:read") ? (
          <Link className="quick-link" to="/settings/organization">
            組織設定
          </Link>
        ) : null}
        {can("members:read") ? (
          <Link className="quick-link" to="/settings/members">
            メンバーと権限
          </Link>
        ) : null}
      </div>
    </section>
  );
}
