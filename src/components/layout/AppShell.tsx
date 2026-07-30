import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className={`app-shell${menuOpen ? " menu-open" : ""}`}>
      <header className="mobile-topbar">
        <button
          type="button"
          className="menu-toggle"
          aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="menu-toggle-bars" aria-hidden="true" />
        </button>
        <div className="mobile-brand">
          <span className="brand-mark compact">H</span>
          <span className="mobile-brand-name">Halo</span>
        </div>
        <span className="mobile-org" title={organization?.name ?? ""}>
          {organization?.name ?? "組織"}
        </span>
      </header>

      <div
        className="sidebar-backdrop"
        hidden={!menuOpen}
        onClick={() => setMenuOpen(false)}
      />

      <aside id="app-sidebar" className="sidebar">
        <div className="sidebar-header">
          <div className="brand-block">
            <div className="brand-mark">H</div>
            <div>
              <p className="brand-name">Halo</p>
              <p className="brand-sub">Accounting Core</p>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-close"
            aria-label="メニューを閉じる"
            onClick={() => setMenuOpen(false)}
          >
            ×
          </button>
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
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void logout()}
          >
            ログアウト
          </button>
        </div>
      </aside>

      <div className="main-pane">
        <header className="topbar desktop-only">
          <h1 className="page-kicker">統合会計システム</h1>
          <p className="topbar-org">{organization?.name}</p>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
