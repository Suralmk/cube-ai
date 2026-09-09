import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { asc, desc, eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as schema from '../../db/schema';
import { DRIZZLE } from '../../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { OpenRouterService, type LlmMessage } from './openrouter.service';
import { EmbeddingsService } from '../rag/embeddings.service';
import { QdrantService } from '../rag/qdrant.service';

const BASE_SYSTEM_PROMPT = `You are Cube AI, an assistant for field technicians and maintenance teams.
Help them with equipment manuals, troubleshooting, safety procedures, and technical questions.
Be precise, practical, and clear. If you are unsure, say so.`;

export type RetrievedSource = {
  marker: number;
  documentId: string;
  documentName: string;
  pageNumber: number;
  chunkText: string;
  score: number;
};

@Injectable()
export class ChatService {
  private readonly historyLimit: number;
  private readonly topK: number;

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly openRouter: OpenRouterService,
    private readonly embeddings: EmbeddingsService,
    private readonly qdrant: QdrantService,
    private readonly config: ConfigService,
  ) {
    this.historyLimit = this.config.get<number>('chat.historyLimit') ?? 5;
    this.topK = this.config.get<number>('rag.topK') ?? 5;
  }

  async listSessions(userId: string, organizationId: string) {
    return this.db
      .select()
      .from(schema.chatSession)
      .where(eq(schema.chatSession.userId, userId))
      .orderBy(desc(schema.chatSession.updatedAt));
  }

  async getSessionMessages(sessionId: string, userId: string) {
    const [session] = await this.db
      .select()
      .from(schema.chatSession)
      .where(eq(schema.chatSession.id, sessionId));

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Chat session not found');
    }

    const messages = await this.db
      .select()
      .from(schema.chatMessage)
      .where(eq(schema.chatMessage.sessionId, sessionId))
      .orderBy(asc(schema.chatMessage.createdAt));

    const citationsByMessage = await this.loadCitations(
      messages.map((m) => m.id),
    );

    return {
      session,
      messages: messages.map((m) => ({
        ...m,
        citations: citationsByMessage.get(m.id) ?? [],
      })),
    };
  }

  async createSession(
    userId: string,
    organizationId: string,
    title: string,
  ) {
    const id = randomUUID();
    const [session] = await this.db
      .insert(schema.chatSession)
      .values({
        id,
        userId,
        organizationId,
        title,
      })
      .returning();
    return session;
  }

  async updateSession(sessionId: string, userId: string, title: string) {
    const [session] = await this.db
      .select()
      .from(schema.chatSession)
      .where(eq(schema.chatSession.id, sessionId));

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Chat session not found');
    }

    const [updated] = await this.db
      .update(schema.chatSession)
      .set({ title, updatedAt: new Date() })
      .where(eq(schema.chatSession.id, sessionId))
      .returning();

    return updated;
  }

  async deleteSession(sessionId: string, userId: string) {
    const [session] = await this.db
      .select()
      .from(schema.chatSession)
      .where(eq(schema.chatSession.id, sessionId));

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Chat session not found');
    }

    await this.db
      .delete(schema.chatSession)
      .where(eq(schema.chatSession.id, sessionId));

    return { id: sessionId, deleted: true };
  }

  async addMessage(
    sessionId: string,
    userId: string,
    organizationId: string,
    content: string,
    role: 'user' | 'assistant',
  ) {
    const [session] = await this.db
      .select()
      .from(schema.chatSession)
      .where(eq(schema.chatSession.id, sessionId));

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Chat session not found');
    }

    const [message] = await this.db
      .insert(schema.chatMessage)
      .values({
        id: randomUUID(),
        sessionId,
        userId,
        organizationId,
        content,
        role,
      })
      .returning();

    await this.db
      .update(schema.chatSession)
      .set({ updatedAt: new Date() })
      .where(eq(schema.chatSession.id, sessionId));

    return message;
  }

  async sendMessage(
    sessionId: string,
    userId: string,
    organizationId: string,
    content: string,
  ) {
    const userMessage = await this.addMessage(
      sessionId,
      userId,
      organizationId,
      content.trim(),
      'user',
    );

    const { llmMessages, sources } = await this.buildPrompt(
      sessionId,
      organizationId,
      content.trim(),
    );

    const assistantContent = await this.openRouter.chat(llmMessages);

    const assistantMessage = await this.saveAssistantMessage(
      sessionId,
      userId,
      organizationId,
      assistantContent,
      sources,
    );

    return { userMessage, assistantMessage };
  }

  /**
   * Persist the user message, run retrieval, and open a streaming completion.
   * Throws (before any streaming begins) if the session is invalid or the LLM
   * request fails, so the controller can return a normal error response.
   */
  async startStreaming(
    sessionId: string,
    userId: string,
    organizationId: string,
    content: string,
  ) {
    const userMessage = await this.addMessage(
      sessionId,
      userId,
      organizationId,
      content.trim(),
      'user',
    );

    const { llmMessages, sources } = await this.buildPrompt(
      sessionId,
      organizationId,
      content.trim(),
    );

    const stream = await this.openRouter.createChatStream(llmMessages);

    return { userMessage, stream, sources };
  }

  async saveAssistantMessage(
    sessionId: string,
    userId: string,
    organizationId: string,
    content: string,
    sources: RetrievedSource[] = [],
  ) {
    const message = await this.addMessage(
      sessionId,
      userId,
      organizationId,
      content,
      'assistant',
    );

    const citations = await this.persistCitations(
      message.id,
      organizationId,
      sources,
    );

    return { ...message, citations };
  }

  /**
   * Build the LLM message array: system prompt + retrieved context + the last
   * CHAT_HISTORY_LIMIT turns. Retrieval failures degrade gracefully to a
   * context-free prompt so chat keeps working when the vector store is down.
   */
  private async buildPrompt(
    sessionId: string,
    organizationId: string,
    query: string,
  ): Promise<{ llmMessages: LlmMessage[]; sources: RetrievedSource[] }> {
    const sources = await this.retrieve(organizationId, query);

    const history = await this.db
      .select({
        role: schema.chatMessage.role,
        content: schema.chatMessage.content,
      })
      .from(schema.chatMessage)
      .where(eq(schema.chatMessage.sessionId, sessionId))
      .orderBy(desc(schema.chatMessage.createdAt))
      .limit(this.historyLimit);

    const recentHistory = history
      .filter(
        (m) =>
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0,
      )
      .reverse()
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const systemContent =
      sources.length > 0
        ? `${BASE_SYSTEM_PROMPT}\n\n${this.buildContextBlock(sources)}`
        : `${BASE_SYSTEM_PROMPT}\n\nNo relevant passages were found in the uploaded documents for this question. Answer from general knowledge and make clear the answer is not grounded in the organization's documents. Do not invent citations.`;

    const llmMessages: LlmMessage[] = [
      { role: 'system', content: systemContent },
      ...recentHistory,
    ];

    return { llmMessages, sources };
  }

  private async retrieve(
    organizationId: string,
    query: string,
  ): Promise<RetrievedSource[]> {
    try {
      const vector = await this.embeddings.embedOne(query, 'query');
      const hits = await this.qdrant.search(organizationId, vector, this.topK);
      return hits.map((hit, i) => ({
        marker: i + 1,
        documentId: hit.payload.documentId,
        documentName: hit.payload.documentName,
        pageNumber: hit.payload.pageNumber,
        chunkText: hit.payload.chunkText,
        score: hit.score,
      }));
    } catch {
      // Retrieval is best-effort; never block chat on vector store issues.
      return [];
    }
  }

  private buildContextBlock(sources: RetrievedSource[]): string {
    const lines = sources.map(
      (s) =>
        `[${s.marker}] "${s.documentName}" (page ${s.pageNumber}): ${s.chunkText}`,
    );

    return [
      'Use the following sources retrieved from the organization\'s documents to answer the question.',
      'Cite them inline using [n] markers that match the source numbers below.',
      'Every statement grounded in these sources MUST carry a citation. If a claim is supported by multiple sources, cite all of them (for example [1][3]).',
      'Only cite sources that genuinely support the statement, and do not fabricate citations.',
      '',
      'Sources:',
      ...lines,
    ].join('\n');
  }

  private async persistCitations(
    messageId: string,
    organizationId: string,
    sources: RetrievedSource[],
  ) {
    if (sources.length === 0) return [];

    const rows = sources.map((s) => ({
      id: randomUUID(),
      messageId,
      organizationId,
      documentId: s.documentId,
      documentName: s.documentName,
      pageNumber: s.pageNumber,
      chunkText: s.chunkText,
      score: s.score,
      marker: s.marker,
    }));

    await this.db.insert(schema.citation).values(rows);
    return rows;
  }

  private async loadCitations(messageIds: string[]) {
    const map = new Map<string, (typeof schema.citation.$inferSelect)[]>();
    if (messageIds.length === 0) return map;

    const rows = await this.db
      .select()
      .from(schema.citation)
      .where(inArray(schema.citation.messageId, messageIds))
      .orderBy(asc(schema.citation.marker));

    for (const row of rows) {
      const list = map.get(row.messageId) ?? [];
      list.push(row);
      map.set(row.messageId, list);
    }

    return map;
  }
}
