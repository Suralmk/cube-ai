import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { LoggerProvider } from '../../common/providers/logger.provider';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(
    private readonly loggerProvider: LoggerProvider,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  findAll(): User[] {
    this.loggerProvider.log('Finding all users');
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): User {
    this.loggerProvider.log(`Finding user with id ${id}`);
    return this.usersService.findOne(+id);
  }

  @Post()
  create(@Body() userData: CreateUserDto): User {
    this.loggerProvider.log('Creating user with data');
    return this.usersService.create(userData);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() userData: UpdateUserDto): User {
    this.loggerProvider.log(`Updating user with id ${id}`);
    return this.usersService.update(+id, userData);
  }
}
