import { apiFetch, apiUrl, ApiError } from "@/lib/api-client";

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

export async function updateChatSession(
  sessionId: string,
  title: string,
): Promise<ChatSession> {
  return apiFetch<ChatSession>(`/chat/sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export async function deleteChatSession(
  sessionId: string,
): Promise<{ id: string; deleted: boolean }> {
  return apiFetch(`/chat/sessions/${sessionId}`, {
    method: "DELETE",
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

type StreamEvent =
  | { type: "user_message"; message: ChatMessage }
  | { type: "delta"; content: string }
  | { type: "done"; message: ChatMessage }
  | { type: "error"; message: string };

export async function streamChatMessage(
  sessionId: string,
  content: string,
  handlers: {
    onUserMessage?: (message: ChatMessage) => void;
    onDelta?: (content: string) => void;
    onDone?: (message: ChatMessage) => void;
    signal?: AbortSignal;
  },
): Promise<void> {
  const response = await fetch(
    apiUrl(`/chat/sessions/${sessionId}/messages/stream`),
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
      signal: handlers.signal,
    },
  );

  if (!response.ok || !response.body) {
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? ((await response.json()) as { message?: string | { message?: string } })
      : null;
    const raw = body?.message;
    const message =
      typeof raw === "string"
        ? raw
        : typeof raw === "object" && raw && typeof raw.message === "string"
          ? raw.message
          : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, body);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatch = (raw: string) => {
    const line = raw.trim();
    if (!line.startsWith("data:")) return;
    const payload = line.slice(5).trim();
    if (!payload) return;

    let event: StreamEvent;
    try {
      event = JSON.parse(payload) as StreamEvent;
    } catch {
      return;
    }

    if (event.type === "user_message") handlers.onUserMessage?.(event.message);
    else if (event.type === "delta") handlers.onDelta?.(event.content);
    else if (event.type === "done") handlers.onDone?.(event.message);
    else if (event.type === "error") throw new ApiError(event.message, 502);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      dispatch(chunk);
      boundary = buffer.indexOf("\n\n");
    }
  }

  if (buffer.trim()) dispatch(buffer);
}
