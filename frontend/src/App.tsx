import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";

import { queryClient } from "@/api/queryClient";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AppRoutes } from "@/routes";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <AppRoutes />
          <Toaster richColors position="top-right" />
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
