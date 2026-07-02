import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly users: User[] = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@example.com',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 2,
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
  ];

  findAll(): User[] {
    return this.users;
  }

  findOne(id: number): User {
    return this.users.find((user) => user.id === id) as User;
  }

  create(userData: CreateUserDto): User {
    const now = new Date().toISOString();
    const user: User = {
      ...userData,
      id: this.users.length + 1,
      createdAt: now,
      updatedAt: now,
    };
    this.users.push(user);
    return user;
  }

  update(id: number, userData: UpdateUserDto): User {
    const user = this.findOne(id);
    const updatedUser: User = {
      ...user,
      ...userData,
      updatedAt: new Date().toISOString(),
    };
    const index = this.users.findIndex((item) => item.id === id);
    this.users[index] = updatedUser;
    return updatedUser;
  }
}
