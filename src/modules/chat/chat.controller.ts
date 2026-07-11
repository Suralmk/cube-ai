import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import { ChatService } from './chat.service';
import { OrganizationService } from '../organization/organization.service';
import { CreateChatMessageDto, CreateChatSessionDto } from './dto/chat.dto';

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

  @Post('sessions/:id/messages')
  async sendMessage(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: CreateChatMessageDto,
  ) {
    const org = await this.organizationService.fetchOrgByUser(session.user.id);
    const userMessage = await this.chatService.addMessage(
      id,
      session.user.id,
      org.organization.id,
      body.content.trim(),
      'user',
    );

    const assistantMessage = await this.chatService.addMessage(
      id,
      session.user.id,
      org.organization.id,
      'This is a placeholder response. Connect RAG + OpenRouter in the generation pipeline for cited answers from your manuals.',
      'assistant',
    );

    return { userMessage, assistantMessage };
  }
}
