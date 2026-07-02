import { IsOptional, IsString } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  readonly name: string;

  @IsString()
  readonly tone: string;

  @IsOptional()
  @IsString()
  readonly description?: string;
}
