import { PanelLeft, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ApiError } from "@/api/errors";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatComposer } from "@/features/chat/components/ChatComposer";
import { ConversationList } from "@/features/chat/components/ConversationList";
import { MessageBubble } from "@/features/chat/components/MessageBubble";
import { SuggestedPrompts } from "@/features/chat/components/SuggestedPrompts";
import { TypingIndicator } from "@/features/chat/components/TypingIndicator";
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useMessages,
  useSendMessage,
} from "@/features/chat/hooks";
import type { ChatAction, DisplayMessage } from "@/features/chat/types";

export function ChatPage() {
  const conversationsQuery = useConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const sendMessage = useSendMessage();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(true);
  const [actionMap, setActionMap] = useState<Record<string, ChatAction[]>>({});
  const [outgoing, setOutgoing] = useState<{ text: string; seen: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useMessages(selectedId);

  const conversations = useMemo(
    () => conversationsQuery.data?.items ?? [],
    [conversationsQuery.data?.items],
  );
  const selected = conversations.find((conversation) => conversation.id === selectedId);

  useEffect(() => {
    if (selectedId) return;
    if (conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  const displayMessages: DisplayMessage[] = useMemo(() => {
    const items = messagesQuery.data?.items ?? [];
    return items
      .filter((message) => message.role === "user" || message.role === "assistant")
      .filter((message) => message.content != null && message.content.trim() !== "")
      .map((message) => ({
        ...message,
        actions: actionMap[message.id],
      }));
  }, [messagesQuery.data?.items, actionMap]);

  function userCopies(text: string) {
    return (messagesQuery.data?.items ?? []).filter(
      (message) => message.role === "user" && message.content?.trim() === text,
    ).length;
  }

  const showOutgoing = outgoing != null && userCopies(outgoing.text) <= outgoing.seen;

  useEffect(() => {
    if (!outgoing) return;
    const copies = (messagesQuery.data?.items ?? []).filter(
      (message) => message.role === "user" && message.content?.trim() === outgoing.text,
    ).length;
    if (copies > outgoing.seen) setOutgoing(null);
  }, [outgoing, messagesQuery.data?.items]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages.length, showOutgoing]);

  async function ensureConversation(): Promise<string> {
    if (selectedId) return selectedId;
    const created = await createConversation.mutateAsync(undefined);
    setSelectedId(created.id);
    return created.id;
  }

  async function handleSend(content: string) {
    setOutgoing({ text: content, seen: userCopies(content) });
    try {
      const conversationId = await ensureConversation();
      const result = await sendMessage.mutateAsync({ conversationId, content });
      if (result.actions.length) {
        setActionMap((prev) => ({
          ...prev,
          [result.assistant_message.id]: result.actions,
        }));
      }
    } catch (error) {
      setOutgoing(null);
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }
      toast.error("Something went wrong, please try again");
    }
  }

  async function handleNewChat() {
    try {
      const created = await createConversation.mutateAsync(undefined);
      setSelectedId(created.id);
      setActionMap({});
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteConversation.mutateAsync(id);
      if (selectedId === id) {
        setSelectedId(null);
        setActionMap({});
      }
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  const busy = sendMessage.isPending || createConversation.isPending;
  const threadEmpty = displayMessages.length === 0 && !showOutgoing;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden",
        listOpen && "lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-4",
      )}
    >
      {listOpen ? (
        <section className="flex max-h-40 shrink-0 flex-col gap-2 overflow-hidden lg:max-h-none lg:min-h-0">
          <h1 className="text-lg font-extrabold tracking-tight">Chat</h1>
          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={() => void handleNewChat()}
            disabled={createConversation.isPending}
          >
            <Plus className="h-3.5 w-3.5" />
            New chat
          </Button>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {conversationsQuery.isLoading ? <LoadingState label="Loading…" /> : null}
            {conversationsQuery.isError ? (
              <ErrorState
                message="Could not load conversations."
                onRetry={() => void conversationsQuery.refetch()}
              />
            ) : null}
            {!conversationsQuery.isLoading && !conversationsQuery.isError ? (
              <ConversationList
                conversations={conversations}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onDelete={(id) => void handleDelete(id)}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-[#F0EBE3] px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 px-0"
            aria-expanded={listOpen}
            aria-label={listOpen ? "Hide conversations" : "Show conversations"}
            onClick={() => setListOpen((open) => !open)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-0 flex-1 truncate text-sm font-bold">
            {selected?.title || "New chat"}
          </h2>
          {!listOpen ? (
            <Button
              type="button"
              size="sm"
              className="shrink-0"
              onClick={() => void handleNewChat()}
              disabled={createConversation.isPending}
            >
              <Plus className="h-3.5 w-3.5" />
              New chat
            </Button>
          ) : null}
          <p className="hidden text-[11px] text-muted-foreground lg:block">
            Can log meals and weight, and read your goals and entries
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
          {selectedId && messagesQuery.isLoading ? <LoadingState label="Loading messages…" /> : null}
          {selectedId && messagesQuery.isError ? (
            <ErrorState
              message="Could not load messages."
              onRetry={() => void messagesQuery.refetch()}
            />
          ) : null}
          {!selectedId && !busy && threadEmpty ? (
            <p className="m-auto max-w-sm text-center text-xs text-muted-foreground">
              Ask about meals, goals, weight, or your week. A prompt below starts the chat.
            </p>
          ) : null}
          {selectedId && !messagesQuery.isLoading && threadEmpty ? (
            <p className="m-auto max-w-sm text-center text-xs text-muted-foreground">
              Ask about meals, goals, weight, or your week. A prompt below starts the chat.
            </p>
          ) : null}

          {displayMessages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {showOutgoing && outgoing ? (
            <MessageBubble
              message={{
                id: "outgoing",
                role: "user",
                content: outgoing.text,
                tool_calls: null,
                tool_call_id: null,
                created_at: "",
              }}
            />
          ) : null}
          {showOutgoing ? <TypingIndicator /> : null}
          <div ref={bottomRef} />
        </div>

        <div className="flex flex-col gap-2 border-t border-[#F0EBE3] px-3 py-2.5">
          <SuggestedPrompts onSelect={(prompt) => void handleSend(prompt)} disabled={busy} />
          <ChatComposer
            disabled={conversationsQuery.isError}
            sending={busy}
            onSend={(content) => void handleSend(content)}
          />
        </div>
      </section>
    </div>
  );
}
