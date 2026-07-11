import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as schema from '../../db/schema';
import { DRIZZLE } from '../../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class ChatService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
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
      .orderBy(schema.chatMessage.createdAt);

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
}
