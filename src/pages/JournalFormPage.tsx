import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { listAccounts } from "@/services/accountService";
import {
  createAndPostJournal,
  createDraftJournal,
  getJournalWithLines,
  postJournal,
  updateDraftJournal,
  voidJournal,
  deleteDraftJournal,
} from "@/services/journalService";
import type { Account, JournalLineInput, JournalWithLines } from "@/types/models";
import { JOURNAL_STATUS_LABELS } from "@/types/models";
import { formatYen, summarizeLines } from "@/utils/accounting";

function blankLine(): JournalLineInput {
  return { accountId: "", debit: 0, credit: 0, memo: "" };
}

function today(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function JournalFormPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { organization, user } = useAuth();
  const orgId = organization?.id;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journal, setJournal] = useState<JournalWithLines | null>(null);
  const [date, setDate] = useState(today());
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<JournalLineInput[]>([
    blankLine(),
    blankLine(),
  ]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const postableAccounts = useMemo(
    () => accounts.filter((a) => a.isPostable && a.isActive),
    [accounts],
  );

  const totals = summarizeLines(lines);
  const balanced = totals.debit === totals.credit && totals.debit > 0;
  const readOnly = Boolean(journal && journal.status !== "draft");

  useEffect(() => {
    if (!orgId) return;
    void (async () => {
      try {
        const aRows = await listAccounts(orgId);
        setAccounts(aRows);
        if (!isNew && id) {
          setLoading(true);
          const row = await getJournalWithLines(orgId, id);
          if (!row) {
            setError("仕訳が見つかりません。");
            return;
          }
          setJournal(row);
          setDate(row.date);
          setMemo(row.memo);
          setLines(
            row.lines.map((l) => ({
              accountId: l.accountId,
              debit: l.debit,
              credit: l.credit,
              memo: l.memo,
            })),
          );
        }
      } catch (err) {
        console.error(err);
        setError("読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId, id, isNew]);

  function updateLine(index: number, patch: Partial<JournalLineInput>) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  }

  async function saveDraft(event?: FormEvent) {
    event?.preventDefault();
    if (!orgId || !user || readOnly) return;
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const newId = await createDraftJournal({
          orgId,
          uid: user.uid,
          date,
          memo,
          lines,
          accounts,
        });
        navigate(`/journals/${newId}`, { replace: true });
      } else if (id) {
        await updateDraftJournal({
          orgId,
          journalId: id,
          date,
          memo,
          lines,
          accounts,
        });
        const refreshed = await getJournalWithLines(orgId, id);
        setJournal(refreshed);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function saveAndPost() {
    if (!orgId || !user || readOnly) return;
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const newId = await createAndPostJournal({
          orgId,
          uid: user.uid,
          date,
          memo,
          lines,
        });
        navigate(`/journals/${newId}`, { replace: true });
      } else if (id) {
        await updateDraftJournal({
          orgId,
          journalId: id,
          date,
          memo,
          lines,
          accounts,
        });
        await postJournal({ orgId, journalId: id, uid: user.uid });
        navigate(`/journals/${id}`, { replace: true });
        const refreshed = await getJournalWithLines(orgId, id);
        setJournal(refreshed);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "転記に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function onVoid() {
    if (!orgId || !user || !id || isNew) return;
    const reason = window.prompt("取消理由（任意）") ?? "";
    setSaving(true);
    setError(null);
    try {
      await voidJournal({ orgId, journalId: id, uid: user.uid, reason });
      const refreshed = await getJournalWithLines(orgId, id);
      setJournal(refreshed);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "取消に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteDraft() {
    if (!orgId || !id || isNew) return;
    if (!window.confirm("この下書きを削除しますか？")) return;
    setSaving(true);
    try {
      await deleteDraftJournal(orgId, id);
      navigate("/journals");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "削除に失敗しました。");
      setSaving(false);
    }
  }

  if (!orgId) {
    return (
      <section className="page">
        <p className="muted">組織が設定されていません。</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="page">
        <p className="muted">読み込み中…</p>
      </section>
    );
  }

  return (
    <section className="page">
      <header className="page-header row-between">
        <div>
          <h2>{isNew ? "仕訳入力" : "仕訳詳細"}</h2>
          <p className="muted">
            {journal
              ? `${JOURNAL_STATUS_LABELS[journal.status]}${
                  journal.entryNumber ? ` / ${journal.entryNumber}` : ""
                }`
              : "複数借方・複数貸方に対応"}
          </p>
        </div>
        <Link className="btn btn-secondary" to="/journals">
          一覧へ
        </Link>
      </header>

      {error ? <p className="form-error banner-error">{error}</p> : null}

      <form className="panel stack-form" onSubmit={(e) => void saveDraft(e)}>
        <div className="form-grid-2">
          <label>
            仕訳日
            <input
              type="date"
              required
              disabled={readOnly}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            摘要
            <input
              disabled={readOnly}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="取引の説明"
            />
          </label>
        </div>

        <div className="table-wrap">
          <table className="data-table journal-lines">
            <thead>
              <tr>
                <th>勘定科目</th>
                <th>借方</th>
                <th>貸方</th>
                <th>行摘要</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={index}>
                  <td>
                    <select
                      disabled={readOnly}
                      required
                      value={line.accountId}
                      onChange={(e) =>
                        updateLine(index, { accountId: e.target.value })
                      }
                    >
                      <option value="">選択</option>
                      {postableAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} {a.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      disabled={readOnly}
                      value={line.debit || ""}
                      onChange={(e) =>
                        updateLine(index, {
                          debit: Number(e.target.value) || 0,
                          credit: 0,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      disabled={readOnly}
                      value={line.credit || ""}
                      onChange={(e) =>
                        updateLine(index, {
                          credit: Number(e.target.value) || 0,
                          debit: 0,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      disabled={readOnly}
                      value={line.memo}
                      onChange={(e) =>
                        updateLine(index, { memo: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    {!readOnly && lines.length > 2 ? (
                      <button
                        type="button"
                        className="linkish"
                        onClick={() =>
                          setLines((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        削除
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th>合計</th>
                <th className="num">{formatYen(totals.debit)}</th>
                <th className="num">{formatYen(totals.credit)}</th>
                <th colSpan={2}>
                  {balanced ? (
                    <span className="tag tag-ok">貸借一致</span>
                  ) : (
                    <span className="tag">未一致</span>
                  )}
                </th>
              </tr>
            </tfoot>
          </table>
        </div>

        {!readOnly ? (
          <div className="toolbar">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setLines((prev) => [...prev, blankLine()])}
            >
              行を追加
            </button>
            <button className="btn btn-secondary" type="submit" disabled={saving}>
              下書き保存
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={() => void saveAndPost()}
            >
              転記する
            </button>
            {!isNew && journal?.status === "draft" ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving}
                onClick={() => void onDeleteDraft()}
              >
                下書き削除
              </button>
            ) : null}
          </div>
        ) : (
          <div className="toolbar">
            {journal?.status === "posted" ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving}
                onClick={() => void onVoid()}
              >
                取消（void）
              </button>
            ) : null}
          </div>
        )}
      </form>
    </section>
  );
}
