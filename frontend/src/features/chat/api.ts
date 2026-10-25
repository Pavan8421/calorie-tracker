import { apiClient } from "@/api/client";
import type {
  ChatMessage,
  Conversation,
  Page,
  SendMessageResponse,
} from "@/features/chat/types";

export async function createConversation(title?: string): Promise<Conversation> {
  const { data } = await apiClient.post<Conversation>(
    "/chat/conversations",
    title ? { title } : {},
  );
  return data;
}

export async function listConversations(
  page = 1,
  pageSize = 30,
): Promise<Page<Conversation>> {
  const { data } = await apiClient.get<Page<Conversation>>("/chat/conversations", {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function deleteConversation(id: string): Promise<void> {
  await apiClient.delete(`/chat/conversations/${id}`);
}

export async function listMessages(
  conversationId: string,
  page = 1,
  pageSize = 100,
): Promise<Page<ChatMessage>> {
  const { data } = await apiClient.get<Page<ChatMessage>>(
    `/chat/conversations/${conversationId}/messages`,
    { params: { page, page_size: pageSize } },
  );
  return data;
}

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<SendMessageResponse> {
  const { data } = await apiClient.post<SendMessageResponse>(
    `/chat/conversations/${conversationId}/messages`,
    { content },
  );
  return data;
}
