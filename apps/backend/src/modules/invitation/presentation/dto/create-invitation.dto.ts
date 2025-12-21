import { IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { UserRole } from '@repo/shared';

export class CreateInvitationDto {
  @IsEmail()
  email: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole = UserRole.STUDENT;

  @IsUUID()
  @IsOptional()
  groupId?: string;

  @IsString()
  @IsOptional()
  message?: string;
}

export class BulkInviteDto {
  @IsEmail({}, { each: true })
  emails: string[];

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole = UserRole.STUDENT;

  @IsUUID()
  @IsOptional()
  groupId?: string;

  @IsString()
  @IsOptional()
  message?: string;
}

