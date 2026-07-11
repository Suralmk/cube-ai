import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateChatSessionDto {
  @IsOptional()
  @IsString()
  title?: string;
}

export class CreateChatMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}
