import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { MissingOrganizationNotice } from "@/components/OrganizationSetupPanel";
import {
  inviteMember,
  listMembers,
  listPendingInvites,
  revokeInvite,
  setMemberStatus,
  updateMemberRole,
} from "@/services/memberService";
import { ROLE_LABELS } from "@/domain/permissions";
import type { MemberRole, OrgInvite, OrgMember } from "@/types/models";
import { MEMBER_ROLE_LABELS } from "@/types/models";

const ASSIGNABLE_ROLES: Exclude<MemberRole, "owner">[] = [
  "admin",
  "accountant",
  "viewer",
];

export function MembersSettingsPage() {
  const { organization, user, role, can, refreshSession } = useAuth();
  const orgId = organization?.id;
  const canWrite = can("members:write");

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<Exclude<MemberRole, "owner">>("accountant");
  const [saving, setSaving] = useState(false);

  async function reload() {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const memberRows = await listMembers(orgId);
      setMembers(memberRows);
      try {
        setInvites(await listPendingInvites(orgId));
      } catch (inviteErr) {
        console.warn(inviteErr);
        setInvites([]);
      }
    } catch (err) {
      console.error(err);
      const detail =
        err instanceof Error && err.message
          ? err.message
          : "メンバー一覧の読み込みに失敗しました。";
      setError(
        detail.includes("permission") || detail.includes("Permission")
          ? "権限エラーです。Firestore ルールを最新の firestore.rules で公開し、ページを再読み込みしてください。"
          : detail,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  if (!organization) return <MissingOrganizationNotice />;
  if (!can("members:read")) {
    return (
      <div className="page">
        <p className="error-text">メンバー管理を閲覧する権限がありません。</p>
      </div>
    );
  }

  async function onInvite(event: FormEvent) {
    event.preventDefault();
    if (!orgId || !role || !user) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await inviteMember({
        orgId,
        actorRole: role,
        invitedBy: user.uid,
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteEmail("");
      setMessage("招待を作成しました。相手がログインすると自動で参加します。");
      await reload();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "招待に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>メンバーと権限</h2>
          <p className="muted">
            組織メンバーのロール（owner / admin / accountant / viewer）を管理します。
          </p>
        </div>
        {role ? <p className="muted">あなた: {ROLE_LABELS[role]}</p> : null}
      </div>

      {canWrite ? (
        <form className="panel" onSubmit={onInvite}>
          <h3>メンバー招待</h3>
          <div className="form-grid-2">
            <label>
              メールアドレス
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="user@example.com"
              />
            </label>
            <label>
              権限
              <select
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as Exclude<MemberRole, "owner">)
                }
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {MEMBER_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "送信中…" : "招待する"}
          </button>
        </form>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}
      {message ? <p className="success-text">{message}</p> : null}

      <div className="panel">
        <h3>メンバー一覧</h3>
        {loading ? (
          <p className="muted">読み込み中…</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>名前</th>
                  <th>メール</th>
                  <th>権限</th>
                  <th>状態</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.uid}>
                    <td>{member.displayName || "—"}</td>
                    <td>{member.email || "—"}</td>
                    <td>
                      {canWrite ? (
                        <select
                          value={member.role}
                          disabled={member.uid === user?.uid && member.role === "owner"}
                          onChange={(e) => {
                            if (!role || !user || !orgId) return;
                            void updateMemberRole({
                              orgId,
                              actorUid: user.uid,
                              actorRole: role,
                              targetUid: member.uid,
                              role: e.target.value as MemberRole,
                            })
                              .then(() => reload())
                              .then(() => refreshSession())
                              .catch((err) =>
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : "権限の更新に失敗しました。",
                                ),
                              );
                          }}
                        >
                          {(
                            ["owner", "admin", "accountant", "viewer"] as MemberRole[]
                          ).map((r) => (
                            <option key={r} value={r}>
                              {MEMBER_ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        MEMBER_ROLE_LABELS[member.role]
                      )}
                    </td>
                    <td>{member.status}</td>
                    <td>
                      {canWrite && member.uid !== user?.uid ? (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => {
                            if (!role || !user || !orgId) return;
                            void setMemberStatus({
                              orgId,
                              actorUid: user.uid,
                              actorRole: role,
                              targetUid: member.uid,
                              status:
                                member.status === "disabled" ? "active" : "disabled",
                            })
                              .then(reload)
                              .catch((err) =>
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : "状態の更新に失敗しました。",
                                ),
                              );
                          }}
                        >
                          {member.status === "disabled" ? "有効化" : "無効化"}
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

      <div className="panel">
        <h3>保留中の招待</h3>
        {invites.length === 0 ? (
          <p className="muted">保留中の招待はありません。</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>メール</th>
                  <th>権限</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id}>
                    <td>{invite.email}</td>
                    <td>{MEMBER_ROLE_LABELS[invite.role]}</td>
                    <td>
                      {canWrite ? (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => {
                            if (!role || !orgId) return;
                            void revokeInvite({
                              orgId,
                              actorRole: role,
                              inviteId: invite.id,
                              email: invite.email,
                            })
                              .then(reload)
                              .catch((err) =>
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : "招待の取消に失敗しました。",
                                ),
                              );
                          }}
                        >
                          取消
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
