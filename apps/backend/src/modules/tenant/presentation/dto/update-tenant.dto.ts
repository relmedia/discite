import { IsString, IsOptional, IsObject, IsBoolean, MinLength, Matches } from 'class-validator';
import { TenantSettings } from '@repo/shared';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  settings?: Partial<TenantSettings>;

  @IsOptional()
  @IsString()
  @Matches(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/, {
    message: 'Custom domain must be a valid domain (e.g., learn.company.com)',
  })
  customDomain?: string;
}

