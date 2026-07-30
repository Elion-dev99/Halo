import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { MissingOrganizationNotice } from "@/components/OrganizationSetupPanel";
import { updateOrganizationSettings } from "@/services/orgService";
import { listAccounts } from "@/services/accountService";
import { ROLE_LABELS } from "@/domain/permissions";
import type { Account } from "@/types/models";

export function OrganizationSettingsPage() {
  const { organization, role, can, refreshSession } = useAuth();
  const orgId = organization?.id;
  const canWrite = can("settings:write") || can("org:write");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [fiscalYearStartMonth, setFiscalYearStartMonth] = useState(4);
  const [defaultArAccountCode, setDefaultArAccountCode] = useState("1100");
  const [defaultApAccountCode, setDefaultApAccountCode] = useState("2000");
  const [defaultCashAccountCode, setDefaultCashAccountCode] = useState("1010");
  const [defaultRevenueAccountCode, setDefaultRevenueAccountCode] =
    useState("4000");
  const [defaultExpenseAccountCode, setDefaultExpenseAccountCode] =
    useState("5900");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organization) return;
    setName(organization.name);
    setFiscalYearStartMonth(organization.fiscalYearStartMonth);
    setDefaultArAccountCode(organization.defaultArAccountCode);
    setDefaultApAccountCode(organization.defaultApAccountCode);
    setDefaultCashAccountCode(organization.defaultCashAccountCode);
    setDefaultRevenueAccountCode(organization.defaultRevenueAccountCode);
    setDefaultExpenseAccountCode(organization.defaultExpenseAccountCode);
  }, [organization]);

  useEffect(() => {
    if (!orgId) return;
    void listAccounts(orgId)
      .then(setAccounts)
      .catch((err) => console.error(err));
  }, [orgId]);

  const codeOptions = useMemo(
    () =>
      accounts
        .filter((a) => a.isPostable && a.isActive)
        .map((a) => ({ value: a.code, label: `${a.code} ${a.name}` })),
    [accounts],
  );

  if (!organization) return <MissingOrganizationNotice />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!orgId || !canWrite) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateOrganizationSettings(orgId, {
        name,
        fiscalYearStartMonth,
        defaultArAccountCode,
        defaultApAccountCode,
        defaultCashAccountCode,
        defaultRevenueAccountCode,
        defaultExpenseAccountCode,
      });
      await refreshSession();
      setMessage("組織設定を保存しました。");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>組織設定</h2>
          <p className="muted">会社情報と会計デフォルト科目を管理します。</p>
        </div>
        {role ? (
          <p className="muted">あなたの権限: {ROLE_LABELS[role]}</p>
        ) : null}
      </div>

      <form className="panel" onSubmit={onSubmit}>
        <h3>基本情報</h3>
        <div className="form-grid-2">
          <label>
            組織名
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canWrite}
              required
            />
          </label>
          <label>
            会計年度開始月
            <select
              value={fiscalYearStartMonth}
              onChange={(e) => setFiscalYearStartMonth(Number(e.target.value))}
              disabled={!canWrite}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}月
                </option>
              ))}
            </select>
          </label>
          <label>
            通貨
            <input value="JPY" disabled />
          </label>
        </div>

        <h3>デフォルト科目コード</h3>
        <div className="form-grid-2">
          {(
            [
              ["売掛金", defaultArAccountCode, setDefaultArAccountCode],
              ["買掛金", defaultApAccountCode, setDefaultApAccountCode],
              ["現金/預金", defaultCashAccountCode, setDefaultCashAccountCode],
              ["売上", defaultRevenueAccountCode, setDefaultRevenueAccountCode],
              ["費用", defaultExpenseAccountCode, setDefaultExpenseAccountCode],
            ] as const
          ).map(([label, value, setter]) => (
            <label key={label}>
              {label}
              <select
                value={value}
                onChange={(e) => setter(e.target.value)}
                disabled={!canWrite}
              >
                {codeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="success-text">{message}</p> : null}

        {canWrite ? (
          <div className="toolbar">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        ) : (
          <p className="muted">閲覧のみの権限です。</p>
        )}
      </form>
    </div>
  );
}
