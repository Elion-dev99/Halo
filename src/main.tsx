import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { firebaseConfigError } from "@/config/firebase";
import "@/styles/global.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root not found");
}

if (firebaseConfigError) {
  createRoot(root).render(
    <StrictMode>
      <div className="auth-screen">
        <div className="auth-panel">
          <div className="auth-brand">
            <span className="brand-mark large">H</span>
            <h1>Halo</h1>
            <p>セットアップが必要です</p>
          </div>
          <p className="form-error">{firebaseConfigError}</p>
          <p className="muted">
            Cloudflare Pages の Environment variables、またはローカルの{" "}
            <code>.env.local</code> に Firebase 設定を入れて再デプロイしてください。手順は{" "}
            <code>docs/cloudflare-pages.md</code> を参照。
          </p>
        </div>
      </div>
    </StrictMode>,
  );
} else {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
