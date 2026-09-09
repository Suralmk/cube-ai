import {
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type EmbeddingInputType = 'document' | 'query';

// Providers disagree on input_type vocabulary. Nvidia embedding models (the
// configured default) require "passage"/"query"; OpenAI-style models use
// "search_document"/"search_query". We try the Nvidia terms first and fall back
// to omitting input_type entirely if the provider rejects them.
const INPUT_TYPE_MAP: Record<EmbeddingInputType, string> = {
  document: 'passage',
  query: 'query',
};

type EmbeddingsResponse = {
  data?: Array<{ embedding?: number[]; index?: number }>;
  model?: string;
  error?: { message?: string; code?: number };
};

const OPENROUTER_EMBEDDINGS_URL = 'https://openrouter.ai/api/v1/embeddings';
const BATCH_SIZE = 16;

/**
 * Generates embeddings via OpenRouter's `/embeddings` endpoint (the SDK does
 * not expose embeddings, so we call the HTTP API directly). The model is taken
 * from OPENROUTER_EMBEDDING_MODEL and never hardcoded. The vector dimension is
 * detected from the first successful response so callers (Qdrant) can size the
 * collection dynamically.
 */
@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly siteUrl: string;
  private detectedDimension: number | undefined;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('openrouter.apiKey');
    this.model =
      this.config.get<string>('openrouter.embeddingModel') ??
      'nvidia/llama-nemotron-embed-vl-1b-v2:free';
    this.siteUrl =
      this.config.get<string>('auth.url') ?? 'http://localhost:8000';
  }

  get dimension(): number | undefined {
    return this.detectedDimension;
  }

  async embedOne(
    text: string,
    inputType: EmbeddingInputType,
  ): Promise<number[]> {
    const [vector] = await this.embed([text], inputType);
    return vector;
  }

  async embed(
    texts: string[],
    inputType: EmbeddingInputType,
  ): Promise<number[][]> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'OPENROUTER_API_KEY is not configured',
      );
    }

    const vectors: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const batchVectors = await this.requestBatch(batch, inputType);
      vectors.push(...batchVectors);
    }
    return vectors;
  }

  private async requestBatch(
    input: string[],
    inputType: EmbeddingInputType,
  ): Promise<number[][]> {
    const payload = await this.postEmbeddings(input, INPUT_TYPE_MAP[inputType]);

    const data = payload.data ?? [];
    const ordered = [...data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    const vectors = ordered.map((item) => item.embedding ?? []);

    if (!vectors[0]?.length) {
      throw new ServiceUnavailableException(
        'Embeddings provider returned no vectors',
      );
    }

    this.detectedDimension = vectors[0].length;
    return vectors;
  }

  private async postEmbeddings(
    input: string[],
    inputType: string | undefined,
  ): Promise<EmbeddingsResponse> {
    let response: Response;
    try {
      response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.siteUrl,
          'X-Title': 'Cube AI',
        },
        body: JSON.stringify({
          model: this.model,
          input,
          ...(inputType ? { input_type: inputType } : {}),
          encoding_format: 'float',
        }),
      });
    } catch (error) {
      const cause =
        error instanceof Error && (error as { cause?: unknown }).cause
          ? `: ${((error as { cause?: { message?: string } }).cause?.message ?? String((error as { cause?: unknown }).cause))}`
          : '';
      const message =
        error instanceof Error
          ? `${error.message}${cause}`
          : 'Embeddings request failed';
      this.logger.error(`Embeddings network error → ${message}`);
      throw new ServiceUnavailableException(
        `Failed to reach the embeddings provider: ${message}`,
      );
    }

    const raw = await response.text();
    const payload = this.parseJson(raw);

    // OpenRouter sometimes returns HTTP 200 with an { error } envelope, so we
    // must inspect the body rather than trusting the status code alone.
    const errorMessage = payload?.error?.message;
    if (!response.ok || errorMessage) {
      // If the provider rejects the input_type value, retry once without it.
      if (inputType && errorMessage && /input_type/i.test(errorMessage)) {
        this.logger.warn(
          `Embeddings provider rejected input_type "${inputType}"; retrying without it`,
        );
        return this.postEmbeddings(input, undefined);
      }

      const status = payload?.error?.code ?? response.status;
      this.logger.error(
        `Embeddings request failed (${status}) → ${raw.slice(0, 500)}`,
      );
      throw new HttpException(
        errorMessage ?? `Embeddings request failed with status ${status}`,
        status >= 400 && status <= 599 ? status : 502,
      );
    }

    if (!payload) {
      throw new ServiceUnavailableException(
        'Embeddings provider returned an unreadable response',
      );
    }

    return payload;
  }

  private parseJson(body: string): EmbeddingsResponse | null {
    try {
      return JSON.parse(body) as EmbeddingsResponse;
    } catch {
      return null;
    }
  }
}
