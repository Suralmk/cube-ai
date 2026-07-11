import { apiFetch, ApiError } from "@/lib/api-client";
import type { OrganizationBundle } from "@/lib/types/organization";

export async function fetchOrganization(): Promise<OrganizationBundle | null> {
  try {
    return await apiFetch<OrganizationBundle>("/organizations");
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

export type CreateOrganizationInput = {
  name: string;
  slug?: string;
  industry?: string;
};

export async function createOrganization(
  input: CreateOrganizationInput,
): Promise<OrganizationBundle> {
  return apiFetch<OrganizationBundle>("/organizations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
