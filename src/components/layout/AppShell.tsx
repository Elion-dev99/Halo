import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { to: "/", label: "ダッシュボード", end: true },
  { to: "/accounts", label: "勘定科目", end: false },
  { to: "/periods", label: "会計期間", end: false },
  { to: "/journals", label: "仕訳", end: false },
  { to: "/reports/general-ledger", label: "総勘定元帳", end: false },
  { to: "/reports/trial-balance", label: "試算表", end: false },
  { to: "/reports/income-statement", label: "損益計算書", end: false },
  { to: "/reports/balance-sheet", label: "貸借対照表", end: false },
];

export function AppShell() {
  const { profile, organization, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">H</div>
          <div>
            <p className="brand-name">Halo</p>
            <p className="brand-sub">Accounting Core</p>
          </div>
        </div>

        <nav className="side-nav" aria-label="メインメニュー">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="org-name">{organization?.name ?? "組織未設定"}</p>
          <p className="user-name">{profile?.displayName ?? profile?.email}</p>
          <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
            ログアウト
          </button>
        </div>
      </aside>

      <div className="main-pane">
        <header className="topbar">
          <h1 className="page-kicker">統合会計システム</h1>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
