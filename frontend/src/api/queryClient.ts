import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/api/errors";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        // Forms map 422 details onto fields; skip the global toast.
        if (error instanceof ApiError) {
          if (error.status === 422) return;
          toast.error(error.message);
          return;
        }
        toast.error("Something went wrong, please try again");
      },
    },
  },
});
