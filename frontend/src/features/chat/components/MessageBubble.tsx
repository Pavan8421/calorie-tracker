import { ActionChips } from "@/features/chat/components/ActionChips";
import { MarkdownText } from "@/features/chat/components/MarkdownText";
import type { DisplayMessage } from "@/features/chat/types";
import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  message: DisplayMessage;
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const text = message.content?.trim() || (isUser ? "" : "…");

  if (isUser) {
    return (
      <div className="flex justify-end">
        <p className="max-w-[70%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-xs leading-relaxed text-primary-foreground">
          {text}
        </p>
      </div>
    );
  }

  return (
    <div className="flex max-w-[85%] gap-2">
      <AssistantMark />
      <div className="min-w-0 rounded-2xl rounded-bl-sm border border-border bg-surface px-3 py-2 text-xs leading-relaxed">
        <MarkdownText text={text} />
        {message.actions?.length ? <ActionChips actions={message.actions} /> : null}
      </div>
    </div>
  );
}

export function AssistantMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft",
        className,
      )}
      aria-hidden="true"
    >
      <svg width="16" height="16" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="11" fill="none" stroke="#B9DDD7" strokeWidth="5" />
        <circle
          cx="16"
          cy="16"
          r="11"
          fill="none"
          stroke="#0F766E"
          strokeWidth="5"
          strokeDasharray="48 69.1"
          transform="rotate(-90 16 16)"
        />
      </svg>
    </span>
  );
}
