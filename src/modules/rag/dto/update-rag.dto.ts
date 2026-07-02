import { IsOptional, IsString } from 'class-validator';

export class UpdateRagDto {
  @IsOptional()
  @IsString()
  readonly content?: string;

  @IsOptional()
  @IsString()
  readonly embeddingId?: string;
}
