export type ChatRole = "user" | "assistant" | "tool";

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string | null;
  tool_calls: unknown | null;
  tool_call_id: string | null;
  created_at: string;
};

export type ChatAction = {
  type: string;
  id: string | null;
  detail: Record<string, unknown>;
};

export type SendMessageResponse = {
  user_message: ChatMessage;
  assistant_message: ChatMessage;
  actions: ChatAction[];
};

export type DisplayMessage = ChatMessage & {
  actions?: ChatAction[];
};

export type Page<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export const SUGGESTED_PROMPTS = [
  "Log 2 eggs for breakfast, about 140 kcal with 12g protein",
  "What are my current nutrition goals?",
  "Log my weight as 72 kg today",
  "Summarize my calories for the last 7 days",
] as const;
