import { IsString, IsEmail, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { UserRole } from '@repo/shared';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsUUID()
  groupId?: string | null;
}

