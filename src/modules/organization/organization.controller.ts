import { Controller, Get, Post, Put, Delete } from '@nestjs/common';
import { LoggerProvider } from 'src/common/providers/logger.provider';
import { OrganizationService } from './organization.service';
import {
  Session,
 type UserSession,
  AllowAnonymous,
  OptionalAuth,
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
}
