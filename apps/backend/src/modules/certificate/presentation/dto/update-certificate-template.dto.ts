import { IsString, IsBoolean, IsOptional, IsObject, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class CertificateDesignDto {
  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  fontFamily?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  backgroundImageUrl?: string;

  @IsOptional()
  @IsString()
  borderStyle?: 'none' | 'simple' | 'ornate' | 'modern' | 'all-around';

  @IsOptional()
  @IsNumber()
  borderThickness?: number;

  @IsOptional()
  @IsString()
  borderColor?: string;

  @IsOptional()
  @IsString()
  layout?: 'classic' | 'modern' | 'minimal' | 'elegant' | 'swedish';

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  companyAddress?: string;

  @IsOptional()
  @IsString()
  companyContact?: string;

  @IsOptional()
  @IsString()
  complianceText?: string;

  @IsOptional()
  @IsBoolean()
  showPersonalNumber?: boolean;
}

export class UpdateCertificateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CertificateDesignDto)
  design?: CertificateDesignDto;

  @IsOptional()
  @IsString()
  titleText?: string;

  @IsOptional()
  @IsString()
  bodyTemplate?: string;

  @IsOptional()
  @IsString()
  signatureText?: string;

  @IsOptional()
  @IsString()
  signatureImageUrl?: string;

  @IsOptional()
  @IsString()
  issuedByText?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

