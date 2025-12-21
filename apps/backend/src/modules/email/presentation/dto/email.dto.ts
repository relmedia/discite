import { IsString, IsOptional, IsBoolean, IsNumber, IsEmail, IsEnum, IsArray, ValidateNested, IsObject, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { EmailTemplateType, EmailProvider } from '@/infrastructure/database/entities/email.entity';

// ============================================
// Provider Settings DTOs
// ============================================

export class SmtpAuthDto {
  @IsString()
  user: string;

  @IsString()
  pass: string;
}

export class SmtpSettingsDto {
  @IsString()
  host: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;

  @IsBoolean()
  secure: boolean;

  @ValidateNested()
  @Type(() => SmtpAuthDto)
  auth: SmtpAuthDto;

  @IsString()
  fromName: string;

  @IsEmail()
  fromEmail: string;

  @IsOptional()
  @IsEmail()
  replyToEmail?: string;
}

export class ResendSettingsDto {
  @IsString()
  apiKey: string;

  @IsString()
  fromName: string;

  @IsEmail()
  fromEmail: string;

  @IsOptional()
  @IsEmail()
  replyToEmail?: string;
}

export class NotificationSettingsDto {
  @IsBoolean()
  courseEnrolled: boolean;

  @IsBoolean()
  courseCompleted: boolean;

  @IsBoolean()
  quizResult: boolean;

  @IsBoolean()
  certificateIssued: boolean;

  @IsBoolean()
  licenseAssigned: boolean;

  @IsBoolean()
  newMessage: boolean;
}

export class SaveEmailSettingsDto {
  @IsEnum(EmailProvider)
  provider: EmailProvider;

  @IsOptional()
  @ValidateNested()
  @Type(() => SmtpSettingsDto)
  smtp?: SmtpSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ResendSettingsDto)
  resend?: ResendSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notificationSettings?: NotificationSettingsDto;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class SendTestEmailDto {
  @IsEmail()
  email: string;
}

// ============================================
// Email Template DTOs
// ============================================

export class EmailElementStyleDto {
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
  padding?: number;

  @IsOptional()
  @IsNumber()
  margin?: number;

  @IsOptional()
  @IsNumber()
  borderRadius?: number;

  @IsOptional()
  @IsNumber()
  borderWidth?: number;

  @IsOptional()
  @IsString()
  borderColor?: string;

  @IsOptional()
  @IsNumber()
  lineHeight?: number;
}

export class EmailElementDto {
  @IsString()
  id: string;

  @IsString()
  type: 'text' | 'heading' | 'button' | 'image' | 'divider' | 'spacer' | 'columns' | 'social' | 'footer';

  @IsString()
  content: string;

  @ValidateNested()
  @Type(() => EmailElementStyleDto)
  style: EmailElementStyleDto;

  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;

  @IsNumber()
  order: number;
}

export class SocialLinksDto {
  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  twitter?: string;

  @IsOptional()
  @IsString()
  linkedin?: string;

  @IsOptional()
  @IsString()
  instagram?: string;
}

export class EmailDesignDto {
  @IsString()
  backgroundColor: string;

  @IsString()
  contentBackgroundColor: string;

  @IsNumber()
  @Min(300)
  @Max(800)
  contentWidth: number;

  @IsString()
  fontFamily: string;

  @IsBoolean()
  showHeader: boolean;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsNumber()
  logoWidth?: number;

  @IsOptional()
  @IsString()
  headerBackgroundColor?: string;

  @IsBoolean()
  showFooter: boolean;

  @IsOptional()
  @IsString()
  footerText?: string;

  @IsOptional()
  @IsBoolean()
  unsubscribeLink?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailElementDto)
  elements: EmailElementDto[];

  @IsBoolean()
  useVisualEditor: boolean;
}

export class CreateEmailTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(EmailTemplateType)
  type: EmailTemplateType;

  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  previewText?: string;

  @ValidateNested()
  @Type(() => EmailDesignDto)
  design: EmailDesignDto;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateEmailTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(EmailTemplateType)
  type?: EmailTemplateType;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  previewText?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmailDesignDto)
  design?: EmailDesignDto;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================
// Email Sending DTOs
// ============================================

export class SendEmailDto {
  @IsEmail()
  to: string;

  @IsOptional()
  @IsString()
  toName?: string;

  @IsString()
  subject: string;

  @IsString()
  htmlContent: string;

  @IsOptional()
  @IsString()
  textContent?: string;
}

export class SendTemplatedEmailDto {
  @IsEmail()
  to: string;

  @IsOptional()
  @IsString()
  toName?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsEnum(EmailTemplateType)
  templateType?: EmailTemplateType;

  @IsObject()
  variables: Record<string, any>;
}

// ============================================
// Campaign DTOs
// ============================================

export class CampaignRecipientDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;
}

export class CreateCampaignDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsString()
  subject: string;

  @IsString()
  htmlContent: string;

  @IsOptional()
  @IsString()
  textContent?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignRecipientDto)
  recipients: CampaignRecipientDto[];

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}

// ============================================
// Query DTOs
// ============================================

export class GetLogsQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UnsubscribeDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
