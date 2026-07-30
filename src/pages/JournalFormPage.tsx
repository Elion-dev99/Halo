import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MissingOrganizationNotice } from "@/components/OrganizationSetupPanel";
import { useAuth } from "@/context/AuthContext";
import {
  canDeleteJournal,
  canEditJournal,
  canPostJournal,
  canVoidJournal,
  createEmptyLine,
  createInitialDraft,
  formatYen,
  setLineAmount,
  summarizeLines,
  todayISO,
  validateJournalDraft,
} from "@/domain/journalEngine";
import { listAccounts } from "@/services/accountService";
import {
  createAndPostJournal,
  createDraftJournal,
  deleteDraftJournal,
  getJournalWithLines,
  postJournal,
  updateDraftJournal,
  voidJournal,
} from "@/services/journalService";
import type { Account, JournalLineInput, JournalWithLines } from "@/types/models";
import { JOURNAL_STATUS_LABELS } from "@/types/models";

export function JournalFormPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { organization, user } = useAuth();
  const orgId = organization?.id;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journal, setJournal] = useState<JournalWithLines | null>(null);
  const [date, setDate] = useState(todayISO());
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<JournalLineInput[]>(
    createInitialDraft().lines,
  );
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accountsById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  const postableAccounts = useMemo(
    () => accounts.filter((a) => a.isPostable && a.isActive),
    [accounts],
  );

  const totals = summarizeLines(lines);
  const validationError = validateJournalDraft(
    { date, memo, lines },
    accountsById,
  );
  const readOnly = Boolean(journal && !canEditJournal(journal.status));

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    void (async () => {
      setError(null);
      try {
        const aRows = await listAccounts(orgId);
        if (cancelled) return;
        setAccounts(aRows);
        if (!isNew && id) {
          setLoading(true);
          const row = await getJournalWithLines(orgId, id);
          if (cancelled) return;
          if (!row) {
            setError("仕訳が見つかりません。");
            return;
          }
          setJournal(row);
          setDate(row.date);
          setMemo(row.memo);
          setLines(
            row.lines.length >= 2
              ? row.lines.map((l) => ({
                  accountId: l.accountId,
                  debit: l.debit,
                  credit: l.credit,
                  memo: l.memo,
                }))
              : createInitialDraft().lines,
          );
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("読み込みに失敗しました。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, id, isNew]);

  function updateLine(index: number, patch: Partial<JournalLineInput>) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  }

  async function saveDraft(event?: FormEvent) {
    event?.preventDefault();
    if (!orgId || !user || readOnly) return;
    if (validationError) {
      setError(validationError);
      return;
    }
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
    if (validationError) {
      setError(validationError);
      return;
    }
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
        await postJournal({ orgId, journalId: id, uid: user.uid });
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
    if (!orgId || !user || !id || isNew || !journal) return;
    if (!canVoidJournal(journal.status)) return;
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
    if (!orgId || !id || isNew || !journal) return;
    if (!canDeleteJournal(journal.status)) return;
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
    return <MissingOrganizationNotice />;
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

      <form className="panel stack-form journal-form" onSubmit={(e) => void saveDraft(e)}>
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

        <div className="journal-line-list" role="list">
          {lines.map((line, index) => (
            <div className="journal-line-card" role="listitem" key={index}>
              <div className="journal-line-card-head">
                <strong>明細 {index + 1}</strong>
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
              </div>

              <label>
                勘定科目
                <select
                  disabled={readOnly}
                  value={line.accountId}
                  onChange={(e) =>
                    updateLine(index, { accountId: e.target.value })
                  }
                >
                  <option value="">選択してください</option>
                  {postableAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} {a.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="form-grid-2">
                <label>
                  借方
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    disabled={readOnly}
                    value={line.debit || ""}
                    onChange={(e) =>
                      updateLine(index, setLineAmount(line, "debit", e.target.value))
                    }
                  />
                </label>
                <label>
                  貸方
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    disabled={readOnly}
                    value={line.credit || ""}
                    onChange={(e) =>
                      updateLine(index, setLineAmount(line, "credit", e.target.value))
                    }
                  />
                </label>
              </div>

              <label>
                行摘要
                <input
                  disabled={readOnly}
                  value={line.memo}
                  onChange={(e) => updateLine(index, { memo: e.target.value })}
                  placeholder="任意"
                />
              </label>
            </div>
          ))}
        </div>

        <div className="journal-totals">
          <div>
            <span className="muted">借方合計</span>
            <strong>{formatYen(totals.debit)}</strong>
          </div>
          <div>
            <span className="muted">貸方合計</span>
            <strong>{formatYen(totals.credit)}</strong>
          </div>
          <div>
            {totals.balanced ? (
              <span className="tag tag-ok">貸借一致</span>
            ) : (
              <span className="tag">
                差額 {formatYen(Math.abs(totals.difference))}
              </span>
            )}
          </div>
        </div>

        {!readOnly ? (
          <div className="toolbar journal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setLines((prev) => [...prev, createEmptyLine()])}
            >
              行を追加
            </button>
            <button className="btn btn-secondary" type="submit" disabled={saving}>
              下書き保存
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving || !canPostJournal(journal?.status ?? "draft")}
              onClick={() => void saveAndPost()}
            >
              転記する
            </button>
            {!isNew && journal && canDeleteJournal(journal.status) ? (
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
          <div className="toolbar journal-actions">
            {journal && canVoidJournal(journal.status) && journal.status === "posted" ? (
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
