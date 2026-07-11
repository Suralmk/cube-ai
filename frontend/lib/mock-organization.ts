import type { OrganizationBundle } from "./types/organization";

export const mockOrganizationBundle: OrganizationBundle = {
  organization: {
    id: "org_abc",
    ownerId: "usr_123",
    name: "Acme HVAC Services",
    slug: "acme-hvac",
    metadata: null,
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
  profile: {
    id: "orgprof_1",
    organizationId: "org_abc",
    industry: "HVAC Maintenance",
    website: "https://acme-hvac.example.com",
    logo: "/logo.png",
    phone: "+1 (555) 123-4567",
    address: "1200 Industrial Blvd",
    city: "Chicago",
    state: "IL",
    zip: "60601",
    country: "United States",
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
  settings: {
    id: "orgset_1",
    organizationId: "org_abc",
    branding: {
      primaryColor: "#0f766e",
      accentColor: "#14b8a6",
    },
    companySlogan: "Reliable field service, documented.",
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
};
