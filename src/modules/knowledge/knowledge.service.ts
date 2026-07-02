import { Injectable } from '@nestjs/common';
import { Knowledge } from './entities/knowledge.entity';
import { CreateKnowledgeDto } from './dto/create-knowledge.dto';
import { UpdateKnowledgeDto } from './dto/update-knowledge.dto';

@Injectable()
export class KnowledgeService {
  private readonly items: Knowledge[] = [];

  findAll(): Knowledge[] {
    return this.items;
  }

  findOne(id: number): Knowledge {
    return this.items.find((item) => item.id === id) as Knowledge;
  }

  create(data: CreateKnowledgeDto): Knowledge {
    const now = new Date().toISOString();
    const item: Knowledge = {
      ...data,
      id: this.items.length + 1,
      createdAt: now,
      updatedAt: now,
    };
    this.items.push(item);
    return item;
  }

  update(id: number, data: UpdateKnowledgeDto): Knowledge {
    const item = this.findOne(id);
    const updated: Knowledge = {
      ...item,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    const index = this.items.findIndex((entry) => entry.id === id);
    this.items[index] = updated;
    return updated;
  }
}
