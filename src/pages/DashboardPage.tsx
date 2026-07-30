import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function DashboardPage() {
  const { profile, organization } = useAuth();

  return (
    <section className="page">
      <header className="page-header">
        <h2>ダッシュボード</h2>
        <p className="muted">
          組織マスタと会計期間・勘定科目の準備ができました。仕訳は Stage 3 で実装します。
        </p>
      </header>

      <div className="info-grid">
        <div className="info-block">
          <h3>組織</h3>
          <p>{organization?.name ?? "—"}</p>
        </div>
        <div className="info-block">
          <h3>ユーザー</h3>
          <p>{profile?.displayName ?? "—"}</p>
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
        <Link className="quick-link" to="/accounts">
          勘定科目を管理
        </Link>
        <Link className="quick-link" to="/periods">
          会計期間を管理
        </Link>
      </div>
    </section>
  );
}
