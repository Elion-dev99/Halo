import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { MissingOrganizationNotice } from "@/components/OrganizationSetupPanel";
import {
  createCustomer,
  listCustomers,
  updateCustomer,
} from "@/services/partyService";
import type { Customer, CustomerInput } from "@/types/arAp";

const empty = (): CustomerInput => ({
  code: "",
  name: "",
  email: "",
  phone: "",
  address: "",
  paymentTermsDays: 30,
  isActive: true,
  notes: "",
});

export function CustomersPage() {
  const { organization, can } = useAuth();
  const orgId = organization?.id;
  const canWrite = can("parties:write");

  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryText, setQueryText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerInput>(empty());
  const [saving, setSaving] = useState(false);

  async function reload() {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await listCustomers(orgId));
    } catch (err) {
      console.error(err);
      setError("顧客の読み込みに失敗しました。");
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
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q),
    );
  }, [rows, queryText]);

  if (!organization) return <MissingOrganizationNotice />;
  if (!can("parties:read")) {
    return <div className="page"><p className="error-text">権限がありません。</p></div>;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!orgId || !canWrite) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) await updateCustomer(orgId, editingId, form);
      else await createCustomer(orgId, form);
      setForm(empty());
      setEditingId(null);
      await reload();
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
          <h2>顧客</h2>
          <p className="muted">売掛（AR）の取引先マスタです。</p>
        </div>
      </div>

      {canWrite ? (
        <form className="panel" onSubmit={onSubmit}>
          <h3>{editingId ? "顧客を編集" : "顧客を追加"}</h3>
          <div className="form-grid-2">
            <label>
              コード
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
              />
            </label>
            <label>
              名称
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label>
              メール
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              電話
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <label>
              支払条件（日）
              <input
                type="number"
                min={0}
                value={form.paymentTermsDays}
                onChange={(e) =>
                  setForm({ ...form, paymentTermsDays: Number(e.target.value) })
                }
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              有効
            </label>
            <label className="full-width">
              住所
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </label>
            <label className="full-width">
              メモ
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
          </div>
          <div className="toolbar">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "保存中…" : "保存"}
            </button>
            {editingId ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm(empty());
                }}
              >
                キャンセル
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}

      <div className="panel panel-filters">
        <input
          placeholder="コード・名称・メールで検索"
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
        />
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
                  <th>名称</th>
                  <th>支払条件</th>
                  <th>状態</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>{row.code}</td>
                    <td>{row.name}</td>
                    <td>{row.paymentTermsDays}日</td>
                    <td>{row.isActive ? "有効" : "無効"}</td>
                    <td>
                      {canWrite ? (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => {
                            setEditingId(row.id);
                            setForm({
                              code: row.code,
                              name: row.name,
                              email: row.email,
                              phone: row.phone,
                              address: row.address,
                              paymentTermsDays: row.paymentTermsDays,
                              isActive: row.isActive,
                              notes: row.notes,
                            });
                          }}
                        >
                          編集
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
