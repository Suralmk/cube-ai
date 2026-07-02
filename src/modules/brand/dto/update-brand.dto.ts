import { IsOptional, IsString } from 'class-validator';

export class UpdateBrandDto {
  @IsOptional()
  @IsString()
  readonly name?: string;

  @IsOptional()
  @IsString()
  readonly tone?: string;

  @IsOptional()
  @IsString()
  readonly description?: string;
}
