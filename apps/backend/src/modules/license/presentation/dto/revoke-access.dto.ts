import { IsString, IsOptional } from 'class-validator';

export class RevokeAccessDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

