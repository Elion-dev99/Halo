import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { AccountsPage } from "@/pages/AccountsPage";
import { PeriodsPage } from "@/pages/PeriodsPage";
import { JournalsPage } from "@/pages/JournalsPage";
import { JournalFormPage } from "@/pages/JournalFormPage";
import { GeneralLedgerPage } from "@/pages/GeneralLedgerPage";
import { TrialBalancePage } from "@/pages/TrialBalancePage";
import { IncomeStatementPage } from "@/pages/IncomeStatementPage";
import { BalanceSheetPage } from "@/pages/BalanceSheetPage";
import { CustomersPage } from "@/pages/CustomersPage";
import { VendorsPage } from "@/pages/VendorsPage";
import { InvoicesPage } from "@/pages/InvoicesPage";
import { BillsPage } from "@/pages/BillsPage";
import { OrganizationSettingsPage } from "@/pages/OrganizationSettingsPage";
import { AccountSettingsPage } from "@/pages/AccountSettingsPage";
import { MembersSettingsPage } from "@/pages/MembersSettingsPage";
import { FeaturesSettingsPage } from "@/pages/FeaturesSettingsPage";

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
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/periods" element={<PeriodsPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/vendors" element={<VendorsPage />} />
            <Route path="/journals" element={<JournalsPage />} />
            <Route path="/journals/new" element={<JournalFormPage />} />
            <Route path="/journals/:id" element={<JournalFormPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route
              path="/reports/general-ledger"
              element={<GeneralLedgerPage />}
            />
            <Route
              path="/reports/trial-balance"
              element={<TrialBalancePage />}
            />
            <Route
              path="/reports/income-statement"
              element={<IncomeStatementPage />}
            />
            <Route
              path="/reports/balance-sheet"
              element={<BalanceSheetPage />}
            />
            <Route
              path="/settings/organization"
              element={<OrganizationSettingsPage />}
            />
            <Route path="/settings/account" element={<AccountSettingsPage />} />
            <Route path="/settings/members" element={<MembersSettingsPage />} />
            <Route
              path="/settings/features"
              element={<FeaturesSettingsPage />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
