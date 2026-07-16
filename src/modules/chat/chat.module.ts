import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { OpenRouterService } from './openrouter.service';
import { OrganizationModule } from '../organization/organization.modules';
import { DbModule } from '../../db/db.module';

@Module({
  imports: [DbModule, OrganizationModule],
  controllers: [ChatController],
  providers: [ChatService, OpenRouterService],
  exports: [ChatService],
})
export class ChatModule {}
