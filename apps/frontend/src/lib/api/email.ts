import { apiClient } from './client';

// ============================================
// TYPES
// ============================================

export enum EmailTemplateType {
  WELCOME = 'WELCOME',
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  ACCOUNT_ACTIVATION = 'ACCOUNT_ACTIVATION',
  COURSE_ENROLLED = 'COURSE_ENROLLED',
  COURSE_COMPLETED = 'COURSE_COMPLETED',
  QUIZ_RESULT = 'QUIZ_RESULT',
  CERTIFICATE_ISSUED = 'CERTIFICATE_ISSUED',
  LICENSE_ASSIGNED = 'LICENSE_ASSIGNED',
  NEW_MESSAGE = 'NEW_MESSAGE',
  NEWSLETTER = 'NEWSLETTER',
  PROMOTIONAL = 'PROMOTIONAL',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  CUSTOM = 'CUSTOM',
}

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

export enum EmailQueueStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum EmailProvider {
  SMTP = 'SMTP',
  RESEND = 'RESEND',
}

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
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

export interface NotificationEmailSettings {
  courseEnrolled: boolean;
  courseCompleted: boolean;
  quizResult: boolean;
  certificateIssued: boolean;
  licenseAssigned: boolean;
  newMessage: boolean;
}

export interface EmailSettings {
  id: string;
  tenantId: string;
  provider: EmailProvider;
  smtp?: SmtpSettings;
  resend?: ResendSettings;
  notificationSettings: NotificationEmailSettings;
  isEnabled: boolean;
  isVerified: boolean;
  lastVerifiedAt?: string;
  testEmailSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

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

export type EmailElementType = 'text' | 'heading' | 'button' | 'image' | 'divider' | 'spacer' | 'columns' | 'social' | 'footer';

export interface EmailElement {
  id: string;
  type: EmailElementType;
  content: string;
  style: EmailElementStyle;
  properties?: Record<string, any>;
  order: number;
}

export interface SocialLinks {
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
}

export interface EmailDesign {
  backgroundColor: string;
  contentBackgroundColor: string;
  contentWidth: number;
  fontFamily: string;
  showHeader: boolean;
  logoUrl?: string;
  logoWidth?: number;
  headerBackgroundColor?: string;
  showFooter: boolean;
  footerText?: string;
  unsubscribeLink?: boolean;
  socialLinks?: SocialLinks;
  elements: EmailElement[];
  useVisualEditor: boolean;
}

export interface EmailTemplate {
  id: string;
  tenantId?: string;
  name: string;
  description?: string;
  type: EmailTemplateType;
  subject: string;
  previewText?: string;
  design: EmailDesign;
  htmlContent: string;
  textContent?: string;
  isDefault: boolean;
  isActive: boolean;
  isSystemTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailLog {
  id: string;
  tenantId: string;
  templateId?: string;
  recipientEmail: string;
  recipientName?: string;
  recipientUserId?: string;
  subject: string;
  status: EmailStatus;
  trackingId: string;
  messageId?: string;
  openedAt?: string;
  openCount: number;
  clicks?: { url: string; timestamp: string }[];
  bouncedAt?: string;
  bounceReason?: string;
  failedAt?: string;
  failureReason?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  sentAt?: string;
}

export interface EmailCampaign {
  id: string;
  tenantId: string;
  templateId?: string;
  name: string;
  description?: string;
  recipients: {
    email: string;
    name?: string;
    userId?: string;
    variables?: Record<string, any>;
  }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  status: EmailQueueStatus;
  scheduledFor?: string;
  startedAt?: string;
  completedAt?: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  errorMessage?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  openRate: number;
  clickRate: number;
}

// ============================================
// API FUNCTIONS
// ============================================

// Settings
export async function getEmailSettings(): Promise<EmailSettings | null> {
  const response = await apiClient.get<EmailSettings>('/api/email/settings');
  if (!response.success) {
    return null;
  }
  return response.data || null;
}

export async function saveEmailSettings(settings: {
  provider: EmailProvider;
  smtp?: SmtpSettings;
  resend?: ResendSettings;
  notificationSettings?: NotificationEmailSettings;
  isEnabled?: boolean;
}): Promise<EmailSettings> {
  const response = await apiClient.post<EmailSettings>('/api/email/settings', settings);
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to save email settings');
  }
  return response.data;
}

export async function verifyConnection(): Promise<{ success: boolean; error?: string }> {
  const response = await apiClient.post<{ success: boolean; error?: string }>('/api/email/settings/verify');
  return response.data || { success: false, error: response.error };
}

export async function sendTestEmail(email: string): Promise<{ success: boolean; error?: string }> {
  const response = await apiClient.post<{ success: boolean; error?: string }>('/api/email/settings/test', { email });
  return response.data || { success: false, error: response.error };
}

// Templates
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const response = await apiClient.get<EmailTemplate[]>('/api/email/templates');
  if (!response.success || !response.data) {
    return [];
  }
  return response.data;
}

