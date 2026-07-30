import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { MissingOrganizationNotice } from "@/components/OrganizationSetupPanel";
import {
  createFiscalYearPeriods,
  createPeriod,
  listPeriods,
  seedFiscalYearPeriodsIfEmpty,
  setPeriodStatus,
} from "@/services/periodService";
import type { AccountingPeriod } from "@/types/models";
import {
  fiscalYearStartYearForDate,
  formatDate,
  lastDayOfMonth,
  periodName,
} from "@/utils/dates";

export function PeriodsPage() {
  const { organization, user } = useAuth();
  const orgId = organization?.id;
  const fiscalStart = organization?.fiscalYearStartMonth ?? 4;

  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [year, setYear] = useState(
    fiscalYearStartYearForDate(new Date(), fiscalStart),
  );
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [saving, setSaving] = useState(false);

  async function reload() {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      setPeriods(await listPeriods(orgId));
    } catch (err) {
      console.error(err);
      setError("会計期間の読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function onCreateMonth(event: FormEvent) {
    event.preventDefault();
    if (!orgId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await createPeriod(orgId, {
        name: periodName(year, month),
        startDate: formatDate(year, month, 1),
        endDate: formatDate(year, month, lastDayOfMonth(year, month)),
      });
      setMessage(`期間 ${periodName(year, month)} を作成しました。`);
      await reload();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "作成に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function generateFiscalYear() {
    if (!orgId) return;
    setError(null);
    setMessage(null);
    try {
      const created = await createFiscalYearPeriods(orgId, fiscalStart, year);
      setMessage(
        created > 0
          ? `${year}年度開始の月次期間を ${created} 件作成しました。`
          : "作成対象の期間は既に存在します。",
      );
      await reload();
    } catch (err) {
      console.error(err);
      setError("会計年度の一括作成に失敗しました。");
    }
  }

  async function seedIfEmpty() {
    if (!orgId) return;
    setError(null);
    setMessage(null);
    try {
      const count = await seedFiscalYearPeriodsIfEmpty(orgId, fiscalStart);
      setMessage(
        count > 0
          ? `当会計年度の期間を ${count} 件投入しました。`
          : "既に期間があるため投入しませんでした。",
      );
      await reload();
    } catch (err) {
      console.error(err);
      setError("期間の初期投入に失敗しました。");
    }
  }

  async function toggleStatus(period: AccountingPeriod) {
    if (!orgId || !user) return;
    setError(null);
    try {
      const next = period.status === "open" ? "closed" : "open";
      await setPeriodStatus(orgId, period.id, next, user.uid);
      await reload();
    } catch (err) {
      console.error(err);
      setError("期間ステータスの更新に失敗しました。");
    }
  }

  if (!orgId) {
    return <MissingOrganizationNotice />;
  }

  return (
    <section className="page">
      <header className="page-header row-between">
        <div>
          <h2>会計期間</h2>
          <p className="muted">
            月次期間の作成とオープン/クローズ。クローズ期間への転記禁止は Stage 3
            で強制します。
          </p>
        </div>
        <div className="toolbar">
          <button type="button" className="btn btn-secondary" onClick={() => void seedIfEmpty()}>
            空なら当年度を投入
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void generateFiscalYear()}
          >
            年度を一括作成
          </button>
        </div>
      </header>

      {error ? <p className="form-error banner-error">{error}</p> : null}
      {message ? <p className="banner-ok">{message}</p> : null}

      <div className="split-layout">
        <form className="panel stack-form" onSubmit={onCreateMonth}>
          <h3>月次期間を追加</h3>
          <label>
            年
            <input
              type="number"
              required
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </label>
          <label>
            月
            <input
              type="number"
              min={1}
              max={12}
              required
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            />
          </label>
          <p className="muted small">
            会計年度開始月: {fiscalStart}月 / 一括作成は左の「年」を開始年として 12
            ヶ月分を作ります。
          </p>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "作成中…" : "この月を作成"}
          </button>
        </form>

        <div className="panel">
          {loading ? (
            <p className="muted">読み込み中…</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>期間</th>
                    <th>開始</th>
                    <th>終了</th>
                    <th>状態</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => (
                    <tr
                      key={period.id}
                      className={period.status === "closed" ? "row-muted" : ""}
                    >
                      <td>{period.name}</td>
                      <td>{period.startDate}</td>
                      <td>{period.endDate}</td>
                      <td>
                        <span
                          className={
                            period.status === "open" ? "tag tag-ok" : "tag"
                          }
                        >
                          {period.status === "open" ? "オープン" : "クローズ"}
                        </span>
                      </td>
                      <td className="row-actions">
                        <button
                          type="button"
                          className="linkish"
                          onClick={() => void toggleStatus(period)}
                        >
                          {period.status === "open" ? "クローズ" : "再オープン"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {periods.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="muted">
                        期間がありません。年度を一括作成してください。
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
