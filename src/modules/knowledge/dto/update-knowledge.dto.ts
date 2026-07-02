import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateKnowledgeDto {
  @IsOptional()
  @IsString()
  readonly title?: string;

  @IsOptional()
  @IsString()
  readonly sourceType?: string;

  @IsOptional()
  @IsUrl()
  readonly sourceUrl?: string;

  @IsOptional()
  @IsString()
  readonly content?: string;
}
