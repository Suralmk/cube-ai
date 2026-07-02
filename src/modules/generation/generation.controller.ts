import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { GenerationService } from './generation.service';
import { CreateGenerationDto } from './dto/create-generation.dto';
import { UpdateGenerationDto } from './dto/update-generation.dto';
import type { Generation } from './entities/generation.entity';

@Controller('generation')
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Get()
  findAll(): Generation[] {
    return this.generationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Generation {
    return this.generationService.findOne(+id);
  }

  @Post()
  create(@Body() data: CreateGenerationDto): Generation {
    return this.generationService.create(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateGenerationDto): Generation {
    return this.generationService.update(+id, data);
  }
}
