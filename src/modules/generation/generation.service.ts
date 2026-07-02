import { Injectable } from '@nestjs/common';
import { Generation } from './entities/generation.entity';
import { CreateGenerationDto } from './dto/create-generation.dto';
import { UpdateGenerationDto } from './dto/update-generation.dto';

@Injectable()
export class GenerationService {
  private readonly items: Generation[] = [];

  findAll(): Generation[] {
    return this.items;
  }

  findOne(id: number): Generation {
    return this.items.find((item) => item.id === id) as Generation;
  }

  create(data: CreateGenerationDto): Generation {
    const now = new Date().toISOString();
    const item: Generation = {
      id: this.items.length + 1,
      platform: data.platform,
      script: `Generated script for: ${data.prompt}`,
      hook: 'Stop scrolling — you need to see this.',
      caption: data.prompt,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    this.items.push(item);
    return item;
  }

  update(id: number, data: UpdateGenerationDto): Generation {
    const item = this.findOne(id);
    const updated: Generation = {
      ...item,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    const index = this.items.findIndex((entry) => entry.id === id);
    this.items[index] = updated;
    return updated;
  }
}
