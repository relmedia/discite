import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsUUID,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConversationType } from '@/infrastructure/database/entities/conversation.entity';

export class CreateConversationDto {
  @IsEnum(ConversationType)
  type: ConversationType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  participantIds: string[];

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;
}

class AttachmentDto {
  @IsString()
  type: string;

  @IsString()
  url: string;

  @IsString()
  name: string;

  @IsOptional()
  size?: number;
}

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsOptional()
  @IsUUID()
  replyToId?: string;
}

export class EditMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}

export class AddParticipantsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];
}

export class StartDirectConversationDto {
  @IsUUID()
  userId: string;
}
