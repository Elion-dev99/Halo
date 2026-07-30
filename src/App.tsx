import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || undefined;

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route
              path="/accounts"
              element={<PlaceholderPage title="勘定科目" stage="Stage 2" />}
            />
            <Route
              path="/periods"
              element={<PlaceholderPage title="会計期間" stage="Stage 2" />}
            />
            <Route
              path="/journals"
              element={<PlaceholderPage title="仕訳" stage="Stage 3" />}
            />
            <Route
              path="/reports/general-ledger"
              element={<PlaceholderPage title="総勘定元帳" stage="Stage 4" />}
            />
            <Route
              path="/reports/trial-balance"
              element={<PlaceholderPage title="試算表" stage="Stage 4" />}
            />
            <Route
              path="/reports/income-statement"
              element={<PlaceholderPage title="損益計算書" stage="Stage 4" />}
            />
            <Route
              path="/reports/balance-sheet"
              element={<PlaceholderPage title="貸借対照表" stage="Stage 4" />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
