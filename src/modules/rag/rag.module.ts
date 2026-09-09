import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { EmbeddingsService } from './embeddings.service';
import { QdrantService } from './qdrant.service';
import { ChunkingService } from './chunking.service';
import { PdfService } from './pdf.service';
import { IndexingService } from './indexing.service';
import { DbModule } from '../../db/db.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [DbModule, StorageModule],
  controllers: [RagController],
  providers: [
    RagService,
    EmbeddingsService,
    QdrantService,
    ChunkingService,
    PdfService,
    IndexingService,
  ],
  exports: [EmbeddingsService, QdrantService, IndexingService],
})
export class RagModule {}
