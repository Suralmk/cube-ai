import { Injectable } from '@nestjs/common';
import { StorageObject } from './entities/storage.entity';
import { CreateStorageDto } from './dto/create-storage.dto';
import { UpdateStorageDto } from './dto/update-storage.dto';

@Injectable()
export class StorageService {
  private readonly objects: StorageObject[] = [];

  findAll(): StorageObject[] {
    return this.objects;
  }

  findOne(id: number): StorageObject {
    return this.objects.find((item) => item.id === id) as StorageObject;
  }

  create(data: CreateStorageDto): StorageObject {
    const now = new Date().toISOString();
    const item: StorageObject = {
      id: this.objects.length + 1,
      key: data.key,
      bucket: data.bucket,
      mimeType: data.mimeType,
      size: data.size,
      url: `https://${data.bucket}.s3.amazonaws.com/${data.key}`,
      createdAt: now,
      updatedAt: now,
    };
    this.objects.push(item);
    return item;
  }

  update(id: number, data: UpdateStorageDto): StorageObject {
    const item = this.findOne(id);
    const updated: StorageObject = {
      ...item,
      ...data,
      url: data.key
        ? `https://${item.bucket}.s3.amazonaws.com/${data.key}`
        : item.url,
      updatedAt: new Date().toISOString(),
    };
    const index = this.objects.findIndex((entry) => entry.id === id);
    this.objects[index] = updated;
    return updated;
  }
}
