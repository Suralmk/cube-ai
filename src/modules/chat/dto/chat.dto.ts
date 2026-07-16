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

export class UpdateChatSessionDto {
  @IsString()
  @IsNotEmpty()
  title: string;
}
