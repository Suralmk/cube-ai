import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { asc, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as schema from '../../db/schema';
import { DRIZZLE } from '../../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { OpenRouterService, type LlmMessage } from './openrouter.service';

const SYSTEM_PROMPT = `You are Cube AI, an assistant for field technicians and maintenance teams.
Help them with equipment manuals, troubleshooting, safety procedures, and technical questions.
Be precise, practical, and clear. If you are unsure, say so.
When manuals/RAG context is unavailable, answer from general knowledge and note that answers are not yet grounded in uploaded documents.`;

@Injectable()
export class ChatService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly openRouter: OpenRouterService,
  ) {}

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

    return { session, messages };
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

    const history = await this.db
      .select({
        role: schema.chatMessage.role,
        content: schema.chatMessage.content,
      })
      .from(schema.chatMessage)
      .where(eq(schema.chatMessage.sessionId, sessionId))
      .orderBy(asc(schema.chatMessage.createdAt));

    const llmMessages: LlmMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
    ];

    const assistantContent = await this.openRouter.chat(llmMessages);

    const assistantMessage = await this.addMessage(
      sessionId,
      userId,
      organizationId,
      assistantContent,
      'assistant',
    );

    return { userMessage, assistantMessage };
  }

  /**
   * Persist the user message and open a streaming completion. Throws (before
   * any streaming begins) if the session is invalid or the LLM request fails,
   * so the controller can return a normal error response.
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

    const history = await this.db
      .select({
        role: schema.chatMessage.role,
        content: schema.chatMessage.content,
      })
      .from(schema.chatMessage)
      .where(eq(schema.chatMessage.sessionId, sessionId))
      .orderBy(asc(schema.chatMessage.createdAt));

    const llmMessages: LlmMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
    ];

    const stream = await this.openRouter.createChatStream(llmMessages);

    return { userMessage, stream };
  }

  async saveAssistantMessage(
    sessionId: string,
    userId: string,
    organizationId: string,
    content: string,
  ) {
    return this.addMessage(
      sessionId,
      userId,
      organizationId,
      content,
      'assistant',
    );
  }
}
