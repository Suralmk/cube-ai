export class Organization {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export class OrganizationProfile {
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
  createdAt: Date;
  updatedAt: Date;
}

export class OrganizationSettings {
  id: string;
  organizationId: string;
  branding: Record<string, any> | null;
  companySlogan: string | null;
  createdAt: Date;
  updatedAt: Date;
}
