import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { createReadStream, type ReadStream } from 'fs';
import { dirname, isAbsolute, join, normalize, resolve, sep } from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageObject } from './entities/storage.entity';
import { CreateStorageDto } from './dto/create-storage.dto';
import { UpdateStorageDto } from './dto/update-storage.dto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: 'local' | 's3';
  private readonly rootDir: string;
  private readonly s3Client?: S3Client;
  private readonly bucketName?: string;
  private readonly signedUrlExpiry: number;

  // Legacy in-memory registry kept for the existing StorageController stub.
  private readonly objects: StorageObject[] = [];

  constructor(private readonly config: ConfigService) {
    this.driver =
      (this.config.get<string>('storage.driver') as 'local' | 's3') ?? 'local';
    const configured =
      this.config.get<string>('storage.localDir') ?? './storage';
    this.rootDir = isAbsolute(configured)
      ? configured
      : resolve(process.cwd(), configured);

    this.bucketName = this.config.get<string>('storage.bucketName');
    this.signedUrlExpiry =
      this.config.get<number>('storage.signedUrlExpiry') ?? 3600;

    if (this.driver === 's3') {
      const region = this.config.get<string>('storage.region') ?? 'us-east-1';
      const endpoint = this.config.get<string>('storage.endpoint');
      const forcePathStyle =
        this.config.get<boolean>('storage.forcePathStyle') ?? false;

      this.s3Client = new S3Client({
        region,
        ...(endpoint ? { endpoint, forcePathStyle } : {}),
      });
      this.logger.log(
        `Initialized S3 Storage driver (bucket: ${this.bucketName}, region: ${region})`,
      );
    } else {
      this.logger.log(`Initialized Local Storage driver at: ${this.rootDir}`);
    }
  }

  get isS3(): boolean {
    return this.driver === 's3';
  }

  async saveFile(
    key: string,
    buffer: Buffer,
    mimeType: string = 'application/pdf',
  ): Promise<string> {
    if (this.driver === 's3') {
      if (!this.s3Client || !this.bucketName) {
        throw new Error('S3 Storage is not properly configured');
      }
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );
      this.logger.log(`Saved file to S3 → ${key}`);
      return key;
    }

    const fullPath = this.resolveKey(key);
    await fs.mkdir(dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    this.logger.log(`Saved file to local disk → ${key}`);
    return key;
  }

  async readFile(key: string): Promise<Buffer> {
    if (this.driver === 's3') {
      if (!this.s3Client || !this.bucketName) {
        throw new Error('S3 Storage is not properly configured');
      }
      try {
        const response = await this.s3Client.send(
          new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
          }),
        );
        if (!response.Body) {
          throw new NotFoundException('File not found in S3');
        }
        const byteArray = await response.Body.transformToByteArray();
        return Buffer.from(byteArray);
      } catch (err) {
        throw new NotFoundException('File not found in S3');
      }
    }

    const fullPath = this.resolveKey(key);
    try {
      return await fs.readFile(fullPath);
    } catch {
      throw new NotFoundException('File not found');
    }
  }

  async deleteFile(key: string): Promise<void> {
    if (this.driver === 's3') {
      if (!this.s3Client || !this.bucketName) {
        throw new Error('S3 Storage is not properly configured');
      }
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      return;
    }

    await fs.rm(this.resolveKey(key), { force: true });
  }

  async getPresignedDownloadUrl(
    key: string,
    expiresIn: number = this.signedUrlExpiry,
  ): Promise<string> {
    if (this.driver === 's3' && this.s3Client && this.bucketName) {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      return getSignedUrl(this.s3Client, command, { expiresIn });
    }
    return `/api/v1/documents/file-raw?key=${encodeURIComponent(key)}`;
  }

  async getPresignedUploadUrl(
    key: string,
    contentType: string = 'application/pdf',
    expiresIn: number = this.signedUrlExpiry,
  ): Promise<string> {
    if (this.driver === 's3' && this.s3Client && this.bucketName) {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });
      return getSignedUrl(this.s3Client, command, { expiresIn });
    }
    return '';
  }

  createReadStream(key: string): ReadStream {
    return createReadStream(this.resolveKey(key));
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
    const bucket = data.bucket || this.bucketName || 'cube-ai-storage';
    const item: StorageObject = {
      id: this.objects.length + 1,
      key: data.key,
      bucket,
      mimeType: data.mimeType,
      size: data.size,
      url: `https://${bucket}.s3.amazonaws.com/${data.key}`,
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
