import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { SettingsPage } from "@/features/auth/pages/SettingsPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { EntriesPage } from "@/features/entries/pages/EntriesPage";
import { LogMealPage } from "@/features/entries/pages/LogMealPage";
import { GoalsPage } from "@/features/goals/pages/GoalsPage";
import { PlaceholderPage } from "@/features/placeholders/PlaceholderPage";
import { ReportsPage } from "@/features/reports/pages/ReportsPage";
import { GuestRoute, ProtectedRoute } from "@/routes/ProtectedRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="log" element={<LogMealPage />} />
          <Route path="entries" element={<EntriesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route
            path="chat"
            element={
              <PlaceholderPage
                title="Chat"
                description="Natural-language assistant for logging and summaries."
              />
            }
          />
          <Route
            path="import"
            element={
              <PlaceholderPage title="Import" description="Bulk import food diary PDFs." />
            }
          />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
