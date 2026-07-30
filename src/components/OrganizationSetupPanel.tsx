import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function OrganizationSetupPanel({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { user, profile, setupOrganization } = useAuth();
  const [organizationName, setOrganizationName] = useState("");
  const [displayName, setDisplayName] = useState(
    profile?.displayName || user?.displayName || "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await setupOrganization({
        organizationName,
        displayName,
      });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "組織の作成に失敗しました。Firestore のルールがデプロイ済みか確認してください。",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={`setup-panel${compact ? " compact" : ""}`}>
      <header className="page-header">
        <h2>組織セットアップ</h2>
        <p className="muted">
          ログインはできていますが、会計データを置く組織がまだありません。
          下のフォームで組織を作成すると、勘定科目と会計期間が自動投入されます。
        </p>
      </header>

      <form className="panel stack-form" onSubmit={onSubmit}>
        <label>
          表示名
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
        <label>
          組織名（会社名）
          <input
            required
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            placeholder="例: 株式会社ハロー"
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <p className="muted small">
          権限エラーが出る場合は Firebase Console → Firestore → ルール に{" "}
          <code>firestore.rules</code> を公開してください（
          <code>docs/firestore-rules-deploy.md</code>）。
        </p>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "作成中…" : "組織を作成して開始"}
        </button>
      </form>

      {!compact ? (
        <p className="muted small setup-foot">
          すでに別アカウントで組織がある場合は、いったん{" "}
          <Link to="/login">ログアウト</Link> してから正しいアカウントで入り直してください。
        </p>
      ) : null}
    </section>
  );
}

export function MissingOrganizationNotice() {
  return (
    <section className="page">
      <OrganizationSetupPanel />
    </section>
  );
}
