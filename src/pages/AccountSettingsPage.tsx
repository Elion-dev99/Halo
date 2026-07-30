import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { MissingOrganizationNotice } from "@/components/OrganizationSetupPanel";
import { ROLE_LABELS } from "@/domain/permissions";

export function AccountSettingsPage() {
  const { user, profile, membership, role, organization, updateDisplayName } =
    useAuth();
  const [displayName, setDisplayName] = useState(
    profile?.displayName ?? user?.displayName ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!organization) return <MissingOrganizationNotice />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateDisplayName(displayName);
      setMessage("アカウント情報を更新しました。");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "更新に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>アカウント設定</h2>
          <p className="muted">ログイン中のユーザー情報を管理します。</p>
        </div>
      </div>

      <form className="panel" onSubmit={onSubmit}>
        <div className="form-grid-2">
          <label>
            表示名
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </label>
          <label>
            メールアドレス
            <input value={user?.email ?? profile?.email ?? ""} disabled />
          </label>
          <label>
            組織内権限
            <input
              value={role ? ROLE_LABELS[role] : "未設定"}
              disabled
            />
          </label>
          <label>
            メンバー状態
            <input value={membership?.status ?? "—"} disabled />
          </label>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="success-text">{message}</p> : null}

        <div className="toolbar">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}
