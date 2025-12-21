import { IsString, IsEnum, IsOptional, IsInt, Min, IsUUID } from 'class-validator';
import { LessonType } from '@repo/shared';

export class CreateLessonDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  content?: string;  // Markdown content

  @IsUUID()
  courseId: string;

  @IsEnum(LessonType)
  type: LessonType;

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
