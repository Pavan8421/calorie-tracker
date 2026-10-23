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
        if (error instanceof ApiError) {
          toast.error(error.message);
          return;
        }
        toast.error("Something went wrong, please try again");
      },
    },
  },
});
