import { Controller, Get } from '@nestjs/common';
import {
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import { DocumentsService } from './documents.service';
import { OrganizationService } from '../organization/organization.service';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly organizationService: OrganizationService,
  ) {}

  @Get()
  async list(@Session() session: UserSession) {
    const org = await this.organizationService.fetchOrgByUser(session.user.id);
    return this.documentsService.findByOrganizationId(org.organization.id);
  }
}
