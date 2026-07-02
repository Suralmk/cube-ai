import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateAuthDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  readonly password?: string;
}
