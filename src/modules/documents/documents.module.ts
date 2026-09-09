import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { OrganizationModule } from '../organization/organization.modules';
import { DbModule } from '../../db/db.module';
import { StorageModule } from '../storage/storage.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [DbModule, OrganizationModule, StorageModule, RagModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
