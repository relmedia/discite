import { IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { LessonType } from '@repo/shared';

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;  // Markdown content

  @IsOptional()
  @IsEnum(LessonType)
  type?: LessonType;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationMinutes?: number;
}
