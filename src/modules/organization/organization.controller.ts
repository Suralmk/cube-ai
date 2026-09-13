import { Body, Controller, Get, Post } from '@nestjs/common';
import { LoggerProvider } from '../../common/providers/logger.provider';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import {
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';

@Controller('organizations')
export class OrganizationController {
  constructor(
    private readonly logger: LoggerProvider,
    private readonly orgService: OrganizationService,
  ) {}

  @Get()
  async fetchOrgByUser(@Session() session: UserSession) {
    return this.orgService.fetchOrgByUser(session.user.id);
  }

  @Post()
  async createOrganization(
    @Session() session: UserSession,
    @Body() dto: CreateOrganizationDto,
  ) {
    this.logger.log(`Creating organization for user ${session.user.id}`);
    return this.orgService.createForUser(session.user.id, dto);
  }
}
