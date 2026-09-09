import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { DRIZZLE } from '../../db/db.module';
import { StorageService } from '../storage/storage.service';
import { PdfService } from './pdf.service';
import { ChunkingService } from './chunking.service';
import { EmbeddingsService } from './embeddings.service';
import { QdrantService, type QdrantPoint } from './qdrant.service';

@Injectable()
export class IndexingService {
  private readonly logger = new Logger(IndexingService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly storage: StorageService,
    private readonly pdf: PdfService,
    private readonly chunking: ChunkingService,
    private readonly embeddings: EmbeddingsService,
    private readonly qdrant: QdrantService,
  ) {}

  /**
   * Fire-and-forget entrypoint used right after upload. Never throws to the
   * caller; failures are recorded on the document row.
   */
  indexInBackground(documentId: string): void {
    void this.index(documentId).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Background indexing failed (${documentId}): ${message}`);
    });
  }

  async index(documentId: string): Promise<void> {
    const [doc] = await this.db
      .select()
      .from(schema.document)
      .where(eq(schema.document.id, documentId));

    if (!doc) {
      this.logger.warn(`Document ${documentId} not found for indexing`);
      return;
    }

    await this.setStatus(documentId, 'indexing');

    try {
      const buffer = await this.storage.readFile(doc.s3_key);
      const { pages, pageCount } = await this.pdf.extractPages(buffer);
      const chunks = this.chunking.chunkPages(pages);

      if (chunks.length === 0) {
        await this.finish(documentId, 'indexed', pageCount, 0);
        this.logger.warn(`Document ${documentId} produced no text chunks`);
        return;
      }

      const vectors = await this.embeddings.embed(
        chunks.map((c) => c.text),
        'document',
      );

      const dimension = this.embeddings.dimension ?? vectors[0]?.length;
      if (!dimension) {
        throw new Error('Could not determine embedding dimension');
      }

      await this.qdrant.ensureCollection(doc.organizationId, dimension);
      // Clear any previous vectors for this document (safe re-indexing).
      await this.qdrant.deleteByDocument(doc.organizationId, documentId);

      const points: QdrantPoint[] = chunks.map((chunk, i) => ({
        id: randomUUID(),
        vector: vectors[i],
        payload: {
          documentId,
          documentName: doc.title,
          orgId: doc.organizationId,
          pageNumber: chunk.pageNumber,
          chunkText: chunk.text,
        },
      }));

      await this.qdrant.upsert(doc.organizationId, points);
      await this.finish(documentId, 'indexed', pageCount, chunks.length);
      this.logger.log(
        `Indexed document ${documentId}: ${chunks.length} chunks across ${pageCount} pages`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.db
        .update(schema.document)
        .set({ status: 'failed', errorMessage: message.slice(0, 500) })
        .where(eq(schema.document.id, documentId));
      this.logger.error(`Indexing failed for ${documentId}: ${message}`);
    }
  }

  private async setStatus(
    documentId: string,
    status: 'indexing' | 'indexed' | 'failed',
  ): Promise<void> {
    await this.db
      .update(schema.document)
      .set({ status })
      .where(eq(schema.document.id, documentId));
  }

  private async finish(
    documentId: string,
    status: 'indexed',
    pageCount: number,
    chunkCount: number,
  ): Promise<void> {
    await this.db
      .update(schema.document)
      .set({ status, pageCount, chunkCount, errorMessage: null })
      .where(eq(schema.document.id, documentId));
  }
}
