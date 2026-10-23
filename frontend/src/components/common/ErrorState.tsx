import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Something went wrong",
  message = "Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-8 text-center">
      <h3 className="text-base font-semibold text-destructive">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
