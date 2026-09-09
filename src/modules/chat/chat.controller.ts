import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import { ChatService } from './chat.service';
import { OrganizationService } from '../organization/organization.service';
import {
  CreateChatMessageDto,
  CreateChatSessionDto,
  UpdateChatSessionDto,
} from './dto/chat.dto';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly organizationService: OrganizationService,
  ) {}

  @Get('sessions')
  async listSessions(@Session() session: UserSession) {
    const org = await this.organizationService.fetchOrgByUser(session.user.id);
    return this.chatService.listSessions(
      session.user.id,
      org.organization.id,
    );
  }

  @Get('sessions/:id/messages')
  async getMessages(
    @Session() session: UserSession,
    @Param('id') id: string,
  ) {
    return this.chatService.getSessionMessages(id, session.user.id);
  }

  @Post('sessions')
  async createSession(
    @Session() session: UserSession,
    @Body() body: CreateChatSessionDto,
  ) {
    const org = await this.organizationService.fetchOrgByUser(session.user.id);
    return this.chatService.createSession(
      session.user.id,
      org.organization.id,
      body.title?.trim() || 'New chat',
    );
  }

  @Patch('sessions/:id')
  async updateSession(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: UpdateChatSessionDto,
  ) {
    return this.chatService.updateSession(
      id,
      session.user.id,
      body.title.trim(),
    );
  }

  @Delete('sessions/:id')
  async deleteSession(
    @Session() session: UserSession,
    @Param('id') id: string,
  ) {
    return this.chatService.deleteSession(id, session.user.id);
  }

  @Post('sessions/:id/messages')
  async sendMessage(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: CreateChatMessageDto,
  ) {
    const org = await this.organizationService.fetchOrgByUser(session.user.id);
    return this.chatService.sendMessage(
      id,
      session.user.id,
      org.organization.id,
      body.content.trim(),
    );
  }

  @Post('sessions/:id/messages/stream')
  async streamMessage(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: CreateChatMessageDto,
    @Res() res: Response,
  ) {
    const org = await this.organizationService.fetchOrgByUser(session.user.id);
    const userId = session.user.id;
    const organizationId = org.organization.id;

    // Runs before any SSE data is written, so failures here (invalid session,
    // upstream 429/404, etc.) propagate as a normal JSON error response.
    const { userMessage, stream, sources } =
      await this.chatService.startStreaming(
        id,
        userId,
        organizationId,
        body.content,
      );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const send = (event: Record<string, unknown>) =>
      res.write(`data: ${JSON.stringify(event)}\n\n`);

    // Keep the Next.js rewrite proxy (and browsers) from idle-closing the
    // connection while reasoning models think without emitting content.
    const keepAlive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 5000);

    send({ type: 'user_message', message: userMessage });

    let full = '';
    try {
      for await (const delta of stream) {
        full += delta;
        send({ type: 'delta', content: delta });
      }

      const content =
        full.trim() ||
        'I could not generate a response. Please try again.';
      const citationsToSave = full.trim() ? sources : [];

      const assistantMessage = await this.chatService.saveAssistantMessage(
        id,
        userId,
        organizationId,
        content,
        citationsToSave,
      );

      send({ type: 'done', message: assistantMessage });
    } catch (error) {
      send({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to generate a response',
      });
    } finally {
      clearInterval(keepAlive);
      res.end();
    }
  }
}
