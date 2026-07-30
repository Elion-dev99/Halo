import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { MissingOrganizationNotice } from "@/components/OrganizationSetupPanel";
import { listAccounts } from "@/services/accountService";
import { listCustomers } from "@/services/partyService";
import {
  createDraftInvoice,
  listInvoices,
  postInvoice,
  recordCustomerPayment,
  voidInvoice,
} from "@/services/invoiceService";
import {
  INVOICE_STATUS_LABELS,
  type Customer,
  type Invoice,
  type InvoiceLineInput,
} from "@/types/arAp";
import type { Account } from "@/types/models";
import { todayISO } from "@/utils/dates";

function emptyLine(revenueAccountId: string): InvoiceLineInput {
  return {
    description: "",
    quantity: 1,
    unitPrice: 0,
    revenueAccountId,
  };
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function InvoicesPage() {
  const { organization, user, can } = useAuth();
  const orgId = organization?.id;
  const canWrite = can("ar:write");

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(addDays(todayISO(), 30));
  const [memo, setMemo] = useState("");
  const [taxAmount, setTaxAmount] = useState(0);
  const [lines, setLines] = useState<InvoiceLineInput[]>([emptyLine("")]);

  const [payInvoiceId, setPayInvoiceId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState(todayISO());

  const revenueAccounts = useMemo(
    () => accounts.filter((a) => a.type === "revenue" && a.isPostable && a.isActive),
    [accounts],
  );
  const defaultRevenueId = useMemo(() => {
    const byCode = accounts.find(
      (a) => a.code === organization?.defaultRevenueAccountCode,
    );
    return byCode?.id ?? revenueAccounts[0]?.id ?? "";
  }, [accounts, organization, revenueAccounts]);

  async function reload() {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const [inv, cust, accts] = await Promise.all([
        listInvoices(orgId),
        listCustomers(orgId),
        listAccounts(orgId),
      ]);
      setInvoices(inv);
      setCustomers(cust.filter((c) => c.isActive));
      setAccounts(accts);
    } catch (err) {
      console.error(err);
      setError("請求書の読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  useEffect(() => {
    if (defaultRevenueId) {
      setLines((prev) =>
        prev.map((l) =>
          l.revenueAccountId ? l : { ...l, revenueAccountId: defaultRevenueId },
        ),
      );
    }
  }, [defaultRevenueId]);

  if (!organization) return <MissingOrganizationNotice />;
  if (!can("ar:read")) {
    return <div className="page"><p className="error-text">権限がありません。</p></div>;
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!orgId || !user || !canWrite) return;
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) {
      setError("顧客を選択してください。");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createDraftInvoice({
        orgId,
        uid: user.uid,
        customerId: customer.id,
        customerName: customer.name,
        issueDate,
        dueDate,
        memo,
        taxAmount,
        lines,
      });
      setShowForm(false);
      setMemo("");
      setTaxAmount(0);
      setLines([emptyLine(defaultRevenueId)]);
      await reload();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "作成に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>売上請求書（AR）</h2>
          <p className="muted">
            確定時に売掛金仕訳を自動起票します。入金で消込します。
          </p>
        </div>
        {canWrite ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "フォームを閉じる" : "新規請求書"}
          </button>
        ) : null}
      </div>

      {showForm && canWrite ? (
        <form className="panel" onSubmit={onCreate}>
          <h3>新規請求書（下書き）</h3>
          <div className="form-grid-2">
            <label>
              顧客
              <select
                value={customerId}
                onChange={(e) => {
                  const id = e.target.value;
                  setCustomerId(id);
                  const c = customers.find((x) => x.id === id);
                  if (c) setDueDate(addDays(issueDate, c.paymentTermsDays));
                }}
                required
              >
                <option value="">選択…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              請求日
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
            </label>
            <label>
              支払期限
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </label>
            <label>
              税額（円）
              <input
                type="number"
                min={0}
                value={taxAmount}
                onChange={(e) => setTaxAmount(Number(e.target.value))}
              />
            </label>
            <label className="full-width">
              メモ
              <input value={memo} onChange={(e) => setMemo(e.target.value)} />
            </label>
          </div>

          <h3>明細</h3>
          {lines.map((line, index) => (
            <div className="form-grid-2 line-row" key={index}>
              <label className="full-width">
                摘要
                <input
                  value={line.description}
                  onChange={(e) => {
                    const next = [...lines];
                    next[index] = { ...line, description: e.target.value };
                    setLines(next);
                  }}
                  required
                />
              </label>
              <label>
                数量
                <input
                  type="number"
                  min={0.01}
                  step="any"
                  value={line.quantity}
                  onChange={(e) => {
                    const next = [...lines];
                    next[index] = { ...line, quantity: Number(e.target.value) };
                    setLines(next);
                  }}
                />
              </label>
              <label>
                単価
                <input
                  type="number"
                  min={0}
                  value={line.unitPrice}
                  onChange={(e) => {
                    const next = [...lines];
                    next[index] = { ...line, unitPrice: Number(e.target.value) };
                    setLines(next);
                  }}
                />
              </label>
              <label>
                売上科目
                <select
                  value={line.revenueAccountId}
                  onChange={(e) => {
                    const next = [...lines];
                    next[index] = { ...line, revenueAccountId: e.target.value };
                    setLines(next);
                  }}
                  required
                >
                  <option value="">選択…</option>
                  {revenueAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} {a.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
          <div className="toolbar">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setLines([...lines, emptyLine(defaultRevenueId)])}
            >
              行を追加
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "保存中…" : "下書き保存"}
            </button>
          </div>
          {customers.length === 0 ? (
            <p className="muted">
              先に <Link to="/customers">顧客</Link> を登録してください。
            </p>
          ) : null}
        </form>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}

      <div className="panel">
        {loading ? (
          <p className="muted">読み込み中…</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>番号</th>
                  <th>顧客</th>
                  <th>請求日</th>
                  <th>状態</th>
                  <th>合計</th>
                  <th>残高</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.number}</td>
                    <td>{inv.customerName}</td>
                    <td>{inv.issueDate}</td>
                    <td>{INVOICE_STATUS_LABELS[inv.status]}</td>
                    <td className="num">{inv.total.toLocaleString("ja-JP")}</td>
                    <td className="num">{inv.balanceDue.toLocaleString("ja-JP")}</td>
                    <td className="actions-cell">
                      {canWrite && inv.status === "draft" ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            if (!user || !orgId) return;
                            void postInvoice({
                              orgId,
                              invoiceId: inv.id,
                              uid: user.uid,
                            })
                              .then(reload)
                              .catch((err) =>
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : "確定に失敗しました。",
                                ),
                              );
                          }}
                        >
                          確定
                        </button>
                      ) : null}
                      {canWrite &&
                      (inv.status === "open" || inv.status === "partial") ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            setPayInvoiceId(inv.id);
                            setPayAmount(inv.balanceDue);
                            setPayDate(todayISO());
                          }}
                        >
                          入金
                        </button>
                      ) : null}
                      {canWrite &&
                      inv.status !== "void" &&
                      inv.amountPaid === 0 ? (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => {
                            if (!user || !orgId) return;
                            if (!confirm("この請求書を取消しますか？")) return;
                            void voidInvoice({
                              orgId,
                              invoiceId: inv.id,
                              uid: user.uid,
                            })
                              .then(reload)
                              .catch((err) =>
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : "取消に失敗しました。",
                                ),
                              );
                          }}
                        >
                          取消
                        </button>
                      ) : null}
                      {inv.journalId ? (
                        <Link
                          className="btn btn-ghost"
                          to={`/journals/${inv.journalId}`}
                        >
                          仕訳
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {payInvoiceId && canWrite ? (
        <form
          className="panel"
          onSubmit={(event) => {
            event.preventDefault();
            if (!user || !orgId) return;
            void recordCustomerPayment({
              orgId,
              uid: user.uid,
              invoiceId: payInvoiceId,
              paymentDate: payDate,
              amount: payAmount,
            })
              .then(() => {
                setPayInvoiceId(null);
                return reload();
              })
              .catch((err) =>
                setError(
                  err instanceof Error ? err.message : "入金に失敗しました。",
                ),
              );
          }}
        >
          <h3>入金登録</h3>
          <div className="form-grid-2">
            <label>
              入金日
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                required
              />
            </label>
            <label>
              金額
              <input
                type="number"
                min={1}
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                required
              />
            </label>
          </div>
          <div className="toolbar">
            <button type="submit" className="btn btn-primary">
              入金を計上
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setPayInvoiceId(null)}
            >
              閉じる
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
