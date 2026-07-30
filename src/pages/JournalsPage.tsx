import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MissingOrganizationNotice } from "@/components/OrganizationSetupPanel";
import { useAuth } from "@/context/AuthContext";
import { listAccounts } from "@/services/accountService";
import { listJournalsWithAccountIds } from "@/services/journalService";
import { listPeriods } from "@/services/periodService";
import type { Account, AccountingPeriod, Journal, JournalStatus } from "@/types/models";
import { JOURNAL_STATUS_LABELS } from "@/types/models";
import { formatYen } from "@/domain/journalEngine";

type JournalRow = Journal & { accountIds: string[] };

export function JournalsPage() {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const [journals, setJournals] = useState<JournalRow[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<JournalStatus | "all">("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");

  useEffect(() => {
    if (!orgId) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [jRows, aRows, pRows] = await Promise.all([
          listJournalsWithAccountIds(orgId),
          listAccounts(orgId),
          listPeriods(orgId),
        ]);
        setJournals(jRows);
        setAccounts(aRows);
        setPeriods(pRows);
      } catch (err) {
        console.error(err);
        setError("仕訳一覧の読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId]);

  const periodNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of periods) map.set(p.id, p.name);
    return map;
  }, [periods]);

  const filtered = useMemo(() => {
    return journals.filter((j) => {
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (periodFilter !== "all") {
        const period = periods.find((p) => p.id === periodFilter);
        if (!period) return false;
        if (j.periodId) {
          if (j.periodId !== periodFilter) return false;
        } else if (!(period.startDate <= j.date && j.date <= period.endDate)) {
          return false;
        }
      }
      if (accountFilter !== "all" && !j.accountIds.includes(accountFilter)) {
        return false;
      }
      return true;
    });
  }, [journals, statusFilter, periodFilter, accountFilter, periods]);

  if (!orgId) {
    return <MissingOrganizationNotice />;
  }

  return (
    <section className="page">
      <header className="page-header row-between">
        <div>
          <h2>仕訳</h2>
          <p className="muted">複式仕訳の一覧・入力・転記・取消</p>
        </div>
        <Link className="btn btn-primary" to="/journals/new">
          仕訳を入力
        </Link>
      </header>

      {error ? <p className="form-error banner-error">{error}</p> : null}

      <div className="toolbar wrap panel-filters">
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as JournalStatus | "all")
          }
        >
          <option value="all">すべてのステータス</option>
          <option value="draft">下書き</option>
          <option value="posted">転記済</option>
          <option value="void">取消</option>
        </select>
        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
        >
          <option value="all">すべての期間</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.status === "open" ? "開" : "閉"})
            </option>
          ))}
        </select>
        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
        >
          <option value="all">すべての科目</option>
          {accounts
            .filter((a) => a.isPostable)
            .map((a) => (
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
                  <th>期間</th>
                  <th>金額</th>
                  <th>状態</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((journal) => (
                  <tr
                    key={journal.id}
                    className={journal.status === "void" ? "row-muted" : ""}
                  >
                    <td>
                      <Link to={`/journals/${journal.id}`}>{journal.date}</Link>
                    </td>
                    <td>{journal.entryNumber ?? "—"}</td>
                    <td>{journal.memo || "—"}</td>
                    <td>
                      {journal.periodId
                        ? (periodNameById.get(journal.periodId) ?? "—")
                        : "—"}
                    </td>
                    <td className="num">{formatYen(journal.totalDebit)}</td>
                    <td>{JOURNAL_STATUS_LABELS[journal.status]}</td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">
                      仕訳がありません。
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
