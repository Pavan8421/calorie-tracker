import { format } from "date-fns";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Conversation } from "@/features/chat/types";
import { todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";

type ConversationListProps = {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onDelete,
}: ConversationListProps) {
  const groups = groupConversations(conversations);

  if (conversations.length === 0) {
    return <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">No conversations yet</p>;
  }

  return (
    <nav aria-label="Conversations" className="flex flex-col gap-1">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <p className="px-2.5 pb-0.5 pt-1.5 text-[11px] font-semibold text-muted-foreground">
            {group.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((conversation) => {
              const selected = selectedId === conversation.id;
              return (
                <li key={conversation.id} className="group flex items-stretch gap-0.5">
                  <button
                    type="button"
                    onClick={() => onSelect(conversation.id)}
                    aria-current={selected ? "page" : undefined}
                    className={cn(
                      "min-w-0 flex-1 rounded-xl border px-2.5 py-2 text-left",
                      selected
                        ? "border-border bg-card"
                        : "border-transparent hover:bg-card/70",
                    )}
                  >
                    <span className="line-clamp-2 text-xs font-semibold">{conversation.title}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {updatedLabel(conversation.updated_at)}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto shrink-0 px-1.5 text-stone-500 opacity-100 hover:bg-destructive/10 hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100"
                    aria-label={`Delete ${conversation.title}`}
                    onClick={() => {
                      if (window.confirm("Delete this conversation?")) onDelete(conversation.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function groupConversations(conversations: Conversation[]) {
  const today = todayISO();
  const groups = [
    { label: "Today", items: [] as Conversation[] },
    { label: "Earlier", items: [] as Conversation[] },
  ];
  for (const conversation of conversations) {
    const day = format(new Date(conversation.updated_at), "yyyy-MM-dd");
    (day === today ? groups[0] : groups[1]).items.push(conversation);
  }
  return groups.filter((group) => group.items.length > 0);
}

function updatedLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  if (format(date, "yyyy-MM-dd") === todayISO()) return format(date, "h:mm a");
  return format(date, "d MMM");
}
