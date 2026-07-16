import {
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ChatRole = 'system' | 'user' | 'assistant';

export type LlmMessage = {
  role: ChatRole;
  content: string;
};

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly siteUrl: string;
  private readonly appName = 'Cube AI';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('openrouter.apiKey');
    this.model =
      this.config.get<string>('openrouter.chatModel') ??
      'nvidia/nemotron-3-ultra-550b-a55b:free';

    this.siteUrl =
      this.config.get<string>('auth.url') ?? 'http://localhost:8000';
  }

  async chat(messages: LlmMessage[]): Promise<string> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'OPENROUTER_API_KEY is not configured',
      );
    }

    return this.chatWithModel(messages, this.model);
  }

  /**
   * Open a streaming chat completion. Resolves once the initial request
   * succeeds (so upstream errors like 429/404 surface with the real status
   * before any SSE data is sent), then yields content deltas as they arrive.
   */
  async createChatStream(
    messages: LlmMessage[],
  ): Promise<AsyncGenerator<string>> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'OPENROUTER_API_KEY is not configured',
      );
    }

    const { OpenRouter } = await import('@openrouter/sdk');
    const client = new OpenRouter({ apiKey: this.apiKey });

    const requestPayload = {
      httpReferer: this.siteUrl,
      appTitle: this.appName,
      chatRequest: {
        model: this.model,
        messages,
        stream: true as const,
      },
    };

    this.logger.log(
      `OpenRouter stream request → ${JSON.stringify(requestPayload, null, 2)}`,
    );

    let stream: AsyncIterable<unknown>;
    try {
      stream = (await client.chat.send(requestPayload)) as AsyncIterable<unknown>;
    } catch (error) {
      this.logRawError(error);
      throw this.toHttpException(error);
    }

    return this.iterateStream(stream);
  }

  private async *iterateStream(
    stream: AsyncIterable<unknown>,
  ): AsyncGenerator<string> {
    try {
      for await (const chunk of stream) {
        const content = this.extractDelta(chunk);
        if (content) yield content;
      }
    } catch (error) {
      this.logRawError(error);
      throw this.toHttpException(error);
    }
  }

  private extractDelta(chunk: unknown): string {
    if (typeof chunk !== 'object' || chunk === null) return '';
    const record = chunk as {
      choices?: Array<{ delta?: { content?: unknown } }>;
    };
    const content = record.choices?.[0]?.delta?.content;
    return typeof content === 'string' ? content : '';
  }

  private async chatWithModel(
    messages: LlmMessage[],
    model: string,
  ): Promise<string> {
    const { OpenRouter } = await import('@openrouter/sdk');
    const client = new OpenRouter({ apiKey: this.apiKey });

    const requestPayload = {
      httpReferer: this.siteUrl,
      appTitle: this.appName,
      chatRequest: {
        model,
        messages,
        stream: false,
      },
    };

    this.logger.log(
      `OpenRouter request → ${JSON.stringify(requestPayload, null, 2)}`,
    );

    try {
      const response = await client.chat.send(requestPayload);

      this.logger.log(
        `OpenRouter response ← ${JSON.stringify(response, null, 2)}`,
      );

      const choices = (
        response as {
          choices?: Array<{ message?: { content?: unknown } }>;
        }
      ).choices;

      return this.extractContent(choices?.[0]?.message?.content);
    } catch (error) {
      this.logRawError(error);
      throw this.toHttpException(error);
    }
  }

  /**
   * Log everything the OpenRouter SDK returned on failure so the real cause is
   * visible (status, body, provider error, headers).
   */
  private logRawError(error: unknown): void {
    const details = this.extractErrorDetails(error);
    this.logger.error(
      `OpenRouter request failed → ${JSON.stringify(details, null, 2)}`,
    );
  }

  /**
   * Re-throw the real error from OpenRouter (same status code and message) so
   * the frontend shows exactly what the provider reported instead of a custom
   * rate-limit message.
   */
  private toHttpException(error: unknown): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    const { statusCode, message } = this.extractErrorDetails(error);
    const status =
      typeof statusCode === 'number' && statusCode >= 400 && statusCode <= 599
        ? statusCode
        : 502;

    return new HttpException(message ?? 'OpenRouter request failed', status);
  }

  private extractErrorDetails(error: unknown): {
    statusCode?: number;
    message: string;
    body?: unknown;
    providerError?: unknown;
    headers?: Record<string, string>;
  } {
    if (typeof error !== 'object' || error === null) {
      return { message: String(error) };
    }

    const record = error as {
      statusCode?: number;
      message?: string;
      body?: unknown;
      error?: { message?: unknown; code?: unknown; metadata?: unknown };
      headers?: Headers | Record<string, string>;
    };

    const providerMessage =
      typeof record.error?.message === 'string'
        ? record.error.message
        : undefined;

    return {
      statusCode: record.statusCode,
      message:
        providerMessage ??
        record.message ??
        (typeof record.body === 'string' ? record.body : 'Unknown error'),
      body: record.body,
      providerError: record.error,
      headers: this.serializeHeaders(record.headers),
    };
  }

  private serializeHeaders(
    headers: Headers | Record<string, string> | undefined,
  ): Record<string, string> | undefined {
    if (!headers) return undefined;

    if (typeof (headers as Headers).forEach === 'function') {
      const result: Record<string, string> = {};
      (headers as Headers).forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }

    return headers as Record<string, string>;
  }

  private extractContent(content: unknown): string {
    if (typeof content === 'string' && content.trim()) {
      return content.trim();
    }

    if (Array.isArray(content)) {
      const text = content
        .map((part) =>
          typeof part === 'string'
            ? part
            : typeof part === 'object' &&
                part &&
                'text' in part &&
                typeof (part as { text?: unknown }).text === 'string'
              ? (part as { text: string }).text
              : '',
        )
        .join('')
        .trim();
      if (text) return text;
    }

    this.logger.warn('OpenRouter returned an empty response');
    return 'I could not generate a response. Please try again.';
  }
}
