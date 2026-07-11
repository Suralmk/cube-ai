import { getApiBaseUrl, API_PREFIX } from "@/lib/api-client";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified?: boolean;
};

export type AuthSession = {
  id: string;
  userId: string;
  expiresAt: string;
};

export type SessionResponse = {
  user: AuthUser;
  session: AuthSession;
} | null;

const authBase = () => `${getApiBaseUrl()}/${API_PREFIX}/auth`;

function parseAuthError(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    if (record.error && typeof record.error === "object") {
      const err = record.error as Record<string, unknown>;
      if (typeof err.message === "string") return err.message;
    }
  }
  return `Auth request failed (${status})`;
}

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${authBase()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(parseAuthError(body, response.status));
  }

  return body as T;
}

export async function getSession(): Promise<SessionResponse> {
  const response = await fetch(`${authBase()}/get-session`, {
    credentials: "include",
  });

  if (!response.ok) return null;

  const body = await response.json();
  if (!body?.user) return null;
  return body as SessionResponse;
}

export async function signIn(email: string, password: string) {
  return authFetch<{ user: AuthUser }>("/sign-in/email", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function signUp(name: string, email: string, password: string) {
  return authFetch<{ user: AuthUser }>("/sign-up/email", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function signOut() {
  await authFetch("/sign-out", { method: "POST" });
}
