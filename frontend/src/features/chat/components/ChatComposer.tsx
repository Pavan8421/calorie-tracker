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

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-border pt-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        rows={2}
        disabled={disabled || sending}
        placeholder="Message the assistant…"
        className="min-h-[2.75rem] flex-1 resize-none rounded-md border border-border bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
      />
      <Button type="submit" disabled={disabled || sending || !value.trim()}>
        {sending ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
