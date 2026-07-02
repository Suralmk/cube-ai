import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthSession } from './entities/auth-session.entity';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';

@Injectable()
export class AuthService {
  private readonly sessions: AuthSession[] = [];

  findAll(): AuthSession[] {
    return this.sessions;
  }

  findOne(id: number): AuthSession {
    return this.sessions.find((item) => item.id === id) as AuthSession;
  }

  create(data: CreateAuthDto): AuthSession {
    const now = new Date().toISOString();
    const item: AuthSession = {
      id: this.sessions.length + 1,
      userId: this.sessions.length + 1,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.push(item);
    return item;
  }

  update(id: number, _data: UpdateAuthDto): AuthSession {
    const item = this.findOne(id);
    const updated: AuthSession = {
      ...item,
      token: randomUUID(),
      updatedAt: new Date().toISOString(),
    };
    const index = this.sessions.findIndex((entry) => entry.id === id);
    this.sessions[index] = updated;
    return updated;
  }
}
