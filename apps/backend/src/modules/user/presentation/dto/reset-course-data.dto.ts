import { IsBoolean, IsOptional, IsArray, IsString } from 'class-validator';

export class ResetCourseDataDto {
  @IsArray()
  @IsString({ each: true })
  courseIds: string[];

  @IsBoolean()
  @IsOptional()
  deleteCertificates?: boolean;
}

