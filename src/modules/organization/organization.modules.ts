import { Module } from '@nestjs/common';
import { LoggerProvider } from 'src/common/providers/logger.provider';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { DbModule } from '../../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [OrganizationController],
  providers: [LoggerProvider, OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
