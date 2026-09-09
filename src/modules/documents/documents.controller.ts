import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import {
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import { DocumentsService } from './documents.service';
import { OrganizationService } from '../organization/organization.service';
import { StorageService } from '../storage/storage.service';
import { IndexingService } from '../rag/indexing.service';

type UploadedFileType = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly organizationService: OrganizationService,
    private readonly storage: StorageService,
    private readonly indexing: IndexingService,
  ) {}

  @Get()
  async list(@Session() session: UserSession) {
    const org = await this.organizationService.fetchOrgByUser(session.user.id);
    return this.documentsService.findByOrganizationId(org.organization.id);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async upload(
    @Session() session: UserSession,
    @UploadedFile() file: UploadedFileType,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF documents are supported');
    }

    const org = await this.organizationService.fetchOrgByUser(session.user.id);
    const organizationId = org.organization.id;

    const key = `documents/${organizationId}/${randomUUID()}${extname(
      file.originalname,
    ) || '.pdf'}`;
    await this.storage.saveFile(key, file.buffer);

    const doc = await this.documentsService.create({
      uploadedBy: session.user.id,
      organizationId,
      title: file.originalname.replace(/\.[^.]+$/, ''),
      filename: file.originalname,
      documentType: 'pdf',
      s3Key: key,
    });

    // Kick off indexing without blocking the upload response.
    this.indexing.indexInBackground(doc.id);

    return doc;
  }

  @Post(':id/reindex')
  async reindex(@Session() session: UserSession, @Param('id') id: string) {
    const org = await this.organizationService.fetchOrgByUser(session.user.id);
    const doc = await this.documentsService.findByIdForOrg(
      id,
      org.organization.id,
    );
    this.indexing.indexInBackground(doc.id);
    return { id: doc.id, status: 'indexing' };
  }

  @Get(':id/file')
  async file(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const org = await this.organizationService.fetchOrgByUser(session.user.id);
    const doc = await this.documentsService.findByIdForOrg(
      id,
      org.organization.id,
    );

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
