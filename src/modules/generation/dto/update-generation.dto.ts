import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateGenerationDto {
  @IsOptional()
  @IsIn(['tiktok', 'reels', 'youtube-shorts'])
  readonly platform?: string;

  @IsOptional()
  @IsString()
  readonly script?: string;

  @IsOptional()
  @IsString()
  readonly hook?: string;

  @IsOptional()
  @IsString()
  readonly caption?: string;

  @IsOptional()
  @IsIn(['pending', 'completed', 'failed'])
  readonly status?: string;
}
