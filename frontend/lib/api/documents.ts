import { apiFetch, apiUrl } from "@/lib/api-client";

export type DocumentStatus =
  | "pending"
  | "indexing"
  | "indexed"
  | "processing"
  | "ready"
  | "failed";

export type ApiDocument = {
  id: string;
  uploaded_by: string;
  organizationId: string;
  title: string;
  filename: string;
  docuemntType: string;
  s3_key: string;
  status: DocumentStatus;
  pageCount: number | null;
  chunkCount: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchDocuments(): Promise<ApiDocument[]> {
  return apiFetch<ApiDocument[]>("/documents");
}

export async function uploadDocument(file: File): Promise<ApiDocument> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(apiUrl("/documents"), {
    method: "POST",
    credentials: "include",
    body: form,
  });

  const payload = (await response.json().catch(() => null)) as
    | { data?: ApiDocument; message?: string | { message?: string } }
    | null;

  if (!response.ok) {
    const raw = payload?.message;
    const message =
      typeof raw === "string"
        ? raw
        : typeof raw === "object" && raw && typeof raw.message === "string"
          ? raw.message
          : `Upload failed with status ${response.status}`;
    throw new Error(message);
  }

  return (payload?.data ?? payload) as ApiDocument;
}

export async function reindexDocument(
  id: string,
): Promise<{ id: string; status: string }> {
  return apiFetch(`/documents/${id}/reindex`, { method: "POST" });
}

/** Authenticated URL for the raw PDF bytes (served inline by the backend). */
export function documentFileUrl(id: string): string {
  return apiUrl(`/documents/${id}/file`);
}
