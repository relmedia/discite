import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';

// ============================================
// EMAIL TEMPLATE TYPES
// ============================================

export enum EmailTemplateType {
  // Transactional
  WELCOME = 'WELCOME',
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  ACCOUNT_ACTIVATION = 'ACCOUNT_ACTIVATION',
  
  // Notifications
  COURSE_ENROLLED = 'COURSE_ENROLLED',
  COURSE_COMPLETED = 'COURSE_COMPLETED',
  QUIZ_RESULT = 'QUIZ_RESULT',
  CERTIFICATE_ISSUED = 'CERTIFICATE_ISSUED',
  LICENSE_ASSIGNED = 'LICENSE_ASSIGNED',
  NEW_MESSAGE = 'NEW_MESSAGE',
  
  // Marketing
  NEWSLETTER = 'NEWSLETTER',
  PROMOTIONAL = 'PROMOTIONAL',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  
  // Custom
  CUSTOM = 'CUSTOM',
}

// Visual editor element style
export interface EmailElementStyle {
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor?: string;
  padding?: number;
  margin?: number;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  lineHeight?: number;
}

// Visual editor element types
export type EmailElementType = 'text' | 'heading' | 'button' | 'image' | 'divider' | 'spacer' | 'columns' | 'social' | 'footer';

// Visual editor element
export interface EmailElement {
  id: string;
  type: EmailElementType;
  content: string;
  style: EmailElementStyle;
  properties?: Record<string, any>;
  order: number;
}

// Email design configuration
export interface EmailDesign {
  // Global settings
  backgroundColor: string;
  contentBackgroundColor: string;
  contentWidth: number;
  fontFamily: string;
  
  // Header
  showHeader: boolean;
  logoUrl?: string;
  logoWidth?: number;
  headerBackgroundColor?: string;
  
  // Footer
  showFooter: boolean;
  footerText?: string;
  unsubscribeLink?: boolean;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
  };
  
  // Visual editor elements
  elements: EmailElement[];
  useVisualEditor: boolean;
}

// ============================================
// EMAIL TEMPLATE ENTITY
// ============================================

@Entity('email_templates')
@Index(['tenantId', 'type'])
@Index(['tenantId', 'isDefault'])
export class EmailTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { nullable: true })
  @JoinColumn({ name: 'tenantId' })
  tenant: TenantEntity;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: EmailTemplateType,
    default: EmailTemplateType.CUSTOM,
  })
  type: EmailTemplateType;

  @Column()
  subject: string;

  @Column('text', { nullable: true })
  previewText: string; // Shown in email clients as preview

  @Column('jsonb')
  design: EmailDesign;

  @Column('text', { nullable: true })
  htmlContent: string; // Compiled HTML for sending

  @Column('text', { nullable: true })
  textContent: string; // Plain text fallback

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isSystemTemplate: boolean; // System templates can't be deleted

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// ============================================
// EMAIL SETTINGS ENTITY
// ============================================

export enum EmailProvider {
  SMTP = 'SMTP',
  RESEND = 'RESEND',
}

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean; // true for 465, false for other ports
  auth: {
    user: string;
    pass: string; // Encrypted
  };
  fromName: string;
  fromEmail: string;
  replyToEmail?: string;
}

export interface ResendSettings {
  apiKey: string;
  fromName: string;
  fromEmail: string;
  replyToEmail?: string;
}

export interface EmailNotificationSettings {
  // Which notifications should send emails
  courseEnrolled: boolean;
  courseCompleted: boolean;
  quizResult: boolean;
  certificateIssued: boolean;
  licenseAssigned: boolean;
  newMessage: boolean;
}

@Entity('email_settings')
@Index(['tenantId'], { unique: true })
export class EmailSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => TenantEntity)
  @JoinColumn({ name: 'tenantId' })
  tenant: TenantEntity;

  @Column({
    type: 'enum',
    enum: EmailProvider,
    default: EmailProvider.RESEND,
  })
  provider: EmailProvider;

  @Column('jsonb', { nullable: true })
  smtp: SmtpSettings;

  @Column('jsonb', { nullable: true })
  resend: ResendSettings;

  @Column('jsonb', { nullable: true })
  notificationSettings: EmailNotificationSettings;

  @Column({ default: true })
  isEnabled: boolean;

  @Column({ default: false })
  isVerified: boolean; // Whether connection has been verified

  @Column({ nullable: true })
  lastVerifiedAt: Date;

  @Column({ nullable: true })
  testEmailSentAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// ============================================
