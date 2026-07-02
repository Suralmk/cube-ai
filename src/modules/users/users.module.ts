import { Module } from '@nestjs/common';
import { LoggerProvider } from '../../common/providers/logger.provider';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService, LoggerProvider],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
