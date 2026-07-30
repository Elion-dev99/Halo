import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  createAccount,
  listAccounts,
  seedDefaultAccountsIfEmpty,
  setAccountActive,
  updateAccount,
} from "@/services/accountService";
import {
  ACCOUNT_TYPE_LABELS,
  DEFAULT_NORMAL_BALANCE,
  type Account,
  type AccountInput,
  type AccountType,
  type NormalBalance,
} from "@/types/models";

const emptyForm = (): AccountInput => ({
  code: "",
  name: "",
  type: "asset",
  normalBalance: "debit",
  parentId: null,
  isPostable: true,
  isActive: true,
  sortOrder: 0,
});

export function AccountsPage() {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryText, setQueryText] = useState("");
  const [typeFilter, setTypeFilter] = useState<AccountType | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountInput>(emptyForm());
  const [saving, setSaving] = useState(false);

  async function reload() {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await listAccounts(orgId);
      setAccounts(rows);
    } catch (err) {
      console.error(err);
      setError("勘定科目の読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return accounts.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (!q) return true;
      return (
        a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
      );
    });
  }, [accounts, queryText, typeFilter]);

  const parentOptions = useMemo(
    () => accounts.filter((a) => a.id !== editingId),
    [accounts, editingId],
  );

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
  }

  function startEdit(account: Account) {
    setEditingId(account.id);
    setForm({
      code: account.code,
      name: account.name,
      type: account.type,
      normalBalance: account.normalBalance,
      parentId: account.parentId,
      isPostable: account.isPostable,
      isActive: account.isActive,
      sortOrder: account.sortOrder,
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!orgId) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateAccount(orgId, editingId, form);
      } else {
        await createAccount(orgId, {
          ...form,
          sortOrder: form.sortOrder || Number(form.code) || 0,
        });
      }
      startCreate();
      await reload();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(account: Account) {
    if (!orgId) return;
    setError(null);
    try {
      await setAccountActive(orgId, account.id, !account.isActive);
      await reload();
    } catch (err) {
      console.error(err);
      setError("有効/無効の更新に失敗しました。");
    }
  }

  async function seedDefaults() {
    if (!orgId) return;
    setError(null);
    try {
      const count = await seedDefaultAccountsIfEmpty(orgId);
      if (count === 0) {
        setError("既に科目があるため初期科目は投入しませんでした。");
      }
      await reload();
    } catch (err) {
      console.error(err);
      setError("初期科目の投入に失敗しました。");
    }
  }

  if (!orgId) {
    return (
      <section className="page">
        <p className="muted">組織が設定されていません。</p>
      </section>
    );
  }

  return (
    <section className="page">
      <header className="page-header row-between">
        <div>
          <h2>勘定科目</h2>
          <p className="muted">コード・階層・有効/無効を管理します。</p>
        </div>
        <div className="toolbar">
          <button type="button" className="btn btn-secondary" onClick={startCreate}>
            新規作成
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => void seedDefaults()}>
            初期科目を投入
          </button>
        </div>
      </header>

      {error ? <p className="form-error banner-error">{error}</p> : null}

      <div className="split-layout">
        <form className="panel stack-form" onSubmit={onSubmit}>
          <h3>{editingId ? "科目を編集" : "科目を追加"}</h3>
          <label>
            科目コード
            <input
              required
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
          </label>
          <label>
            科目名
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label>
            タイプ
            <select
              value={form.type}
              onChange={(e) => {
                const type = e.target.value as AccountType;
                setForm((f) => ({
                  ...f,
                  type,
                  normalBalance: DEFAULT_NORMAL_BALANCE[type],
                }));
              }}
            >
              {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((t) => (
                <option key={t} value={t}>
                  {ACCOUNT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label>
            正規残高
            <select
              value={form.normalBalance}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  normalBalance: e.target.value as NormalBalance,
                }))
              }
            >
              <option value="debit">借方</option>
              <option value="credit">貸方</option>
            </select>
          </label>
          <label>
            親科目
            <select
              value={form.parentId ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  parentId: e.target.value || null,
                }))
              }
            >
              <option value="">なし</option>
              {parentOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            表示順
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))
              }
            />
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={form.isPostable}
              onChange={(e) =>
                setForm((f) => ({ ...f, isPostable: e.target.checked }))
              }
            />
            仕訳可能（集計科目でない）
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((f) => ({ ...f, isActive: e.target.checked }))
              }
            />
            有効
          </label>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "保存中…" : editingId ? "更新する" : "追加する"}
          </button>
        </form>

        <div className="panel">
          <div className="toolbar wrap">
            <input
              className="search-input"
              placeholder="コード・名称で検索"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
            />
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as AccountType | "all")
              }
            >
              <option value="all">すべてのタイプ</option>
              {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((t) => (
                <option key={t} value={t}>
                  {ACCOUNT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="muted">読み込み中…</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>コード</th>
                    <th>名称</th>
                    <th>タイプ</th>
                    <th>状態</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((account) => (
                    <tr key={account.id} className={account.isActive ? "" : "row-muted"}>
                      <td>{account.code}</td>
                      <td>
                        {account.name}
                        {!account.isPostable ? (
                          <span className="tag">集計</span>
                        ) : null}
                      </td>
                      <td>{ACCOUNT_TYPE_LABELS[account.type]}</td>
                      <td>{account.isActive ? "有効" : "無効"}</td>
                      <td className="row-actions">
                        <button
                          type="button"
                          className="linkish"
                          onClick={() => startEdit(account)}
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          className="linkish"
                          onClick={() => void toggleActive(account)}
                        >
                          {account.isActive ? "無効化" : "有効化"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="muted">
                        該当する科目がありません。
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
