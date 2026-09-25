import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { OrganizationModule } from '../organization/organization.modules';
import { DocumentsModule } from '../documents/documents.module';
import { StorageModule } from '../storage/storage.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    OrganizationModule,
    DocumentsModule,
    StorageModule,
    ChatModule,
  ],
  controllers: [PublicController],
})
export class PublicModule {}
