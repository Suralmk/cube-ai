import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as schema from '../../db/schema';
import { DRIZZLE } from '../../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export type CreateDocumentInput = {
  uploadedBy: string;
  organizationId: string;
  title: string;
  filename: string;
  documentType: string;
  s3Key: string;
};

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

  async findByIdForOrg(id: string, organizationId: string) {
    const [doc] = await this.db
      .select()
      .from(schema.document)
      .where(
        and(
          eq(schema.document.id, id),
          eq(schema.document.organizationId, organizationId),
        ),
      );

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    return doc;
  }

  async create(input: CreateDocumentInput) {
    const id = randomUUID();
    const [doc] = await this.db
      .insert(schema.document)
      .values({
        id,
        uploaded_by: input.uploadedBy,
        organizationId: input.organizationId,
        title: input.title,
        filename: input.filename,
        docuemntType: input.documentType,
        s3_key: input.s3Key,
        status: 'pending',
      })
      .returning();

    return doc;
  }
}
