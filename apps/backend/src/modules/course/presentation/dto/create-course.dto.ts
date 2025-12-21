import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  IsUUID,
  MinLength,
  MaxLength,
  IsBoolean,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CourseLevel, LicenseType } from '@repo/shared';

export class LicenseOptionDto {
  @IsEnum(LicenseType)
  type: LicenseType;

  @IsNumber()
  price: number;

  @IsNumber()
  @IsOptional()
  seatCount?: number;

  @IsNumber()
  @IsOptional()
  durationMonths?: number;

  @IsBoolean()
  isSubscription: boolean;
}

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  description: string;

  @IsUUID()
  @IsNotEmpty()
  instructorId: string;

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

  // Marketplace fields
  @IsBoolean()
  @IsOptional()
  listOnMarketplace?: boolean;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  basePrice?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsBoolean()
  @IsOptional()
  isFree?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LicenseOptionDto)
  @IsOptional()
  licenseOptions?: LicenseOptionDto[];

  @IsBoolean()
  @IsOptional()
  includesCertificate?: boolean;
}
