import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { HomePage } from "@/features/placeholders/HomePage";
import { PlaceholderPage } from "@/features/placeholders/PlaceholderPage";

export function AppRoutes() {
  return (
    <Routes>
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
        <Route
          path="goals"
          element={
            <PlaceholderPage title="Goals" description="Nutrition targets and weight progress." />
          }
        />
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
        <Route
          path="settings"
          element={
            <PlaceholderPage title="Settings" description="Profile, timezone, and account." />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
