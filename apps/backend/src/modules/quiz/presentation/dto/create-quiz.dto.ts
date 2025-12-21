import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsUUID,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum QuizQuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
}

export class QuizQuestionDto {
  @IsString()
  question: string;

  @IsEnum(QuizQuestionType)
  type: QuizQuestionType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsString()
  correctAnswer: string | string[];

  @IsInt()
  @Min(1)
  points: number;
}

export class CreateQuizDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  courseId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions: QuizQuestionDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @IsNumber()
  passingScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  requiredLessonIds?: string[];

  @IsOptional()
  @IsUUID()
  attachedToLessonId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;
}

