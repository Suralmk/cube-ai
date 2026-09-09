import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type QdrantPayload = {
  documentId: string;
  documentName: string;
  orgId: string;
  pageNumber: number;
  chunkText: string;
};

export type QdrantPoint = {
  id: string;
  vector: number[];
  payload: QdrantPayload;
};

export type QdrantSearchHit = {
  id: string;
  score: number;
  payload: QdrantPayload;
};

/**
 * Thin Qdrant REST client (dependency-free) scoped to one collection per org.
 * Collections are created lazily using the embedding dimension detected at
 * index time, so no vector size is hardcoded.
 */
@Injectable()
export class QdrantService {
  private readonly logger = new Logger(QdrantService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (
      this.config.get<string>('qdrant.url') ?? 'http://localhost:6333'
    ).replace(/\/$/, '');
    this.apiKey = this.config.get<string>('qdrant.apiKey');
  }

  collectionName(orgId: string): string {
    return `documents_${orgId}`;
  }

  async ensureCollection(orgId: string, dimension: number): Promise<void> {
    const name = this.collectionName(orgId);
    const exists = await this.request('GET', `/collections/${name}`, undefined, [
      200,
      404,
    ]);

    if (exists.status === 200) return;

    await this.request('PUT', `/collections/${name}`, {
      vectors: { size: dimension, distance: 'Cosine' },
    });
    this.logger.log(`Created Qdrant collection ${name} (dim=${dimension})`);
  }

  async upsert(orgId: string, points: QdrantPoint[]): Promise<void> {
    if (points.length === 0) return;
    const name = this.collectionName(orgId);
    await this.request('PUT', `/collections/${name}/points?wait=true`, {
      points,
    });
  }

  /** Remove every vector belonging to a document (used before re-indexing). */
  async deleteByDocument(orgId: string, documentId: string): Promise<void> {
    const name = this.collectionName(orgId);
    const exists = await this.request('GET', `/collections/${name}`, undefined, [
      200,
      404,
    ]);
    if (exists.status === 404) return;

    await this.request('POST', `/collections/${name}/points/delete?wait=true`, {
      filter: {
        must: [{ key: 'documentId', match: { value: documentId } }],
      },
    });
  }

  async search(
    orgId: string,
    vector: number[],
    topK: number,
    documentIds?: string[],
  ): Promise<QdrantSearchHit[]> {
    const name = this.collectionName(orgId);
    const exists = await this.request('GET', `/collections/${name}`, undefined, [
      200,
      404,
    ]);
    if (exists.status === 404) return [];

    const filter =
      documentIds && documentIds.length > 0
        ? { must: [{ key: 'documentId', match: { any: documentIds } }] }
        : undefined;

    const res = await this.request(
      'POST',
      `/collections/${name}/points/search`,
      {
        vector,
        limit: topK,
        with_payload: true,
        ...(filter ? { filter } : {}),
      },
    );

    const body = (await res.json()) as {
      result?: Array<{ id: string; score: number; payload: QdrantPayload }>;
    };

    return (body.result ?? []).map((hit) => ({
      id: String(hit.id),
      score: hit.score,
      payload: hit.payload,
    }));
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
    allowedStatuses: number[] = [200],
  ): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'api-key': this.apiKey } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch (error) {
      const cause =
        error instanceof Error && (error as { cause?: unknown }).cause
          ? `: ${((error as { cause?: { message?: string } }).cause?.message ?? String((error as { cause?: unknown }).cause))}`
          : '';
      const message =
        error instanceof Error
          ? `${error.message}${cause}`
          : 'Qdrant request failed';
      this.logger.error(`Qdrant network error (${path}) → ${message}`);
      throw new ServiceUnavailableException(
        `Failed to reach the vector store: ${message}`,
      );
    }

    if (!allowedStatuses.includes(response.status)) {
      const text = await response.text();
      this.logger.error(
        `Qdrant request failed ${method} ${path} (${response.status}) → ${text}`,
      );
      throw new ServiceUnavailableException(
        `Vector store request failed with status ${response.status}`,
      );
    }

    return response;
  }
}
