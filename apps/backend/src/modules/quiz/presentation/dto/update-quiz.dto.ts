import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuizQuestionDto } from './create-quiz.dto';

export class UpdateQuizQuestionDto extends QuizQuestionDto {
  @IsOptional()
  @IsString()
  id?: string;
}

export class UpdateQuizDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateQuizQuestionDto)
  questions?: UpdateQuizQuestionDto[];

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

