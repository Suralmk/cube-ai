import { Injectable } from '@nestjs/common';
import { slugify } from '../../common/utils/slugify';
import { Brand } from './entities/brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandService {
  private readonly items: Brand[] = [];

  findAll(): Brand[] {
    return this.items;
  }

  findOne(id: number): Brand {
    return this.items.find((item) => item.id === id) as Brand;
  }

  create(data: CreateBrandDto): Brand {
    const now = new Date().toISOString();
    const item: Brand = {
      id: this.items.length + 1,
      name: data.name,
      slug: slugify(data.name),
      tone: data.tone,
      description: data.description ?? '',
      createdAt: now,
      updatedAt: now,
    };
    this.items.push(item);
    return item;
  }

  update(id: number, data: UpdateBrandDto): Brand {
    const item = this.findOne(id);
    const updated: Brand = {
      ...item,
      ...data,
      slug: data.name ? slugify(data.name) : item.slug,
      updatedAt: new Date().toISOString(),
    };
    const index = this.items.findIndex((entry) => entry.id === id);
    this.items[index] = updated;
    return updated;
  }
}
