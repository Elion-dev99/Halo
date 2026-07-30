import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  buildGeneralLedger,
  filterJournalsByPeriod,
  loadReportContext,
} from "@/services/reportService";
import type { Account, AccountingPeriod, JournalWithLines } from "@/types/models";
import { downloadCsv, formatYen } from "@/utils/accounting";

export function GeneralLedgerPage() {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [journals, setJournals] = useState<JournalWithLines[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    void (async () => {
      setLoading(true);
      try {
        const ctx = await loadReportContext(orgId);
        setAccounts(ctx.accounts.filter((a) => a.isPostable));
        setPeriods(ctx.periods);
        setJournals(ctx.journals);
        const open = ctx.periods.find((p) => p.status === "open");
        setPeriodId(open?.id ?? ctx.periods[0]?.id ?? "");
        setAccountId(ctx.accounts.find((a) => a.isPostable)?.id ?? "");
      } catch (err) {
        console.error(err);
        setError("総勘定元帳の読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId]);

  const period = periods.find((p) => p.id === periodId) ?? null;
  const account = accounts.find((a) => a.id === accountId) ?? null;

  const entries = useMemo(() => {
    if (!account) return [];
    const scoped = filterJournalsByPeriod(journals, period);
    return buildGeneralLedger(account, scoped);
  }, [account, journals, period]);

  function exportCsv() {
    if (!account) return;
    downloadCsv(`general-ledger-${account.code}.csv`, [
      ["日付", "仕訳番号", "摘要", "行摘要", "借方", "貸方", "残高"],
      ...entries.map((e) => [
        e.date,
        e.entryNumber ?? "",
        e.memo,
        e.lineMemo,
        String(e.debit),
        String(e.credit),
        String(e.balance),
      ]),
    ]);
  }

  return (
    <section className="page">
      <header className="page-header row-between">
        <div>
          <h2>総勘定元帳</h2>
          <p className="muted">科目別・期間別の転記済明細と残高推移</p>
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
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} {a.name}
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
                  <th>日付</th>
                  <th>番号</th>
                  <th>摘要</th>
                  <th className="num">借方</th>
                  <th className="num">貸方</th>
                  <th className="num">残高</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={`${e.journalId}-${i}`}>
                    <td>
                      <Link to={`/journals/${e.journalId}`}>{e.date}</Link>
                    </td>
                    <td>{e.entryNumber}</td>
                    <td>{e.lineMemo || e.memo || "—"}</td>
                    <td className="num">{e.debit ? formatYen(e.debit) : ""}</td>
                    <td className="num">{e.credit ? formatYen(e.credit) : ""}</td>
                    <td className="num">{formatYen(e.balance)}</td>
                  </tr>
                ))}
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">
                      明細がありません。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
