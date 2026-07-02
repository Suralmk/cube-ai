import { IsInt, IsString, Min } from 'class-validator';

export class CreateRagDto {
  @IsInt()
  @Min(1)
  readonly knowledgeId: number;

  @IsString()
  readonly content: string;
}
