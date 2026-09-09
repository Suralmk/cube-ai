import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { createReadStream, type ReadStream } from 'fs';
import { dirname, isAbsolute, join, normalize, resolve, sep } from 'path';
import { StorageObject } from './entities/storage.entity';
import { CreateStorageDto } from './dto/create-storage.dto';
import { UpdateStorageDto } from './dto/update-storage.dto';

/**
 * Local-disk storage driver for development. Files are written under
 * STORAGE_LOCAL_DIR and referenced by a relative key (stored as document.s3_key
 * so the same field works for a future S3 driver).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly rootDir: string;

  // Legacy in-memory registry kept for the existing StorageController stub.
  private readonly objects: StorageObject[] = [];

  constructor(private readonly config: ConfigService) {
    const configured =
      this.config.get<string>('storage.localDir') ?? './storage';
    this.rootDir = isAbsolute(configured)
      ? configured
      : resolve(process.cwd(), configured);
  }

  async saveFile(key: string, buffer: Buffer): Promise<string> {
    const fullPath = this.resolveKey(key);
    await fs.mkdir(dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    this.logger.log(`Saved file → ${key}`);
    return key;
  }

  async readFile(key: string): Promise<Buffer> {
    const fullPath = this.resolveKey(key);
    try {
      return await fs.readFile(fullPath);
    } catch {
      throw new NotFoundException('File not found');
    }
  }

  createReadStream(key: string): ReadStream {
    return createReadStream(this.resolveKey(key));
  }

  async deleteFile(key: string): Promise<void> {
    await fs.rm(this.resolveKey(key), { force: true });
  }

  /** Resolve a storage key to an absolute path, guarding against traversal. */
  private resolveKey(key: string): string {
    const safe = normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = join(this.rootDir, safe);
    if (!fullPath.startsWith(this.rootDir + sep) && fullPath !== this.rootDir) {
      throw new NotFoundException('Invalid storage key');
    }
    return fullPath;
  }

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
