import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type HealthResponse = {
  status: string;
  database: string;
  redis: string;
};

async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await axios.get<HealthResponse>("/health");
  return data;
}

export function HomePage() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    retry: 1,
  });

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            Foundation is ready. Feature pages will land in later phases.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Use the sidebar to explore placeholder screens for each feature.</p>
          <p>
            API traffic goes through the Vite/nginx proxy at <code>/api</code>, keeping the app
            same-origin with the backend.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backend health</CardTitle>
          <CardDescription>Live check via the same-origin proxy.</CardDescription>
        </CardHeader>
        <CardContent>
          {healthQuery.isLoading ? <LoadingState label="Checking /health..." /> : null}
          {healthQuery.isError ? (
            <ErrorState
              message="Could not reach the backend. Start Docker Compose or the API locally."
              onRetry={() => healthQuery.refetch()}
            />
          ) : null}
          {healthQuery.data ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium">{healthQuery.data.status}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Database</dt>
                <dd className="font-medium">{healthQuery.data.database}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Redis</dt>
                <dd className="font-medium">{healthQuery.data.redis}</dd>
              </div>
            </dl>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
