import { IsString, IsEmail, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  // Optional: Only required if no invitationToken is provided
  @IsString()
  @IsOptional()
  tenantSubdomain?: string;

  // Optional: If provided, user joins the tenant from the invitation
  @IsString()
  @IsOptional()
  invitationToken?: string;
}
