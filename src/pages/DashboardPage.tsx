import { useAuth } from "@/context/AuthContext";

export function DashboardPage() {
  const { profile, organization } = useAuth();

  return (
    <section className="page">
      <header className="page-header">
        <h2>ダッシュボード</h2>
        <p className="muted">
          Stage 1 の空シェルです。マスタと仕訳は Stage 2 以降で実装します。
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
            {organization
              ? `${organization.fiscalYearStartMonth}月`
              : "—"}
          </p>
        </div>
      </div>
    </section>
  );
}
