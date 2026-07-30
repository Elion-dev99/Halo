import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { Permission } from "@/domain/permissions";
import { ROLE_LABELS } from "@/domain/permissions";

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  permission?: Permission | Permission[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "ホーム",
    items: [{ to: "/", label: "ダッシュボード", end: true }],
  },
  {
    label: "マスタ",
    items: [
      { to: "/accounts", label: "勘定科目", permission: "accounts:read" },
      { to: "/periods", label: "会計期間", permission: "periods:read" },
      { to: "/customers", label: "顧客", permission: "parties:read" },
      { to: "/vendors", label: "仕入先", permission: "parties:read" },
    ],
  },
  {
    label: "取引",
    items: [
      { to: "/journals", label: "仕訳", permission: "journals:read" },
      { to: "/invoices", label: "売上請求書", permission: "ar:read" },
      { to: "/bills", label: "買掛請求", permission: "ap:read" },
    ],
  },
  {
    label: "レポート",
    items: [
      {
        to: "/reports/general-ledger",
        label: "総勘定元帳",
        permission: "reports:read",
      },
      {
        to: "/reports/trial-balance",
        label: "試算表",
        permission: "reports:read",
      },
      {
        to: "/reports/income-statement",
        label: "損益計算書",
        permission: "reports:read",
      },
      {
        to: "/reports/balance-sheet",
        label: "貸借対照表",
        permission: "reports:read",
      },
    ],
  },
  {
    label: "設定",
    items: [
      {
        to: "/settings/organization",
        label: "組織設定",
        permission: "settings:read",
      },
      {
        to: "/settings/account",
        label: "アカウント",
        permission: "settings:read",
      },
      {
        to: "/settings/members",
        label: "メンバーと権限",
        permission: "members:read",
      },
      {
        to: "/settings/features",
        label: "機能設定",
        permission: "settings:read",
      },
    ],
  },
];

export function AppShell() {
  const { profile, organization, role, can, canAny, logout } = useAuth();
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

  const visibleGroups = useMemo(() => {
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (!item.permission) return true;
          if (Array.isArray(item.permission)) return canAny(item.permission);
          return can(item.permission);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [can, canAny]);

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
          {visibleGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              {group.items.map((item) => (
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
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="org-name">{organization?.name ?? "組織未設定"}</p>
          <p className="user-name">{profile?.displayName ?? profile?.email}</p>
          {role ? <p className="user-role">{ROLE_LABELS[role]}</p> : null}
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
