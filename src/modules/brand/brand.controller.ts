import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { BrandService } from './brand.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import type { Brand } from './entities/brand.entity';

@Controller('brands')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Get()
  findAll(): Brand[] {
    return this.brandService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Brand {
    return this.brandService.findOne(+id);
  }

  @Post()
  create(@Body() data: CreateBrandDto): Brand {
    return this.brandService.create(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateBrandDto): Brand {
    return this.brandService.update(+id, data);
  }
}
