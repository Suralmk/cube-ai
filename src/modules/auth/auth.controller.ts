import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import type { AuthSession } from './entities/auth-session.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('sessions')
  findAll(): AuthSession[] {
    return this.authService.findAll();
  }

  @Get('sessions/:id')
  findOne(@Param('id') id: string): AuthSession {
    return this.authService.findOne(+id);
  }

  @Post('register')
  register(@Body() data: CreateAuthDto): AuthSession {
    return this.authService.create(data);
  }

  @Post('login')
  login(@Body() data: CreateAuthDto): AuthSession {
    return this.authService.create(data);
  }

  @Patch('sessions/:id')
  update(@Param('id') id: string, @Body() data: UpdateAuthDto): AuthSession {
    return this.authService.update(+id, data);
  }
}
