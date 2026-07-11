/** Mirrors backend Drizzle schemas: organization, organization_profile, organization_settings */

export type OrganizationBranding = {
  primaryColor?: string;
  accentColor?: string;
};

export type Organization = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationProfile = {
  id: string;
  organizationId: string;
  industry: string | null;
  website: string | null;
  logo: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationSettings = {
  id: string;
  organizationId: string;
  branding: OrganizationBranding | null;
  companySlogan: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationBundle = {
  organization: Organization;
  profile: OrganizationProfile | null;
  settings: OrganizationSettings | null;
};
