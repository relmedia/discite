import { IsString, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { LicenseType } from '@repo/shared';

export class CreateCheckoutDto {
  @IsString()
  marketplaceCourseId: string;

  @IsEnum(LicenseType)
  licenseType: LicenseType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  seatCount?: number;
}

