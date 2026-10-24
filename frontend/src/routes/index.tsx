import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { SettingsPage } from "@/features/auth/pages/SettingsPage";
import { GoalsPage } from "@/features/goals/pages/GoalsPage";
import { HomePage } from "@/features/placeholders/HomePage";
import { PlaceholderPage } from "@/features/placeholders/PlaceholderPage";
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
          <Route index element={<HomePage />} />
          <Route
            path="log"
            element={
              <PlaceholderPage title="Log meal" description="Create food entries by meal type." />
            }
          />
          <Route
            path="entries"
            element={
              <PlaceholderPage
                title="Entries"
                description="Browse and filter food entries by date and meal type."
              />
            }
          />
          <Route
            path="reports"
            element={
              <PlaceholderPage
                title="Reports"
                description="Calorie trends, macros, micros, and goal comparisons."
              />
            }
          />
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
