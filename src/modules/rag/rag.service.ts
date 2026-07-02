import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RagDocument } from './entities/rag-document.entity';
import { CreateRagDto } from './dto/create-rag.dto';
import { UpdateRagDto } from './dto/update-rag.dto';

@Injectable()
export class RagService {
  private readonly documents: RagDocument[] = [];

  findAll(): RagDocument[] {
    return this.documents;
  }

  findOne(id: number): RagDocument {
    return this.documents.find((item) => item.id === id) as RagDocument;
  }

  query(query: string): RagDocument[] {
    return this.documents.filter((doc) =>
      doc.content.toLowerCase().includes(query.toLowerCase()),
    );
  }

  create(data: CreateRagDto): RagDocument {
    const now = new Date().toISOString();
    const item: RagDocument = {
      id: this.documents.length + 1,
      knowledgeId: data.knowledgeId,
      chunkIndex: this.documents.filter(
        (doc) => doc.knowledgeId === data.knowledgeId,
      ).length,
      content: data.content,
      embeddingId: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.documents.push(item);
    return item;
  }

  update(id: number, data: UpdateRagDto): RagDocument {
    const item = this.findOne(id);
    const updated: RagDocument = {
      ...item,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    const index = this.documents.findIndex((entry) => entry.id === id);
    this.documents[index] = updated;
    return updated;
  }
}
