import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Conversation } from "@/features/chat/types";
import { cn } from "@/lib/utils";

type ConversationListProps = {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  creating?: boolean;
};

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNew,
  onDelete,
  creating,
}: ConversationListProps) {
  return (
    <div className="flex h-full flex-col gap-3">
      <Button type="button" className="w-full" onClick={onNew} disabled={creating}>
        <Plus className="h-4 w-4" />
        New chat
      </Button>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <li className="px-2 py-4 text-center text-xs text-muted-foreground">
            No conversations yet
          </li>
        ) : null}
        {conversations.map((c) => (
          <li key={c.id} className="group flex items-stretch gap-1">
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className={cn(
                "min-w-0 flex-1 rounded-md px-3 py-2 text-left text-sm transition-colors",
                selectedId === c.id
                  ? "bg-accent font-medium text-teal-900"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="line-clamp-2">{c.title}</span>
            </button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto shrink-0 px-2 text-destructive opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
              aria-label={`Delete ${c.title}`}
              onClick={() => {
                if (window.confirm("Delete this conversation?")) onDelete(c.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
