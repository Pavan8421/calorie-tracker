import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ApiError } from "@/api/errors";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [actionMap, setActionMap] = useState<Record<string, ChatAction[]>>({});
  const [outgoing, setOutgoing] = useState<{ text: string; seen: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useMessages(selectedId);

  const conversations = useMemo(
    () => conversationsQuery.data?.items ?? [],
    [conversationsQuery.data?.items],
  );

  useEffect(() => {
    if (selectedId) return;
    if (conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  const displayMessages: DisplayMessage[] = useMemo(() => {
    const items = messagesQuery.data?.items ?? [];
    return items
      .filter((m) => m.role === "user" || m.role === "assistant")
      .filter((m) => m.content != null && m.content.trim() !== "")
      .map((m) => ({
        ...m,
        actions: actionMap[m.id],
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

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <Card className="h-[min(70vh,720px)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Conversations</CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-4rem)]">
          {conversationsQuery.isLoading ? (
            <LoadingState label="Loading…" />
          ) : conversationsQuery.isError ? (
            <ErrorState
              message="Could not load conversations."
              onRetry={() => void conversationsQuery.refetch()}
            />
          ) : (
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onNew={() => void handleNewChat()}
              onDelete={(id) => void handleDelete(id)}
              creating={createConversation.isPending}
            />
          )}
        </CardContent>
      </Card>

      <Card className="flex h-[min(70vh,720px)] flex-col">
        <CardHeader className="shrink-0 pb-2">
          <CardTitle>Chat</CardTitle>
          <CardDescription>
            Log meals, check goals, log weight, and ask for summaries in plain language.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {!selectedId && !busy && !showOutgoing ? (
              <SuggestedPrompts onSelect={(p) => void handleSend(p)} disabled={busy} />
            ) : null}

            {selectedId && messagesQuery.isLoading ? (
              <LoadingState label="Loading messages…" />
            ) : null}

            {selectedId && messagesQuery.isError ? (
              <ErrorState
                message="Could not load messages."
                onRetry={() => void messagesQuery.refetch()}
              />
            ) : null}

            {selectedId &&
            !messagesQuery.isLoading &&
            displayMessages.length === 0 &&
            !showOutgoing ? (
              <SuggestedPrompts onSelect={(p) => void handleSend(p)} disabled={busy} />
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

            {showOutgoing ? (
              <div className="flex justify-start">
                <TypingIndicator />
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          <ChatComposer
            disabled={conversationsQuery.isError}
            sending={busy}
            onSend={(content) => void handleSend(content)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
