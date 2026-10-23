export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
