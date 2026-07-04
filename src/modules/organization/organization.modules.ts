import { Module } from '@nestjs/common';
import { LoggerProvider } from 'src/common/providers/logger.provider';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';

@Module({
  controllers: [OrganizationController],
  providers: [LoggerProvider, OrganizationService],
  exports: [LoggerProvider],
})
export class OrganizationModule {}
