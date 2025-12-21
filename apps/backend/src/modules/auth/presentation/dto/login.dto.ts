import { IsString, IsEmail, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsOptional()
  tenantSubdomain?: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
