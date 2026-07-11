import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as schema from '../../db/schema';
import { DRIZZLE } from '../../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { slugify } from '../../common/utils/slugify';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async fetchOrgByUser(userId: string) {
    const [result] = await this.db
      .select({
        organization: schema.organization,
        profile: schema.organizationProfile,
        settings: schema.organizationSettings,
      })
      .from(schema.organization)
      .leftJoin(
        schema.organizationProfile,
        eq(schema.organizationProfile.organizationId, schema.organization.id),
      )
      .leftJoin(
        schema.organizationSettings,
        eq(schema.organizationSettings.organizationId, schema.organization.id),
      )
      .where(eq(schema.organization.ownerId, userId));

    if (!result) {
      throw new NotFoundException('Organization not found');
    }

    return result;
  }

  async createForUser(userId: string, dto: CreateOrganizationDto) {
    const existing = await this.fetchOrgByUser(userId).catch((error) => {
      if (error instanceof NotFoundException) return null;
      throw error;
    });

    if (existing) {
      throw new ConflictException('User already belongs to an organization');
    }

    const organizationId = randomUUID();
    const baseSlug = slugify(dto.slug?.trim() || dto.name);
    const slug = baseSlug || `org-${organizationId.slice(0, 8)}`;

    const [slugConflict] = await this.db
      .select({ id: schema.organization.id })
      .from(schema.organization)
      .where(eq(schema.organization.slug, slug));

    if (slugConflict) {
      throw new ConflictException('Organization slug is already taken');
    }

    const [organization] = await this.db
      .insert(schema.organization)
      .values({
        id: organizationId,
        ownerId: userId,
        name: dto.name.trim(),
        slug,
      })
      .returning();

    const [profile] = await this.db
      .insert(schema.organizationProfile)
      .values({
        id: randomUUID(),
        organizationId,
        industry: dto.industry?.trim() || null,
      })
      .returning();

    const [settings] = await this.db
      .insert(schema.organizationSettings)
      .values({
        id: randomUUID(),
        organizationId,
        branding: {},
      })
      .returning();

    return { organization, profile, settings };
  }
}
