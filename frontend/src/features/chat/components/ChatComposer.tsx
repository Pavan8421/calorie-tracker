import { ArrowUp } from "lucide-react";
import { useState, type FormEvent, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";

type ChatComposerProps = {
  disabled?: boolean;
  sending?: boolean;
  onSend: (content: string) => void;
};

export function ChatComposer({ disabled, sending, onSend }: ChatComposerProps) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled || sending) return;
    onSend(trimmed);
    setValue("");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex items-end gap-2 rounded-2xl border border-border-strong bg-card py-1 pl-3 pr-1"
    >
      <label htmlFor="chat-message" className="sr-only">
        Message
      </label>
      <textarea
        id="chat-message"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        rows={2}
        disabled={disabled || sending}
        placeholder="Log a meal, ask about your goals or your week"
        className="max-h-24 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-xs font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground disabled:opacity-50"
      />
      <Button
        type="submit"
        size="sm"
        className="h-9 w-9 shrink-0 px-0"
        aria-label={sending ? "Sending" : "Send"}
        disabled={disabled || sending || !value.trim()}
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
    </form>
  );
}
