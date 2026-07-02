import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateKnowledgeDto {
  @IsString()
  readonly title: string;

  @IsString()
  readonly sourceType: string;

  @IsOptional()
  @IsUrl()
  readonly sourceUrl?: string;

  @IsString()
  readonly content: string;
}
