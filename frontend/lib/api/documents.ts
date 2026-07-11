import { apiFetch } from "@/lib/api-client";

export type ApiDocument = {
  id: string;
  uploaded_by: string;
  organizationId: string;
  title: string;
  filename: string;
  docuemntType: string;
  s3_key: string;
  createdAt: string;
  updatedAt: string;
};

export async function fetchDocuments(): Promise<ApiDocument[]> {
  return apiFetch<ApiDocument[]>("/documents");
}
