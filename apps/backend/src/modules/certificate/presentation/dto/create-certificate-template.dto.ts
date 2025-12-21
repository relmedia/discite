import { IsString, IsBoolean, IsOptional, IsObject, ValidateNested, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

// Element style for visual editor
class CertificateElementStyleDto {
  @IsNumber()
  fontSize: number;

  @IsString()
  fontFamily: string;

  @IsString()
  fontWeight: 'normal' | 'bold';

  @IsString()
  fontStyle: 'normal' | 'italic';

  @IsString()
  textDecoration: 'none' | 'underline';

  @IsString()
  textAlign: 'left' | 'center' | 'right';

  @IsString()
  color: string;

  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @IsOptional()
  @IsNumber()
  letterSpacing?: number;

  @IsOptional()
  @IsNumber()
  lineHeight?: number;

  @IsOptional()
  @IsNumber()
  opacity?: number;

  @IsOptional()
  @IsNumber()
  rotation?: number;
}

// Position for visual editor element
class CertificateElementPositionDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;
}

// Size for visual editor element
class CertificateElementSizeDto {
  @IsNumber()
  width: number;

  @IsOptional()
  @IsNumber()
  height?: number;
}

// Visual editor element
class CertificateElementDto {
  @IsString()
  id: string;

  @IsString()
  type: 'text' | 'placeholder' | 'image' | 'shape' | 'line';

  @IsString()
  content: string;

  @ValidateNested()
  @Type(() => CertificateElementPositionDto)
  position: CertificateElementPositionDto;

  @ValidateNested()
  @Type(() => CertificateElementSizeDto)
  size: CertificateElementSizeDto;

  @ValidateNested()
  @Type(() => CertificateElementStyleDto)
  style: CertificateElementStyleDto;

  @IsOptional()
  @IsBoolean()
  locked?: boolean;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @IsOptional()
  @IsNumber()
  zIndex?: number;
}

class CertificateDesignDto {
  @IsString()
  backgroundColor: string;

  @IsString()
  primaryColor: string;

  @IsString()
  secondaryColor: string;

  @IsString()
  fontFamily: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  backgroundImageUrl?: string;

  @IsString()
  borderStyle: 'none' | 'simple' | 'ornate' | 'modern' | 'all-around';

  @IsOptional()
  @IsNumber()
  borderThickness?: number;

  @IsOptional()
  @IsString()
  borderColor?: string;

  @IsString()
  layout: 'classic' | 'modern' | 'minimal' | 'elegant' | 'swedish' | 'custom';

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

  // Visual editor fields
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificateElementDto)
  elements?: CertificateElementDto[];

  @IsOptional()
  @IsBoolean()
  useVisualEditor?: boolean;
}

export class CreateCertificateTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CertificateDesignDto)
  design: CertificateDesignDto;

  @IsString()
  titleText: string;

  @IsString()
  bodyTemplate: string;

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
}

