export function TypingIndicator() {
  return (
    <div
      className="w-fit rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-sm text-muted-foreground"
      aria-live="polite"
      aria-label="Thinking"
    >
      <span className="inline-block animate-pulse tracking-widest">...</span>
    </div>
  );
}
