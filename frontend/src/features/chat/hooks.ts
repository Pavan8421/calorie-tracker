import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as chatApi from "@/features/chat/api";
import type { ChatAction, ChatMessage, Page } from "@/features/chat/types";
import { entryKeys } from "@/features/entries/hooks";
import { goalKeys, weightKeys } from "@/features/goals/hooks";
import { reportKeys } from "@/features/reports/hooks";

export const chatKeys = {
  all: ["chat"] as const,
  conversations: (page: number) => ["chat", "conversations", page] as const,
  messages: (conversationId: string) => ["chat", "messages", conversationId] as const,
};

export function invalidateForActions(
  queryClient: ReturnType<typeof useQueryClient>,
  actions: ChatAction[],
) {
  const types = new Set(actions.map((a) => a.type));
  let touchEntries = false;
  let touchGoals = false;
  let touchWeight = false;

  for (const type of types) {
    if (
      type === "entry_created" ||
      type === "entry_updated" ||
      type === "entry_deleted"
    ) {
      touchEntries = true;
    }
    if (type === "goal_set") touchGoals = true;
    if (type === "weight_logged") touchWeight = true;
  }

  if (touchEntries) {
    void queryClient.invalidateQueries({ queryKey: entryKeys.all });
    void queryClient.invalidateQueries({ queryKey: reportKeys.all });
  }
  if (touchGoals) {
    void queryClient.invalidateQueries({ queryKey: goalKeys.all });
    void queryClient.invalidateQueries({ queryKey: reportKeys.all });
  }
  if (touchWeight) {
    void queryClient.invalidateQueries({ queryKey: weightKeys.all });
    void queryClient.invalidateQueries({ queryKey: goalKeys.current });
  }
}

export function useConversations(page = 1) {
  return useQuery({
    queryKey: chatKeys.conversations(page),
    queryFn: () => chatApi.listConversations(page),
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: chatKeys.messages(conversationId ?? "none"),
    queryFn: () => chatApi.listMessages(conversationId!),
    enabled: Boolean(conversationId),
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => chatApi.createConversation(title),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.all });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chatApi.deleteConversation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.all });
      toast.success("Conversation deleted");
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversationId,
      content,
    }: {
      conversationId: string;
      content: string;
    }) => chatApi.sendMessage(conversationId, content),
    onSuccess: async (data, vars) => {
      await queryClient.cancelQueries({
        queryKey: chatKeys.messages(vars.conversationId),
      });
      queryClient.setQueryData<Page<ChatMessage>>(
        chatKeys.messages(vars.conversationId),
        (current) => {
          const items = current?.items ?? [];
          const known = new Set(items.map((message) => message.id));
          const appended = [data.user_message, data.assistant_message].filter(
            (message) => !known.has(message.id),
          );
          if (appended.length === 0) return current;
          return {
            items: [...items, ...appended],
            page: current?.page ?? 1,
            page_size: current?.page_size ?? items.length + appended.length,
            total: (current?.total ?? items.length) + appended.length,
            total_pages: current?.total_pages ?? 1,
          };
        },
      );
      void queryClient.invalidateQueries({
        queryKey: chatKeys.messages(vars.conversationId),
      });
      void queryClient.invalidateQueries({ queryKey: chatKeys.all });
      invalidateForActions(queryClient, data.actions);
    },
  });
}
