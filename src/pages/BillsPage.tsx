import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { MissingOrganizationNotice } from "@/components/OrganizationSetupPanel";
import { listAccounts } from "@/services/accountService";
import { listVendors } from "@/services/partyService";
import {
  createDraftBill,
  listBills,
  postBill,
  recordVendorPayment,
  voidBill,
} from "@/services/billService";
import {
  BILL_STATUS_LABELS,
  type Bill,
  type BillLineInput,
  type Vendor,
} from "@/types/arAp";
import type { Account } from "@/types/models";
import { todayISO } from "@/utils/dates";

function emptyLine(expenseAccountId: string): BillLineInput {
  return {
    description: "",
    quantity: 1,
    unitPrice: 0,
    expenseAccountId,
  };
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function BillsPage() {
  const { organization, user, can } = useAuth();
  const orgId = organization?.id;
  const canWrite = can("ap:write");

  const [bills, setBills] = useState<Bill[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [vendorId, setVendorId] = useState("");
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(addDays(todayISO(), 30));
  const [memo, setMemo] = useState("");
  const [taxAmount, setTaxAmount] = useState(0);
  const [lines, setLines] = useState<BillLineInput[]>([emptyLine("")]);

  const [payBillId, setPayBillId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState(todayISO());

  const expenseAccounts = useMemo(
    () => accounts.filter((a) => a.type === "expense" && a.isPostable && a.isActive),
    [accounts],
  );
  const defaultExpenseId = useMemo(() => {
    const byCode = accounts.find(
      (a) => a.code === organization?.defaultExpenseAccountCode,
    );
    return byCode?.id ?? expenseAccounts[0]?.id ?? "";
  }, [accounts, organization, expenseAccounts]);

  async function reload() {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const [billRows, vendorRows, accts] = await Promise.all([
        listBills(orgId),
        listVendors(orgId),
        listAccounts(orgId),
      ]);
      setBills(billRows);
      setVendors(vendorRows.filter((v) => v.isActive));
      setAccounts(accts);
    } catch (err) {
      console.error(err);
      setError("買掛請求の読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  useEffect(() => {
    if (defaultExpenseId) {
      setLines((prev) =>
        prev.map((l) =>
          l.expenseAccountId ? l : { ...l, expenseAccountId: defaultExpenseId },
        ),
      );
    }
  }, [defaultExpenseId]);

  if (!organization) return <MissingOrganizationNotice />;
  if (!can("ap:read")) {
    return <div className="page"><p className="error-text">権限がありません。</p></div>;
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!orgId || !user || !canWrite) return;
    const vendor = vendors.find((v) => v.id === vendorId);
    if (!vendor) {
      setError("仕入先を選択してください。");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createDraftBill({
        orgId,
        uid: user.uid,
        vendorId: vendor.id,
        vendorName: vendor.name,
        issueDate,
        dueDate,
        memo,
        taxAmount,
        lines,
      });
      setShowForm(false);
      setMemo("");
      setTaxAmount(0);
      setLines([emptyLine(defaultExpenseId)]);
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
          <h2>買掛請求（AP）</h2>
          <p className="muted">
            確定時に買掛金仕訳を自動起票します。支払で消込します。
          </p>
        </div>
        {canWrite ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "フォームを閉じる" : "新規買掛請求"}
          </button>
        ) : null}
      </div>

      {showForm && canWrite ? (
        <form className="panel" onSubmit={onCreate}>
          <h3>新規買掛請求（下書き）</h3>
          <div className="form-grid-2">
            <label>
              仕入先
              <select
                value={vendorId}
                onChange={(e) => {
                  const id = e.target.value;
                  setVendorId(id);
                  const v = vendors.find((x) => x.id === id);
                  if (v) setDueDate(addDays(issueDate, v.paymentTermsDays));
                }}
                required
              >
                <option value="">選択…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.code} {v.name}
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
                費用科目
                <select
                  value={line.expenseAccountId}
                  onChange={(e) => {
                    const next = [...lines];
                    next[index] = { ...line, expenseAccountId: e.target.value };
                    setLines(next);
                  }}
                  required
                >
                  <option value="">選択…</option>
                  {expenseAccounts.map((a) => (
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
              onClick={() => setLines([...lines, emptyLine(defaultExpenseId)])}
            >
              行を追加
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "保存中…" : "下書き保存"}
            </button>
          </div>
          {vendors.length === 0 ? (
            <p className="muted">
              先に <Link to="/vendors">仕入先</Link> を登録してください。
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
                  <th>仕入先</th>
                  <th>請求日</th>
                  <th>状態</th>
                  <th>合計</th>
                  <th>残高</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id}>
                    <td>{bill.number}</td>
                    <td>{bill.vendorName}</td>
                    <td>{bill.issueDate}</td>
                    <td>{BILL_STATUS_LABELS[bill.status]}</td>
                    <td className="num">{bill.total.toLocaleString("ja-JP")}</td>
                    <td className="num">{bill.balanceDue.toLocaleString("ja-JP")}</td>
                    <td className="actions-cell">
                      {canWrite && bill.status === "draft" ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            if (!user || !orgId) return;
                            void postBill({
                              orgId,
                              billId: bill.id,
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
                      (bill.status === "open" || bill.status === "partial") ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            setPayBillId(bill.id);
                            setPayAmount(bill.balanceDue);
                            setPayDate(todayISO());
                          }}
                        >
                          支払
                        </button>
                      ) : null}
                      {canWrite &&
                      bill.status !== "void" &&
                      bill.amountPaid === 0 ? (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => {
                            if (!user || !orgId) return;
                            if (!confirm("この買掛請求を取消しますか？")) return;
                            void voidBill({
                              orgId,
                              billId: bill.id,
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
                      {bill.journalId ? (
                        <Link
                          className="btn btn-ghost"
                          to={`/journals/${bill.journalId}`}
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

      {payBillId && canWrite ? (
        <form
          className="panel"
          onSubmit={(event) => {
            event.preventDefault();
            if (!user || !orgId) return;
            void recordVendorPayment({
              orgId,
              uid: user.uid,
              billId: payBillId,
              paymentDate: payDate,
              amount: payAmount,
            })
              .then(() => {
                setPayBillId(null);
                return reload();
              })
              .catch((err) =>
                setError(
                  err instanceof Error ? err.message : "支払に失敗しました。",
                ),
              );
          }}
        >
          <h3>支払登録</h3>
          <div className="form-grid-2">
            <label>
              支払日
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
              支払を計上
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setPayBillId(null)}
            >
              閉じる
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
