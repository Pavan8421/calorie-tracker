import { AssistantMark } from "@/features/chat/components/MessageBubble";

export function TypingIndicator() {
  return (
    <div className="flex max-w-[85%] gap-2" aria-live="polite" aria-label="Thinking">
      <AssistantMark />
      <p className="rounded-2xl rounded-bl-sm border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
        <span className="inline-block animate-pulse tracking-widest">...</span>
      </p>
    </div>
  );
}
