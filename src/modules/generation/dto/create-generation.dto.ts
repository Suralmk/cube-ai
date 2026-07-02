import { IsIn, IsString } from 'class-validator';

export class CreateGenerationDto {
  @IsIn(['tiktok', 'reels', 'youtube-shorts'])
  readonly platform: string;

  @IsString()
  readonly prompt: string;
}
