import { IsString, IsNotEmpty, IsOptional, IsObject, MinLength, Matches } from 'class-validator';
import { TenantSettings } from '@repo/shared';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Subdomain can only contain lowercase letters, numbers, and hyphens',
  })
  subdomain: string;

  @IsOptional()
  @IsObject()
  settings?: Partial<TenantSettings>;
}