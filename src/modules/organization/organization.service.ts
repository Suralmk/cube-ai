import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { DRIZZLE } from '../../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

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
}
