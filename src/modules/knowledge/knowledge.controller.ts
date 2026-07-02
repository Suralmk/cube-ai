import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { CreateKnowledgeDto } from './dto/create-knowledge.dto';
import { UpdateKnowledgeDto } from './dto/update-knowledge.dto';
import type { Knowledge } from './entities/knowledge.entity';

@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  findAll(): Knowledge[] {
    return this.knowledgeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Knowledge {
    return this.knowledgeService.findOne(+id);
  }

  @Post()
  create(@Body() data: CreateKnowledgeDto): Knowledge {
    return this.knowledgeService.create(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateKnowledgeDto): Knowledge {
    return this.knowledgeService.update(+id, data);
  }
}
