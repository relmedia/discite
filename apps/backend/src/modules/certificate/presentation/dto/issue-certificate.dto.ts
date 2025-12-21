import { IsString, IsOptional, IsNumber } from 'class-validator';

export class IssueCertificateDto {
  @IsString()
  courseId: string;

  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  templateId?: string; // Override course's default template

  @IsOptional()
  @IsString()
  studentNameOverride?: string; // Custom name on certificate

  @IsOptional()
  @IsNumber()
  finalGrade?: number;
}

export class RevokeCertificateDto {
  @IsString()
  reason: string;
}

