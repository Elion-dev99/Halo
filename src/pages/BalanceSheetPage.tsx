import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  buildBalanceSheet,
  filterJournalsByPeriod,
  filterJournalsThroughDate,
  loadReportContext,
} from "@/services/reportService";
import type { AccountingPeriod, Account, JournalWithLines } from "@/types/models";
import { downloadCsv, formatYen } from "@/utils/accounting";

export function BalanceSheetPage() {
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
        setError("貸借対照表の読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId]);

  const period = periods.find((p) => p.id === periodId) ?? null;

  const sheet = useMemo(() => {
    if (!period) {
      return buildBalanceSheet(accounts, journals, journals);
    }
    const throughEnd = filterJournalsThroughDate(journals, period.endDate);
    const inPeriod = filterJournalsByPeriod(journals, period);
    return buildBalanceSheet(accounts, throughEnd, inPeriod);
  }, [accounts, journals, period]);

  function exportCsv() {
    downloadCsv(`balance-sheet-${period?.name ?? "all"}.csv`, [
      ["区分", "コード", "科目", "金額"],
      ...sheet.assets.map((r) => [
        "資産",
        r.account.code,
        r.account.name,
        String(r.balance),
      ]),
      ["資産合計", "", "", String(sheet.totalAssets)],
      ...sheet.liabilities.map((r) => [
        "負債",
        r.account.code,
        r.account.name,
        String(r.balance),
      ]),
      ["負債合計", "", "", String(sheet.totalLiabilities)],
      ...sheet.equity.map((r) => [
        "純資産",
        r.account.code,
        r.account.name,
        String(r.balance),
      ]),
      ["当期純利益", "", "", String(sheet.netIncome)],
      ["純資産合計", "", "", String(sheet.totalEquity)],
      ["負債・純資産合計", "", "", String(sheet.totalLiabilitiesAndEquity)],
    ]);
  }

  return (
    <section className="page">
      <header className="page-header row-between">
        <div>
          <h2>貸借対照表</h2>
          <p className="muted">
            期末時点の財政状態。当期純利益を純資産に加算し貸借を検算します。
          </p>
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
              {p.name}（〜{p.endDate}）
            </option>
          ))}
        </select>
        <span className={sheet.balanced ? "tag tag-ok" : "tag"}>
          {sheet.balanced ? "貸借一致" : "貸借不一致"}
        </span>
      </div>

      <div className="panel">
        {loading ? (
          <p className="muted">読み込み中…</p>
        ) : (
          <div className="bs-grid">
            <div>
              <h3>資産</h3>
              <table className="data-table">
                <tbody>
                  {sheet.assets.map((r) => (
                    <tr key={r.account.id}>
                      <td>
                        {r.account.code} {r.account.name}
                      </td>
                      <td className="num">{formatYen(r.balance)}</td>
                    </tr>
                  ))}
                  <tr>
                    <th>資産合計</th>
                    <th className="num">{formatYen(sheet.totalAssets)}</th>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <h3>負債・純資産</h3>
              <table className="data-table">
                <tbody>
                  {sheet.liabilities.map((r) => (
                    <tr key={r.account.id}>
                      <td>
                        {r.account.code} {r.account.name}
                      </td>
                      <td className="num">{formatYen(r.balance)}</td>
                    </tr>
                  ))}
                  <tr>
                    <th>負債合計</th>
                    <th className="num">{formatYen(sheet.totalLiabilities)}</th>
                  </tr>
                  {sheet.equity.map((r) => (
                    <tr key={r.account.id}>
                      <td>
                        {r.account.code} {r.account.name}
                      </td>
                      <td className="num">{formatYen(r.balance)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>当期純利益</td>
                    <td className="num">{formatYen(sheet.netIncome)}</td>
                  </tr>
                  <tr>
                    <th>純資産合計</th>
                    <th className="num">{formatYen(sheet.totalEquity)}</th>
                  </tr>
                  <tr>
                    <th>負債・純資産合計</th>
                    <th className="num">
                      {formatYen(sheet.totalLiabilitiesAndEquity)}
                    </th>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
