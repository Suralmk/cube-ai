import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RagService } from './rag.service';
import { CreateRagDto } from './dto/create-rag.dto';
import { UpdateRagDto } from './dto/update-rag.dto';
import type { RagDocument } from './entities/rag-document.entity';

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Get()
  findAll(): RagDocument[] {
    return this.ragService.findAll();
  }

  @Get('query')
  query(@Query('q') query: string): RagDocument[] {
    return this.ragService.query(query ?? '');
  }

  @Get(':id')
  findOne(@Param('id') id: string): RagDocument {
    return this.ragService.findOne(+id);
  }

  @Post()
  create(@Body() data: CreateRagDto): RagDocument {
    return this.ragService.create(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateRagDto): RagDocument {
    return this.ragService.update(+id, data);
  }
}
