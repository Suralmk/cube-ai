import { IsInt, IsString, Min } from 'class-validator';

export class CreateStorageDto {
  @IsString()
  readonly key: string;

  @IsString()
  readonly bucket: string;

  @IsString()
  readonly mimeType: string;

  @IsInt()
  @Min(0)
  readonly size: number;
}
