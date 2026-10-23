import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/60 p-8 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? <p className="max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button type="button" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
