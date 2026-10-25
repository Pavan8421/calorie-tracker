export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-16 items-center justify-center px-4 py-6 text-xs text-muted-foreground">
      {label}
    </div>
  );
}
