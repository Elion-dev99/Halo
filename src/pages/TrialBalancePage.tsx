import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  buildTrialBalance,
  filterJournalsByPeriod,
  loadReportContext,
} from "@/services/reportService";
import type { AccountingPeriod, Account, JournalWithLines } from "@/types/models";
import { ACCOUNT_TYPE_LABELS } from "@/types/models";
import { downloadCsv, formatYen } from "@/utils/accounting";

export function TrialBalancePage() {
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
        setError("試算表の読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId]);

  const period = periods.find((p) => p.id === periodId) ?? null;
  const rows = useMemo(() => {
    const scoped = filterJournalsByPeriod(journals, period);
    return buildTrialBalance(accounts, scoped);
  }, [accounts, journals, period]);

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  function exportCsv() {
    downloadCsv(`trial-balance-${period?.name ?? "all"}.csv`, [
      ["コード", "科目名", "タイプ", "借方", "貸方"],
      ...rows.map((r) => [
        r.account.code,
        r.account.name,
        ACCOUNT_TYPE_LABELS[r.account.type],
        String(r.debit),
        String(r.credit),
      ]),
      ["", "合計", "", String(totalDebit), String(totalCredit)],
    ]);
  }

  return (
    <section className="page">
      <header className="page-header row-between">
        <div>
          <h2>試算表</h2>
          <p className="muted">期間内の転記済仕訳を集計</p>
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
        <span className={totalDebit === totalCredit ? "tag tag-ok" : "tag"}>
          {totalDebit === totalCredit ? "貸借一致" : "不一致"}
        </span>
      </div>

      <div className="panel">
        {loading ? (
          <p className="muted">読み込み中…</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>コード</th>
                  <th>科目</th>
                  <th>タイプ</th>
                  <th className="num">借方</th>
                  <th className="num">貸方</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.account.id}>
                    <td>{row.account.code}</td>
                    <td>{row.account.name}</td>
                    <td>{ACCOUNT_TYPE_LABELS[row.account.type]}</td>
                    <td className="num">{formatYen(row.debit)}</td>
                    <td className="num">{formatYen(row.credit)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={3}>合計</th>
                  <th className="num">{formatYen(totalDebit)}</th>
                  <th className="num">{formatYen(totalCredit)}</th>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
