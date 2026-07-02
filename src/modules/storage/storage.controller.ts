import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { StorageService } from './storage.service';
import { CreateStorageDto } from './dto/create-storage.dto';
import { UpdateStorageDto } from './dto/update-storage.dto';
import type { StorageObject } from './entities/storage.entity';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get()
  findAll(): StorageObject[] {
    return this.storageService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): StorageObject {
    return this.storageService.findOne(+id);
  }

  @Post()
  create(@Body() data: CreateStorageDto): StorageObject {
    return this.storageService.create(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateStorageDto): StorageObject {
    return this.storageService.update(+id, data);
  }
}
