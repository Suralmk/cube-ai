import { Injectable, Inject } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { DRIZZLE } from '../../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findByOrganizationId(organizationId: string) {
    return this.db
      .select()
      .from(schema.document)
      .where(eq(schema.document.organizationId, organizationId))
      .orderBy(desc(schema.document.createdAt));
  }
}
