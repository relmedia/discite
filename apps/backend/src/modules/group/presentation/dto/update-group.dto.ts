import { IsString, IsOptional, IsUUID } from 'class-validator';

export class UpdateGroupDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  leaderId?: string;

  @IsUUID()
  @IsOptional()
  trainerId?: string;
}