// EMAIL LOG ENTITY (For tracking)
// ============================================

export enum EmailStatus {
  QUEUED = 'QUEUED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  OPENED = 'OPENED',
  CLICKED = 'CLICKED',
  BOUNCED = 'BOUNCED',
  FAILED = 'FAILED',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
}

@Entity('email_logs')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'status'])
@Index(['recipientEmail'])
@Index(['trackingId'], { unique: true })
export class EmailLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { nullable: true })
  @JoinColumn({ name: 'tenantId' })
  tenant: TenantEntity;

  @Column({ nullable: true })
  templateId: string;

  @ManyToOne(() => EmailTemplateEntity, { nullable: true })
  @JoinColumn({ name: 'templateId' })
  template: EmailTemplateEntity;

  @Column()
  recipientEmail: string;

  @Column({ nullable: true })
  recipientName: string;

  @Column({ nullable: true })
  recipientUserId: string;

  @Column()
  subject: string;

  @Column({
    type: 'enum',
    enum: EmailStatus,
    default: EmailStatus.QUEUED,
  })
  status: EmailStatus;

  @Column('uuid')
  trackingId: string; // For tracking opens/clicks

  @Column({ nullable: true })
  messageId: string; // SMTP message ID

  @Column({ nullable: true })
  openedAt: Date;

  @Column({ default: 0 })
  openCount: number;

  @Column('jsonb', { nullable: true })
  clicks: { url: string; timestamp: Date }[];

  @Column({ nullable: true })
  bouncedAt: Date;

  @Column({ nullable: true })
  bounceReason: string;

  @Column({ nullable: true })
  failedAt: Date;

  @Column({ nullable: true })
  failureReason: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>; // Additional data like course name, etc.

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  sentAt: Date;
}

// ============================================
// EMAIL QUEUE ENTITY (For bulk sending)
// ============================================

export enum EmailQueueStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('email_queue')
@Index(['tenantId', 'status'])
@Index(['scheduledFor'])
export class EmailQueueEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { nullable: true })
  @JoinColumn({ name: 'tenantId' })
  tenant: TenantEntity;

  @Column({ nullable: true })
  templateId: string;

  @ManyToOne(() => EmailTemplateEntity, { nullable: true })
  @JoinColumn({ name: 'templateId' })
  template: EmailTemplateEntity;

  @Column()
  name: string; // Campaign name

  @Column('text', { nullable: true })
  description: string;

  @Column('jsonb')
  recipients: {
    email: string;
    name?: string;
    userId?: string;
    variables?: Record<string, any>;
  }[];

  @Column()
  subject: string;

  @Column('text')
  htmlContent: string;

  @Column('text', { nullable: true })
  textContent: string;

  @Column({
    type: 'enum',
    enum: EmailQueueStatus,
    default: EmailQueueStatus.PENDING,
  })
  status: EmailQueueStatus;

  @Column({ nullable: true })
  scheduledFor: Date;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ default: 0 })
  totalRecipients: number;

  @Column({ default: 0 })
  sentCount: number;

  @Column({ default: 0 })
  failedCount: number;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ nullable: true })
  createdByUserId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// ============================================
// EMAIL UNSUBSCRIBE ENTITY
// ============================================

@Entity('email_unsubscribes')
@Index(['email', 'tenantId'], { unique: true })
export class EmailUnsubscribeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { nullable: true })
  @JoinColumn({ name: 'tenantId' })
  tenant: TenantEntity;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  reason: string;

  @Column({ default: false })
  unsubscribeFromAll: boolean; // Unsubscribe from all emails vs just marketing

  @CreateDateColumn()
  unsubscribedAt: Date;
}