export async function getEmailTemplate(id: string): Promise<EmailTemplate | null> {
  const response = await apiClient.get<EmailTemplate>(`/api/email/templates/${id}`);
  if (!response.success) {
    return null;
  }
  return response.data || null;
}

export async function createEmailTemplate(template: {
  name: string;
  description?: string;
  type: EmailTemplateType;
  subject: string;
  previewText?: string;
  design: EmailDesign;
  isDefault?: boolean;
}): Promise<EmailTemplate> {
  const response = await apiClient.post<EmailTemplate>('/api/email/templates', template);
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to create template');
  }
  return response.data;
}

export async function updateEmailTemplate(id: string, template: {
  name?: string;
  description?: string;
  type?: EmailTemplateType;
  subject?: string;
  previewText?: string;
  design?: EmailDesign;
  isDefault?: boolean;
  isActive?: boolean;
}): Promise<EmailTemplate> {
  const response = await apiClient.put<EmailTemplate>(`/api/email/templates/${id}`, template);
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to update template');
  }
  return response.data;
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  const response = await apiClient.delete(`/api/email/templates/${id}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete template');
  }
}

// Sending
export async function sendEmail(dto: {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}): Promise<EmailLog> {
  const response = await apiClient.post<EmailLog>('/api/email/send', dto);
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to send email');
  }
  return response.data;
}

export async function sendTemplatedEmail(dto: {
  to: string;
  toName?: string;
  templateId?: string;
  templateType?: EmailTemplateType;
  variables: Record<string, any>;
}): Promise<EmailLog> {
  const response = await apiClient.post<EmailLog>('/api/email/send/template', dto);
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to send email');
  }
  return response.data;
}

// Campaigns
export async function getEmailCampaigns(): Promise<EmailCampaign[]> {
  const response = await apiClient.get<EmailCampaign[]>('/api/email/campaigns');
  if (!response.success || !response.data) {
    return [];
  }
  return response.data;
}

export async function createEmailCampaign(campaign: {
  name: string;
  description?: string;
  templateId?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  recipients: { email: string; name?: string; userId?: string; variables?: Record<string, any> }[];
  scheduledFor?: string;
}): Promise<EmailCampaign> {
  const response = await apiClient.post<EmailCampaign>('/api/email/campaigns', campaign);
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to create campaign');
  }
  return response.data;
}

export async function cancelEmailCampaign(id: string): Promise<EmailCampaign> {
  const response = await apiClient.post<EmailCampaign>(`/api/email/campaigns/${id}/cancel`);
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to cancel campaign');
  }
  return response.data;
}

// Logs & Stats
export async function getEmailLogs(options?: {
  limit?: number;
  offset?: number;
  status?: EmailStatus;
  startDate?: string;
  endDate?: string;
}): Promise<{ logs: EmailLog[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());
  if (options?.status) params.append('status', options.status);
  if (options?.startDate) params.append('startDate', options.startDate);
  if (options?.endDate) params.append('endDate', options.endDate);

  const url = `/api/email/logs${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await apiClient.get<{ logs: EmailLog[]; total: number }>(url);
  
  if (!response.success || !response.data) {
    return { logs: [], total: 0 };
  }
  return response.data;
}

export async function getEmailStats(days: number = 30): Promise<EmailStats> {
  const response = await apiClient.get<EmailStats>(`/api/email/stats?days=${days}`);
  if (!response.success || !response.data) {
    return {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      failed: 0,
      openRate: 0,
      clickRate: 0,
    };
  }
  return response.data;
}

// Helper constants
export const EMAIL_TEMPLATE_TYPE_LABELS: Record<EmailTemplateType, string> = {
  [EmailTemplateType.WELCOME]: 'Welcome Email',
  [EmailTemplateType.PASSWORD_RESET]: 'Password Reset',
  [EmailTemplateType.EMAIL_VERIFICATION]: 'Email Verification',
  [EmailTemplateType.ACCOUNT_ACTIVATION]: 'Account Activation',
  [EmailTemplateType.COURSE_ENROLLED]: 'Course Enrollment',
  [EmailTemplateType.COURSE_COMPLETED]: 'Course Completion',
  [EmailTemplateType.QUIZ_RESULT]: 'Quiz Result',
  [EmailTemplateType.CERTIFICATE_ISSUED]: 'Certificate Issued',
  [EmailTemplateType.LICENSE_ASSIGNED]: 'License Assigned',
  [EmailTemplateType.NEW_MESSAGE]: 'New Message',
  [EmailTemplateType.NEWSLETTER]: 'Newsletter',
  [EmailTemplateType.PROMOTIONAL]: 'Promotional',
  [EmailTemplateType.ANNOUNCEMENT]: 'Announcement',
  [EmailTemplateType.CUSTOM]: 'Custom',
};

export const EMAIL_STATUS_LABELS: Record<EmailStatus, string> = {
  [EmailStatus.QUEUED]: 'Queued',
  [EmailStatus.SENDING]: 'Sending',
  [EmailStatus.SENT]: 'Sent',
  [EmailStatus.DELIVERED]: 'Delivered',
  [EmailStatus.OPENED]: 'Opened',
  [EmailStatus.CLICKED]: 'Clicked',
  [EmailStatus.BOUNCED]: 'Bounced',
  [EmailStatus.FAILED]: 'Failed',
  [EmailStatus.UNSUBSCRIBED]: 'Unsubscribed',
};

export const EMAIL_PLACEHOLDER_VARIABLES = [
  { key: '{{userName}}', label: 'User Name', description: 'Name of the recipient' },
  { key: '{{userEmail}}', label: 'User Email', description: 'Email of the recipient' },
  { key: '{{courseName}}', label: 'Course Name', description: 'Name of the course' },
  { key: '{{courseUrl}}', label: 'Course URL', description: 'Link to the course' },
  { key: '{{quizTitle}}', label: 'Quiz Title', description: 'Name of the quiz' },
  { key: '{{score}}', label: 'Quiz Score', description: 'Quiz score percentage' },
  { key: '{{certificateId}}', label: 'Certificate ID', description: 'Unique certificate number' },
  { key: '{{issueDate}}', label: 'Issue Date', description: 'Date of issuance' },
  { key: '{{completionDate}}', label: 'Completion Date', description: 'Date of completion' },
  { key: '{{resetLink}}', label: 'Reset Link', description: 'Password reset link' },
  { key: '{{verifyLink}}', label: 'Verify Link', description: 'Email verification link' },
  { key: '{{unsubscribeUrl}}', label: 'Unsubscribe URL', description: 'Link to unsubscribe' },
];

export const DEFAULT_EMAIL_ELEMENT_STYLE: EmailElementStyle = {
  fontSize: 16,
  fontFamily: 'Arial, sans-serif',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'left',
  color: '#333333',
  lineHeight: 1.5,
};

export const DEFAULT_EMAIL_DESIGN: EmailDesign = {
  backgroundColor: '#f4f4f4',
  contentBackgroundColor: '#ffffff',
  contentWidth: 600,
  fontFamily: 'Arial, sans-serif',
  showHeader: true,
  showFooter: true,
  footerText: '© 2024 Your Company. All rights reserved.',
  unsubscribeLink: true,
  elements: [],
  useVisualEditor: true,
};
