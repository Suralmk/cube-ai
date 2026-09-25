import {
  apiFetch,
  apiUrl,
  getStreamApiBaseUrl,
  API_PREFIX,
  ApiError,
} from "@/lib/api-client";
import type { ChatMessage, ChatSession } from "./chat";
import type { OrganizationBranding } from "@/lib/types/organization";

export type PublicDocument = {
  id: string;
  title: string;
  filename: string;
  documentType: string;
  status: string;
  pageCount: number | null;
  chunkCount: number | null;
  createdAt: string;
};

export type PublicOrganizationResponse = {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  profile: {
    industry: string | null;
    website: string | null;
    logo: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  };
  settings: {
    companySlogan: string | null;
    branding: OrganizationBranding | null;
  };
  documents: PublicDocument[];
  documentCount: number;
};

export async function fetchPublicOrganization(
  slug: string,
): Promise<PublicOrganizationResponse> {
  return apiFetch<PublicOrganizationResponse>(`/public/organizations/${slug}`);
}

export async function createPublicChatSession(
  slug: string,
  title?: string,
): Promise<ChatSession> {
  return apiFetch<ChatSession>(`/public/chat/${slug}/sessions`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function fetchPublicSessionMessages(
  slug: string,
  sessionId: string,
): Promise<{
  session: ChatSession;
  messages: ChatMessage[];
}> {
  return apiFetch(`/public/chat/${slug}/sessions/${sessionId}/messages`);
}

type StreamEvent =
  | { type: "user_message"; message: ChatMessage }
  | { type: "delta"; content: string }
  | { type: "done"; message: ChatMessage }
  | { type: "error"; message: string };

export async function streamPublicChatMessage(
  slug: string,
  sessionId: string,
  content: string,
  handlers: {
    onUserMessage?: (message: ChatMessage) => void;
    onDelta?: (content: string) => void;
    onDone?: (message: ChatMessage) => void;
    signal?: AbortSignal;
  },
): Promise<void> {
  const streamUrl = `${getStreamApiBaseUrl()}/${API_PREFIX}/public/chat/${slug}/sessions/${sessionId}/messages/stream`;
  const response = await fetch(streamUrl, {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
    signal: handlers.signal,
  });

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

export function publicDocumentFileUrl(id: string): string {
  return apiUrl(`/public/documents/${id}/file`);
}
