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

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "w-fit max-w-[min(85%,34rem)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-muted text-foreground",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{text}</p>
        ) : (
          <MarkdownText text={text} />
        )}
        {!isUser && message.actions?.length ? (
          <ActionChips actions={message.actions} />
        ) : null}
      </div>
    </div>
  );
}
