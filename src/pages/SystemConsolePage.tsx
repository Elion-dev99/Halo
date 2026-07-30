import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { listMembers, ensureMemberDefaults } from "@/services/memberService";
import {
  listAllOrganizations,
  listPlatformAdminDocs,
  platformAdminEmailsFromEnv,
  upsertPlatformAdmin,
} from "@/services/platformAdminService";
import type { Organization, OrgMember } from "@/types/models";
import { MEMBER_ROLE_LABELS } from "@/types/models";

export function SystemConsolePage() {
  const {
    user,
    profile,
    organization,
    membership,
    role,
    isPlatformAdmin,
    sysConsoleVisible,
    refreshSession,
  } = useAuth();

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [admins, setAdmins] = useState<Array<{ uid: string; email: string; note: string }>>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newAdminUid, setNewAdminUid] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");

  useEffect(() => {
    if (!isPlatformAdmin || !sysConsoleVisible) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [orgRows, adminRows] = await Promise.all([
          listAllOrganizations().catch(() => [] as Organization[]),
          listPlatformAdminDocs().catch(() => []),
        ]);
        setOrgs(orgRows);
        setAdmins(adminRows);
        if (organization?.id) {
          setMembers(await listMembers(organization.id).catch(() => []));
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, [isPlatformAdmin, sysConsoleVisible, organization?.id]);

  if (!isPlatformAdmin || !sysConsoleVisible) {
    return <Navigate to="/" replace />;
  }

  async function backfillCurrentOrgMembers() {
    if (!organization || !user) return;
    setMessage(null);
    setError(null);
    try {
      const rows = await listMembers(organization.id);
      for (const m of rows) {
        await ensureMemberDefaults({
          orgId: organization.id,
          uid: m.uid,
          email: m.email || undefined,
          displayName: m.displayName || undefined,
        });
      }
      // 自分自身も確実に
      await ensureMemberDefaults({
        orgId: organization.id,
        uid: user.uid,
        email: user.email ?? profile?.email,
        displayName: profile?.displayName,
      });
      setMembers(await listMembers(organization.id));
      await refreshSession();
      setMessage("メンバーの status / email を補完しました。");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "補完に失敗しました。");
    }
  }

  async function onAddAdmin(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setError(null);
    setMessage(null);
    try {
      await upsertPlatformAdmin({
        uid: newAdminUid.trim(),
        email: newAdminEmail.trim(),
        grantedBy: user.uid,
        note: "granted from sys console",
      });
      setNewAdminUid("");
      setNewAdminEmail("");
      setAdmins(await listPlatformAdminDocs());
      setMessage("platformAdmin を追加しました。");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "追加に失敗しました（Firestore に自分の platformAdmins/{uid} が必要です）。",
      );
    }
  }

  return (
    <div className="page sys-console">
      <div className="page-header">
        <div>
          <h2>System</h2>
          <p className="muted">開発・運用コンソール（一般ユーザー非表示）</p>
        </div>
        <Link className="btn btn-ghost" to="/">
          戻る
        </Link>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {message ? <p className="success-text">{message}</p> : null}

      <div className="panel">
        <h3>セッション</h3>
        <div className="form-grid-2">
          <label>
            UID
            <input value={user?.uid ?? ""} readOnly />
          </label>
          <label>
            Email
            <input value={user?.email ?? ""} readOnly />
          </label>
          <label>
            Org
            <input value={organization?.id ?? ""} readOnly />
          </label>
          <label>
            Role
            <input value={role ?? ""} readOnly />
          </label>
          <label>
            Member status
            <input value={membership?.status ?? ""} readOnly />
          </label>
          <label>
            Env allowlist
            <input
              value={platformAdminEmailsFromEnv().join(", ") || "(empty)"}
              readOnly
            />
          </label>
        </div>
      </div>

      <div className="panel">
        <h3>メンテ</h3>
        <p className="muted">
          旧メンバー doc に <code>status</code> が無いと一覧が permission-denied になります。
          ルール公開後、ここで補完できます。
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void backfillCurrentOrgMembers()}
        >
          現在組織のメンバーを補完
        </button>
        {!loading && members.length > 0 ? (
          <div className="table-wrap" style={{ marginTop: "1rem" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>UID</th>
                  <th>名前</th>
                  <th>権限</th>
                  <th>status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.uid}>
                    <td className="mono">{m.uid.slice(0, 8)}…</td>
                    <td>{m.displayName}</td>
                    <td>{MEMBER_ROLE_LABELS[m.role]}</td>
                    <td>{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="panel">
        <h3>全組織 ({orgs.length})</h3>
        {loading ? (
          <p className="muted">読み込み中…</p>
        ) : orgs.length === 0 ? (
          <p className="muted">
            取得できませんでした。Firestore に <code>platformAdmins/&#123;あなたのUID&#125;</code>{" "}
            を作成し、ルールを公開してください。
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>名前</th>
                  <th>ID</th>
                  <th>作成者</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <tr key={o.id}>
                    <td>{o.name}</td>
                    <td className="mono">{o.id}</td>
                    <td className="mono">{o.createdBy.slice(0, 8)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Platform admins</h3>
        <p className="muted">
          Env: {platformAdminEmailsFromEnv().join(", ") || "未設定"} / Firestore:{" "}
          {admins.length} 件
        </p>
        <ul className="sys-admin-list">
          {admins.map((a) => (
            <li key={a.uid}>
              <code>{a.email || a.uid}</code>
            </li>
          ))}
        </ul>
        <form className="form-grid-2" onSubmit={onAddAdmin}>
          <label>
            UID
            <input
              value={newAdminUid}
              onChange={(e) => setNewAdminUid(e.target.value)}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Firestore に追加
          </button>
        </form>
      </div>
    </div>
  );
}
