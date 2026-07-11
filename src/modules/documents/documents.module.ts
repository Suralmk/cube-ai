import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { OrganizationModule } from '../organization/organization.modules';
import { DbModule } from '../../db/db.module';

@Module({
  imports: [DbModule, OrganizationModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
