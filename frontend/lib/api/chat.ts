import { apiFetch } from "@/lib/api-client";

export type ChatSession = {
  id: string;
  organizationId: string | null;
  userId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  organizationId: string | null;
  userId: string | null;
  sessionId: string | null;
  content: string;
  role: "user" | "assistant" | string;
  createdAt: string;
  updatedAt: string;
};

export async function fetchChatSessions(): Promise<ChatSession[]> {
  return apiFetch<ChatSession[]>("/chat/sessions");
}

export async function fetchSessionMessages(sessionId: string): Promise<{
  session: ChatSession;
  messages: ChatMessage[];
}> {
  return apiFetch(`/chat/sessions/${sessionId}/messages`);
}

export async function createChatSession(title?: string): Promise<ChatSession> {
  return apiFetch<ChatSession>("/chat/sessions", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function sendChatMessage(sessionId: string, content: string) {
  return apiFetch<{
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
  }>(`/chat/sessions/${sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}
