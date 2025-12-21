import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { CourseLevel, CourseStatus } from '@repo/shared';

export class UpdateCourseDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(20)
  @IsOptional()
  description?: string;

  @IsEnum(CourseLevel)
  @IsOptional()
  level?: CourseLevel;

  @IsNumber()
  @IsOptional()
  durationHours?: number;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsEnum(CourseStatus)
  @IsOptional()
  status?: CourseStatus;

  // Certificate settings
  @IsBoolean()
  @IsOptional()
  enableCertificate?: boolean;

  @IsUUID()
  @IsOptional()
  certificateTemplateId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  certificateExpiryMonths?: number;

  @IsBoolean()
  @IsOptional()
  includeGradeOnCertificate?: boolean;
}
