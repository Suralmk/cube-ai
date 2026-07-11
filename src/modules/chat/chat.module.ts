import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { OrganizationModule } from '../organization/organization.modules';
import { DbModule } from '../../db/db.module';

@Module({
  imports: [DbModule, OrganizationModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
