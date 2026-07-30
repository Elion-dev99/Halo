import { useEffect, useMemo, useState } from "react";
import { MissingOrganizationNotice } from "@/components/OrganizationSetupPanel";
import { useAuth } from "@/context/AuthContext";
import {
  buildIncomeStatement,
  filterJournalsByPeriod,
  loadReportContext,
} from "@/services/reportService";
import type { AccountingPeriod, Account, JournalWithLines } from "@/types/models";
import { downloadCsv, formatYen } from "@/utils/accounting";

export function IncomeStatementPage() {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [journals, setJournals] = useState<JournalWithLines[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    void (async () => {
      setLoading(true);
      try {
        const ctx = await loadReportContext(orgId);
        setAccounts(ctx.accounts);
        setPeriods(ctx.periods);
        setJournals(ctx.journals);
        const open = ctx.periods.find((p) => p.status === "open");
        setPeriodId(open?.id ?? ctx.periods[0]?.id ?? "");
      } catch (err) {
        console.error(err);
        setError("損益計算書の読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId]);

  const period = periods.find((p) => p.id === periodId) ?? null;
  const statement = useMemo(() => {
    const scoped = filterJournalsByPeriod(journals, period);
    return buildIncomeStatement(accounts, scoped);
  }, [accounts, journals, period]);

  function exportCsv() {
    downloadCsv(`income-statement-${period?.name ?? "all"}.csv`, [
      ["区分", "コード", "科目", "金額"],
      ...statement.revenues.map((r) => [
        "収益",
        r.account.code,
        r.account.name,
        String(r.balance),
      ]),
      ["収益合計", "", "", String(statement.totalRevenue)],
      ...statement.expenses.map((r) => [
        "費用",
        r.account.code,
        r.account.name,
        String(r.balance),
      ]),
      ["費用合計", "", "", String(statement.totalExpense)],
      ["当期純利益", "", "", String(statement.netIncome)],
    ]);
  }

  if (!orgId) {
    return <MissingOrganizationNotice />;
  }

  return (
    <section className="page">
      <header className="page-header row-between">
        <div>
          <h2>損益計算書</h2>
          <p className="muted">期間の収益・費用・当期純利益</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={exportCsv}>
          CSV
        </button>
      </header>

      {error ? <p className="form-error banner-error">{error}</p> : null}

      <div className="toolbar wrap panel-filters">
        <select value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="panel">
        {loading ? (
          <p className="muted">読み込み中…</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>科目</th>
                  <th className="num">金額</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th colSpan={2}>収益</th>
                </tr>
                {statement.revenues.map((r) => (
                  <tr key={r.account.id}>
                    <td>
                      {r.account.code} {r.account.name}
                    </td>
                    <td className="num">{formatYen(r.balance)}</td>
                  </tr>
                ))}
                <tr>
                  <th>収益合計</th>
                  <th className="num">{formatYen(statement.totalRevenue)}</th>
                </tr>
                <tr>
                  <th colSpan={2}>費用</th>
                </tr>
                {statement.expenses.map((r) => (
                  <tr key={r.account.id}>
                    <td>
                      {r.account.code} {r.account.name}
                    </td>
                    <td className="num">{formatYen(r.balance)}</td>
                  </tr>
                ))}
                <tr>
                  <th>費用合計</th>
                  <th className="num">{formatYen(statement.totalExpense)}</th>
                </tr>
                <tr>
                  <th>当期純利益</th>
                  <th className="num">{formatYen(statement.netIncome)}</th>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
