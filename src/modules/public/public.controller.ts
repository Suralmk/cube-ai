import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { OrganizationService } from '../organization/organization.service';
import { DocumentsService } from '../documents/documents.service';
import { StorageService } from '../storage/storage.service';
import { ChatService } from '../chat/chat.service';
import {
  CreateChatMessageDto,
  CreateChatSessionDto,
} from '../chat/dto/chat.dto';

@AllowAnonymous()
@Controller('public')
export class PublicController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly documentsService: DocumentsService,
    private readonly storage: StorageService,
    private readonly chatService: ChatService,
  ) {}

  /**
   * Fetch public company profile and available maintenance documents summary
   */
  @Get('organizations/:slug')
  async getPublicOrganization(@Param('slug') slug: string) {
    const orgBundle = await this.organizationService.fetchOrgBySlug(slug);
    const documents = await this.documentsService.findPublicDocumentsByOrg(
      orgBundle.organization.id,
    );

    return {
      organization: {
        id: orgBundle.organization.id,
        name: orgBundle.organization.name,
        slug: orgBundle.organization.slug,
      },
      profile: {
        industry: orgBundle.profile?.industry ?? null,
        website: orgBundle.profile?.website ?? null,
        logo: orgBundle.profile?.logo ?? null,
        phone: orgBundle.profile?.phone ?? null,
        address: orgBundle.profile?.address ?? null,
        city: orgBundle.profile?.city ?? null,
        state: orgBundle.profile?.state ?? null,
        country: orgBundle.profile?.country ?? null,
      },
      settings: {
        companySlogan: orgBundle.settings?.companySlogan ?? null,
        branding: orgBundle.settings?.branding ?? null,
      },
      documents,
      documentCount: documents.length,
    };
  }

  /**
   * Create an anonymous public chat session for an organization
   */
  @Post('chat/:slug/sessions')
  async createPublicSession(
    @Param('slug') slug: string,
    @Body() body: CreateChatSessionDto,
  ) {
    const orgBundle = await this.organizationService.fetchOrgBySlug(slug);
    return this.chatService.createPublicSession(
      orgBundle.organization.id,
      body.title?.trim() || `${orgBundle.organization.name} Assistant`,
    );
  }

  /**
   * Retrieve messages and citations for a public chat session
   */
  @Get('chat/:slug/sessions/:sessionId/messages')
  async getPublicSessionMessages(
    @Param('slug') slug: string,
    @Param('sessionId') sessionId: string,
  ) {
    const orgBundle = await this.organizationService.fetchOrgBySlug(slug);
    return this.chatService.getPublicSessionMessages(
      sessionId,
      orgBundle.organization.id,
    );
  }

  /**
   * Stream a maintenance question response for a public chat session
   */
  @Post('chat/:slug/sessions/:sessionId/messages/stream')
  async streamPublicMessage(
    @Param('slug') slug: string,
    @Param('sessionId') sessionId: string,
    @Body() body: CreateChatMessageDto,
    @Res() res: Response,
  ) {
    const orgBundle = await this.organizationService.fetchOrgBySlug(slug);
    const organizationId = orgBundle.organization.id;

    const companyContext = {
      name: orgBundle.organization.name,
      slogan: orgBundle.settings?.companySlogan,
      industry: orgBundle.profile?.industry,
    };

    const { userMessage, stream, sources } =
      await this.chatService.startPublicStreaming(
        sessionId,
        organizationId,
        body.content,
        companyContext,
      );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const send = (event: Record<string, unknown>) =>
      res.write(`data: ${JSON.stringify(event)}\n\n`);

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
        `I could not find sufficient information in ${orgBundle.organization.name}'s maintenance documentation to answer this question.`;
      const citationsToSave = full.trim() ? sources : [];

      const assistantMessage =
        await this.chatService.savePublicAssistantMessage(
          sessionId,
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

  /**
   * Public endpoint to serve PDF documents for citations in public chat
   */
  @Get('documents/:id/file')
  async getPublicDocumentFile(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const doc = await this.documentsService.findById(id);
    const buffer = await this.storage.readFile(doc.s3_key);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(doc.filename)}"`,
    );
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }
}
