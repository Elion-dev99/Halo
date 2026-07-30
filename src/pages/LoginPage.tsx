import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from
    ?.pathname;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={from || "/"} replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from || "/", { replace: true });
    } catch (err) {
      console.error(err);
      setError("ログインに失敗しました。メールとパスワードを確認してください。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-panel">
        <div className="auth-brand">
          <span className="brand-mark large">H</span>
          <h1>Halo</h1>
          <p>統合会計システムへログイン</p>
        </div>

        <form className="stack-form" onSubmit={onSubmit}>
          <label>
            メールアドレス
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            パスワード
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? "ログイン中…" : "ログイン"}
          </button>
        </form>

        <p className="auth-foot">
          アカウント未作成の方は <Link to="/register">新規登録</Link>
        </p>
      </div>
    </div>
  );
}
