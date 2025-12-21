import { IsString, IsEmail, IsOptional } from 'class-validator';

export class OAuthDto {
  @IsString()
  provider: string;

  @IsString()
  providerAccountId: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  accessToken?: string;

  @IsString()
  @IsOptional()
  refreshToken?: string;
}

