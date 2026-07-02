import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateStorageDto {
  @IsOptional()
  @IsString()
  readonly key?: string;

  @IsOptional()
  @IsString()
  readonly mimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  readonly size?: number;
}
