/**
 * API base URL for browser requests.
 * Default: same origin (Next.js rewrites proxy /api/v1/* → Nest on :8000).
 */
export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}

/** @deprecated Use getApiBaseUrl() for runtime resolution */
export const API_BASE_URL = getApiBaseUrl();

export const API_PREFIX = "api/v1";

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}/${API_PREFIX}${normalized}`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiEnvelope<T> = {
  data: T;
  statusCode: number;
};

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      (body as { message?: string })?.message ??
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, body);
  }

  if (body && typeof body === "object" && "data" in body) {
    return (body as ApiEnvelope<T>).data;
  }

  return body as T;
}
