import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';
import {
  EmailTemplateEntity,
  EmailTemplateType,
  EmailSettingsEntity,
  EmailLogEntity,
  EmailStatus,
  EmailQueueEntity,
  EmailQueueStatus,
  EmailUnsubscribeEntity,
  SmtpSettings,
  ResendSettings,
  EmailDesign,
  EmailElement,
  EmailProvider,
} from '@/infrastructure/database/entities/email.entity';

// ============================================
// DTOs
// ============================================

export interface SendEmailDto {
  to: string;
  toName?: string;
  userId?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  templateId?: string;
  metadata?: Record<string, any>;
}

export interface SendTemplatedEmailDto {
  to: string;
  toName?: string;
  userId?: string;
  templateId?: string;
  templateType?: EmailTemplateType;
  variables: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface CreateTemplateDto {
  name: string;
  description?: string;
  type: EmailTemplateType;
  subject: string;
  previewText?: string;
  design: EmailDesign;
  isDefault?: boolean;
}

export interface UpdateTemplateDto extends Partial<CreateTemplateDto> {}

export interface EmailSettingsDto {
  provider: EmailProvider;
  smtp?: SmtpSettings;
  resend?: ResendSettings;
  notificationSettings?: {
    courseEnrolled: boolean;
    courseCompleted: boolean;
    quizResult: boolean;
    certificateIssued: boolean;
    licenseAssigned: boolean;
    newMessage: boolean;
  };
  isEnabled?: boolean;
}

// ============================================
// EMAIL SERVICE
// ============================================

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private smtpTransporters: Map<string, nodemailer.Transporter> = new Map();
  private resendClients: Map<string, Resend> = new Map();

  constructor(
    @InjectRepository(EmailTemplateEntity)
    private readonly templateRepository: Repository<EmailTemplateEntity>,
    @InjectRepository(EmailSettingsEntity)
    private readonly settingsRepository: Repository<EmailSettingsEntity>,
    @InjectRepository(EmailLogEntity)
    private readonly logRepository: Repository<EmailLogEntity>,
    @InjectRepository(EmailQueueEntity)
    private readonly queueRepository: Repository<EmailQueueEntity>,
    @InjectRepository(EmailUnsubscribeEntity)
    private readonly unsubscribeRepository: Repository<EmailUnsubscribeEntity>,
  ) {}

  // ============================================
  // TRANSPORTER/CLIENT MANAGEMENT
  // ============================================

  private async getSmtpTransporter(tenantId: string, settings: EmailSettingsEntity): Promise<nodemailer.Transporter | null> {
    // Check cache
    if (this.smtpTransporters.has(tenantId)) {
      return this.smtpTransporters.get(tenantId)!;
    }

    if (!settings.smtp) {
      return null;
    }

    // Create transporter
    const isSecurePort = settings.smtp.port === 465;
    const transporter = nodemailer.createTransport({
      host: settings.smtp.host,
      port: settings.smtp.port,
      secure: isSecurePort,
      auth: {
        user: settings.smtp.auth.user,
        pass: settings.smtp.auth.pass,
      },
      ...(!isSecurePort && {
        requireTLS: false,
        tls: {
          rejectUnauthorized: false,
        },
      }),
    });

    this.smtpTransporters.set(tenantId, transporter);
    return transporter;
  }

  private getResendClient(tenantId: string, settings: EmailSettingsEntity): Resend | null {
    // Check cache
    if (this.resendClients.has(tenantId)) {
      return this.resendClients.get(tenantId)!;
    }

    if (!settings.resend?.apiKey) {
      return null;
    }

    const client = new Resend(settings.resend.apiKey);
    this.resendClients.set(tenantId, client);
    return client;
  }

  private clearCachedClients(tenantId: string): void {
    this.smtpTransporters.delete(tenantId);
    this.resendClients.delete(tenantId);
  }

  // ============================================
  // EMAIL SETTINGS
  // ============================================

  async getSettings(tenantId: string): Promise<EmailSettingsEntity | null> {
    return this.settingsRepository.findOne({ where: { tenantId } });
  }

  async saveSettings(tenantId: string, dto: EmailSettingsDto): Promise<EmailSettingsEntity> {
    let settings = await this.settingsRepository.findOne({ where: { tenantId } });

    if (settings) {
      settings.provider = dto.provider;
      if (dto.smtp) settings.smtp = dto.smtp;
      if (dto.resend) settings.resend = dto.resend;
      if (dto.notificationSettings) {
        settings.notificationSettings = dto.notificationSettings;
      }
      if (dto.isEnabled !== undefined) {
        settings.isEnabled = dto.isEnabled;
      }
      settings.isVerified = false; // Reset verification on update
    } else {
      settings = this.settingsRepository.create({
        tenantId,
        provider: dto.provider,
        smtp: dto.smtp,
        resend: dto.resend,
        notificationSettings: dto.notificationSettings || {
          courseEnrolled: true,
          courseCompleted: true,
          quizResult: true,
          certificateIssued: true,
          licenseAssigned: true,
          newMessage: false,
        },
        isEnabled: dto.isEnabled ?? true,
      });
    }

    // Clear cached clients
    this.clearCachedClients(tenantId);

    return this.settingsRepository.save(settings);
  }

  async verifyConnection(tenantId: string): Promise<{ success: boolean; error?: string }> {
    const settings = await this.settingsRepository.findOne({ where: { tenantId } });

    if (!settings) {
      return { success: false, error: 'Email settings not found' };
    }

    try {
      if (settings.provider === EmailProvider.RESEND) {
        // Verify Resend by making a simple API call
        if (!settings.resend?.apiKey) {
          return { success: false, error: 'Resend API key not configured' };
        }
        const resend = new Resend(settings.resend.apiKey);
        // Try to get domains to verify the API key works
        await resend.domains.list();
      } else {
        // Verify SMTP
        if (!settings.smtp) {
          return { success: false, error: 'SMTP settings not configured' };
        }
        const isSecurePort = settings.smtp.port === 465;
        const transporter = nodemailer.createTransport({
          host: settings.smtp.host,
          port: settings.smtp.port,
          secure: isSecurePort,
          auth: {
            user: settings.smtp.auth.user,
            pass: settings.smtp.auth.pass,
          },
          ...(!isSecurePort && {
            requireTLS: false,
            tls: {
              rejectUnauthorized: false,
            },
          }),
        });
        await transporter.verify();
        this.smtpTransporters.set(tenantId, transporter);
      }

      // Update verification status
      settings.isVerified = true;
      settings.lastVerifiedAt = new Date();
      await this.settingsRepository.save(settings);

      return { success: true };
    } catch (error: any) {
      this.logger.error(`Verification failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async sendTestEmail(tenantId: string, testEmail: string): Promise<{ success: boolean; error?: string }> {
    const settings = await this.settingsRepository.findOne({ where: { tenantId } });

    if (!settings) {
      return { success: false, error: 'Email settings not found' };
    }

    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Test Email</h2>
        <p>This is a test email to verify your email configuration.</p>
        <p>If you received this email, your email settings are working correctly!</p>
        <hr/>
        <p style="color: #666; font-size: 12px;">Sent from Discite via ${settings.provider}</p>
      </div>
    `;
    const testText = 'This is a test email to verify your email configuration. If you received this email, your email settings are working correctly!';

    try {
      if (settings.provider === EmailProvider.RESEND) {
        if (!settings.resend?.apiKey) {
          return { success: false, error: 'Resend API key not configured' };
        }
        const resend = new Resend(settings.resend.apiKey);
        await resend.emails.send({
          from: `${settings.resend.fromName} <${settings.resend.fromEmail}>`,
          to: testEmail,
          subject: 'Test Email from Discite',
          html: testHtml,
          text: testText,
        });
      } else {
        if (!settings.smtp) {
          return { success: false, error: 'SMTP settings not configured' };
        }
        const transporter = await this.getSmtpTransporter(tenantId, settings);
        if (!transporter) {
          return { success: false, error: 'Could not create SMTP transporter' };
        }
        await transporter.sendMail({
          from: `"${settings.smtp.fromName}" <${settings.smtp.fromEmail}>`,
          to: testEmail,
          subject: 'Test Email from Discite',
          html: testHtml,
          text: testText,
        });
      }

      // Update test email timestamp
      settings.testEmailSentAt = new Date();
      await this.settingsRepository.save(settings);

      return { success: true };
    } catch (error: any) {
      this.logger.error(`Test email failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // EMAIL TEMPLATES
  // ============================================

  async getTemplates(tenantId: string): Promise<EmailTemplateEntity[]> {
    return this.templateRepository.find({
      where: [
        { tenantId },
        { tenantId: null as any, isSystemTemplate: true }, // System templates available to all
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async getTemplate(id: string, tenantId: string): Promise<EmailTemplateEntity | null> {
    return this.templateRepository.findOne({
      where: [
        { id, tenantId },
        { id, tenantId: null as any, isSystemTemplate: true },
      ],
    });
  }

  async getDefaultTemplate(tenantId: string, type: EmailTemplateType): Promise<EmailTemplateEntity | null> {
    // First try tenant default
    let template = await this.templateRepository.findOne({
      where: { tenantId, type, isDefault: true, isActive: true },
    });

    // Fall back to system template
    if (!template) {
      template = await this.templateRepository.findOne({
        where: { tenantId: null as any, type, isSystemTemplate: true, isActive: true },
      });
    }

    return template;
  }

  async createTemplate(tenantId: string, dto: CreateTemplateDto): Promise<EmailTemplateEntity> {
    // If setting as default, unset other defaults of same type
    if (dto.isDefault) {
      await this.templateRepository.update(
        { tenantId, type: dto.type, isDefault: true },
        { isDefault: false },
      );
    }

    // Compile HTML from design
    const htmlContent = this.compileEmailHtml(dto.design, dto.subject);
    const textContent = this.compileEmailText(dto.design);

    const template = this.templateRepository.create({
      tenantId,
      ...dto,
      htmlContent,
      textContent,
    });

    return this.templateRepository.save(template);
  }

  async updateTemplate(id: string, tenantId: string, dto: UpdateTemplateDto): Promise<EmailTemplateEntity> {
    const template = await this.templateRepository.findOne({
      where: { id, tenantId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    if (template.isSystemTemplate) {
      throw new Error('Cannot modify system template');
    }

    // If setting as default, unset other defaults
    if (dto.isDefault && dto.type) {
      await this.templateRepository.update(
        { tenantId, type: dto.type, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(template, dto);

    // Recompile HTML if design changed
    if (dto.design) {
      template.htmlContent = this.compileEmailHtml(dto.design, template.subject);
      template.textContent = this.compileEmailText(dto.design);
    }

    return this.templateRepository.save(template);
  }

  async deleteTemplate(id: string, tenantId: string): Promise<boolean> {
    const template = await this.templateRepository.findOne({
      where: { id, tenantId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    if (template.isSystemTemplate) {
      throw new Error('Cannot delete system template');
    }

    await this.templateRepository.delete(id);
    return true;
  }

  // ============================================
  // EMAIL SENDING
  // ============================================

  async sendEmail(tenantId: string, dto: SendEmailDto): Promise<EmailLogEntity> {
    // Check unsubscribe
    const unsubscribed = await this.unsubscribeRepository.findOne({
      where: { email: dto.to, tenantId },
    });

    if (unsubscribed) {
      const log = this.logRepository.create({
        tenantId,
        templateId: dto.templateId,
        recipientEmail: dto.to,
        recipientName: dto.toName,
        recipientUserId: dto.userId,
        subject: dto.subject,
        status: EmailStatus.UNSUBSCRIBED,
        trackingId: uuidv4(),
        metadata: dto.metadata,
      });
      return this.logRepository.save(log);
    }

    const settings = await this.settingsRepository.findOne({ where: { tenantId } });
    if (!settings || !settings.isEnabled) {
      const log = this.logRepository.create({
        tenantId,
        templateId: dto.templateId,
        recipientEmail: dto.to,
        recipientName: dto.toName,
        recipientUserId: dto.userId,
        subject: dto.subject,
        status: EmailStatus.FAILED,
        trackingId: uuidv4(),
        failedAt: new Date(),
        failureReason: 'Email not configured or disabled for this tenant',
        metadata: dto.metadata,
      });
      return this.logRepository.save(log);
    }

    const trackingId = uuidv4();

    // Create log entry
    const log = this.logRepository.create({
      tenantId,
      templateId: dto.templateId,
      recipientEmail: dto.to,
      recipientName: dto.toName,
      recipientUserId: dto.userId,
      subject: dto.subject,
      status: EmailStatus.QUEUED,
      trackingId,
      metadata: dto.metadata,
    });
    const savedLog = await this.logRepository.save(log);

    try {
      // Add tracking pixel
      const trackedHtml = this.addTrackingPixel(dto.htmlContent, trackingId);

      // Add click tracking
      const clickTrackedHtml = this.addClickTracking(trackedHtml, trackingId);

      savedLog.status = EmailStatus.SENDING;
      await this.logRepository.save(savedLog);

      let messageId: string | undefined;

      if (settings.provider === EmailProvider.RESEND) {
        // Send via Resend
        if (!settings.resend?.apiKey) {
          throw new Error('Resend API key not configured');
        }
        const resend = this.getResendClient(tenantId, settings);
        if (!resend) {
          throw new Error('Could not create Resend client');
        }

        const result = await resend.emails.send({
          from: `${settings.resend.fromName} <${settings.resend.fromEmail}>`,
          replyTo: settings.resend.replyToEmail,
          to: dto.to,
          subject: dto.subject,
          html: clickTrackedHtml,
          text: dto.textContent,
        });

        if (result.error) {
          throw new Error(result.error.message);
        }
        messageId = result.data?.id;
      } else {
        // Send via SMTP
        if (!settings.smtp) {
          throw new Error('SMTP settings not configured');
        }
        const transporter = await this.getSmtpTransporter(tenantId, settings);
        if (!transporter) {
          throw new Error('Could not create SMTP transporter');
        }

        const result = await transporter.sendMail({
          from: `"${settings.smtp.fromName}" <${settings.smtp.fromEmail}>`,
          replyTo: settings.smtp.replyToEmail,
          to: dto.toName ? `"${dto.toName}" <${dto.to}>` : dto.to,
          subject: dto.subject,
          html: clickTrackedHtml,
          text: dto.textContent,
        });

        messageId = result.messageId;
      }

      savedLog.status = EmailStatus.SENT;
      savedLog.sentAt = new Date();
      if (messageId) {
        savedLog.messageId = messageId;
      }

      return this.logRepository.save(savedLog);
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      savedLog.status = EmailStatus.FAILED;
      savedLog.failedAt = new Date();
      savedLog.failureReason = error.message;
      return this.logRepository.save(savedLog);
    }
  }

  async sendTemplatedEmail(tenantId: string, dto: SendTemplatedEmailDto): Promise<EmailLogEntity> {
    let template: EmailTemplateEntity | null = null;

    if (dto.templateId) {
      template = await this.getTemplate(dto.templateId, tenantId);
    } else if (dto.templateType) {
      template = await this.getDefaultTemplate(tenantId, dto.templateType);
    }

    if (!template) {
      throw new Error('Email template not found');
    }

    // Replace variables in subject and content
    const subject = this.replaceVariables(template.subject, dto.variables);
    const htmlContent = this.replaceVariables(template.htmlContent, dto.variables);
    const textContent = template.textContent
      ? this.replaceVariables(template.textContent, dto.variables)
      : undefined;

    return this.sendEmail(tenantId, {
      to: dto.to,
      toName: dto.toName,
      userId: dto.userId,
      subject,
      htmlContent,
      textContent,
      templateId: template.id,
      metadata: dto.metadata,
    });
  }

  // ============================================
  // BULK EMAIL / QUEUE
  // ============================================

  async createEmailCampaign(
    tenantId: string,
    dto: {
      name: string;
      description?: string;
      templateId?: string;
      subject: string;
      htmlContent: string;
      textContent?: string;
      recipients: { email: string; name?: string; userId?: string; variables?: Record<string, any> }[];
      scheduledFor?: Date;
      createdByUserId: string;
    },
  ): Promise<EmailQueueEntity> {
    const queue = this.queueRepository.create({
      tenantId,
      templateId: dto.templateId,
      name: dto.name,
      description: dto.description,
      subject: dto.subject,
      htmlContent: dto.htmlContent,
      textContent: dto.textContent,
      recipients: dto.recipients,
      totalRecipients: dto.recipients.length,
      status: dto.scheduledFor ? EmailQueueStatus.PENDING : EmailQueueStatus.PROCESSING,
      scheduledFor: dto.scheduledFor,
      createdByUserId: dto.createdByUserId,
    });

    const saved = await this.queueRepository.save(queue);

    // If not scheduled, process immediately
    if (!dto.scheduledFor) {
      this.processQueue(saved.id, tenantId).catch((err) =>
        this.logger.error(`Failed to process queue ${saved.id}: ${err.message}`),
      );
    }

    return saved;
  }

  async processQueue(queueId: string, tenantId: string): Promise<void> {
    const queue = await this.queueRepository.findOne({ where: { id: queueId, tenantId } });

    if (!queue || queue.status === EmailQueueStatus.COMPLETED || queue.status === EmailQueueStatus.CANCELLED) {
      return;
    }

    queue.status = EmailQueueStatus.PROCESSING;
    queue.startedAt = new Date();
    await this.queueRepository.save(queue);

    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of queue.recipients) {
      try {
        // Replace variables for this recipient
        const subject = this.replaceVariables(queue.subject, recipient.variables || {});
        const htmlContent = this.replaceVariables(queue.htmlContent, recipient.variables || {});
        const textContent = queue.textContent
          ? this.replaceVariables(queue.textContent, recipient.variables || {})
          : undefined;

        const result = await this.sendEmail(tenantId, {
          to: recipient.email,
          toName: recipient.name,
          userId: recipient.userId,
          subject,
          htmlContent,
          textContent,
          templateId: queue.templateId || undefined,
          metadata: { campaignId: queueId },
        });

        if (result.status === EmailStatus.SENT) {
          sentCount++;
        } else {
          failedCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        failedCount++;
        this.logger.error(`Failed to send to ${recipient.email}: ${error}`);
      }
    }

    queue.status = EmailQueueStatus.COMPLETED;
    queue.completedAt = new Date();
    queue.sentCount = sentCount;
    queue.failedCount = failedCount;
    await this.queueRepository.save(queue);
  }

  async getCampaigns(tenantId: string): Promise<EmailQueueEntity[]> {
    return this.queueRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async cancelCampaign(id: string, tenantId: string): Promise<EmailQueueEntity> {
    const queue = await this.queueRepository.findOne({ where: { id, tenantId } });

    if (!queue) {
      throw new Error('Campaign not found');
    }

    if (queue.status !== EmailQueueStatus.PENDING) {
      throw new Error('Can only cancel pending campaigns');
    }

    queue.status = EmailQueueStatus.CANCELLED;
    return this.queueRepository.save(queue);
  }

  // ============================================
  // EMAIL TRACKING
  // ============================================

  async trackOpen(trackingId: string): Promise<void> {
    const log = await this.logRepository.findOne({ where: { trackingId } });

    if (log && log.status !== EmailStatus.UNSUBSCRIBED) {
      if (!log.openedAt) {
        log.openedAt = new Date();
        log.status = EmailStatus.OPENED;
      }
      log.openCount = (log.openCount || 0) + 1;
      await this.logRepository.save(log);
    }
  }

  async trackClick(trackingId: string, url: string): Promise<void> {
    const log = await this.logRepository.findOne({ where: { trackingId } });

    if (log && log.status !== EmailStatus.UNSUBSCRIBED) {
      if (log.status === EmailStatus.SENT) {
        log.status = EmailStatus.CLICKED;
      }
      log.clicks = log.clicks || [];
      log.clicks.push({ url, timestamp: new Date() });
      await this.logRepository.save(log);
    }
  }

  // ============================================
  // EMAIL LOGS
  // ============================================

  async getLogs(
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: EmailStatus;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{ logs: EmailLogEntity[]; total: number }> {
    const { limit = 50, offset = 0, status, startDate, endDate } = options || {};

    const queryBuilder = this.logRepository
      .createQueryBuilder('log')
      .where('log.tenantId = :tenantId', { tenantId });

    if (status) {
      queryBuilder.andWhere('log.status = :status', { status });
    }

    if (startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', { endDate });
    }

    const [logs, total] = await queryBuilder
      .orderBy('log.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { logs, total };
  }

  async getEmailStats(tenantId: string, days: number = 30): Promise<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
    openRate: number;
    clickRate: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.logRepository
      .createQueryBuilder('log')
      .select('log.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('log.tenantId = :tenantId', { tenantId })
      .andWhere('log.createdAt >= :startDate', { startDate })
      .groupBy('log.status')
      .getRawMany();

    const counts: Record<string, number> = {};
    stats.forEach((s) => {
      counts[s.status] = parseInt(s.count, 10);
    });

    const sent = (counts[EmailStatus.SENT] || 0) + 
                 (counts[EmailStatus.DELIVERED] || 0) + 
                 (counts[EmailStatus.OPENED] || 0) + 
                 (counts[EmailStatus.CLICKED] || 0);
    const opened = (counts[EmailStatus.OPENED] || 0) + (counts[EmailStatus.CLICKED] || 0);
    const clicked = counts[EmailStatus.CLICKED] || 0;

    return {
      sent,
      delivered: counts[EmailStatus.DELIVERED] || 0,
      opened,
      clicked,
      bounced: counts[EmailStatus.BOUNCED] || 0,
      failed: counts[EmailStatus.FAILED] || 0,
      openRate: sent > 0 ? (opened / sent) * 100 : 0,
      clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
    };
  }

  // ============================================
  // UNSUBSCRIBE
  // ============================================

  async unsubscribe(email: string, tenantId: string, reason?: string): Promise<void> {
    const existing = await this.unsubscribeRepository.findOne({ where: { email, tenantId } });

    if (!existing) {
      const unsubscribe = this.unsubscribeRepository.create({
        email,
        tenantId,
        reason,
      });
      await this.unsubscribeRepository.save(unsubscribe);
    }
  }

  async isUnsubscribed(email: string, tenantId: string): Promise<boolean> {
    const unsubscribe = await this.unsubscribeRepository.findOne({ where: { email, tenantId } });
    return !!unsubscribe;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      result = result.replace(regex, String(value ?? ''));
    });

    // Remove any remaining unreplaced variables
    result = result.replace(/\{\{\s*\w+\s*\}\}/g, '');

    return result;
  }

  private addTrackingPixel(html: string, trackingId: string): string {
    const trackingPixel = `<img src="${process.env.BACKEND_URL || 'http://localhost:3001'}/api/email/track/open/${trackingId}" width="1" height="1" style="display:none" alt="" />`;

    // Add before closing body tag
    if (html.includes('</body>')) {
      return html.replace('</body>', `${trackingPixel}</body>`);
    }

    // Or just append
    return html + trackingPixel;
  }

  private addClickTracking(html: string, trackingId: string): string {
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';

    // Replace links with tracking links
    return html.replace(
      /href="(https?:\/\/[^"]+)"/gi,
      (_match, url) => {
        const encodedUrl = encodeURIComponent(url);
        return `href="${baseUrl}/api/email/track/click/${trackingId}?url=${encodedUrl}"`;
      },
    );
  }

  private compileEmailHtml(design: EmailDesign, subject: string): string {
    const {
      backgroundColor,
      contentBackgroundColor,
      contentWidth,
      fontFamily,
      showHeader,
      logoUrl,
      logoWidth,
      headerBackgroundColor,
      showFooter,
      footerText,
      unsubscribeLink,
      socialLinks,
      elements,
    } = design;

    let elementsHtml = '';

    if (elements && elements.length > 0) {
      elementsHtml = elements
        .sort((a, b) => a.order - b.order)
        .map((el) => this.renderEmailElement(el))
        .join('\n');
    }

    const headerHtml = showHeader && logoUrl
      ? `
        <tr>
          <td style="background-color: ${headerBackgroundColor || '#ffffff'}; padding: 20px; text-align: center;">
            <img src="${logoUrl}" alt="Logo" style="max-width: ${logoWidth || 150}px; height: auto;" />
          </td>
        </tr>
      `
      : '';

    const footerHtml = showFooter
      ? `
        <tr>
          <td style="padding: 20px; text-align: center; font-size: 12px; color: #666666;">
            ${footerText || ''}
            ${socialLinks ? this.renderSocialLinks(socialLinks) : ''}
            ${unsubscribeLink ? '<p><a href="{{unsubscribeUrl}}" style="color: #666666;">Unsubscribe</a></p>' : ''}
          </td>
        </tr>
      `
      : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; font-family: ${fontFamily || 'Arial, sans-serif'}; }
    table { border-collapse: collapse; }
    img { max-width: 100%; height: auto; }
    a { color: #007bff; }
    @media only screen and (max-width: 600px) {
      .content-table { width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${backgroundColor || '#f4f4f4'};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${backgroundColor || '#f4f4f4'};">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table class="content-table" width="${contentWidth || 600}" cellpadding="0" cellspacing="0" style="background-color: ${contentBackgroundColor || '#ffffff'}; border-radius: 8px; overflow: hidden;">
          ${headerHtml}
          <tr>
            <td style="padding: 30px;">
              ${elementsHtml}
            </td>
          </tr>
          ${footerHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  private renderEmailElement(element: EmailElement): string {
    const { type, content, style, properties } = element;

    const baseStyle = `
      font-size: ${style.fontSize || 16}px;
      font-family: ${style.fontFamily || 'inherit'};
      font-weight: ${style.fontWeight || 'normal'};
      font-style: ${style.fontStyle || 'normal'};
      text-decoration: ${style.textDecoration || 'none'};
      text-align: ${style.textAlign || 'left'};
      color: ${style.color || '#000000'};
      ${style.backgroundColor ? `background-color: ${style.backgroundColor};` : ''}
      ${style.padding ? `padding: ${style.padding}px;` : ''}
      ${style.margin ? `margin: ${style.margin}px 0;` : ''}
      ${style.borderRadius ? `border-radius: ${style.borderRadius}px;` : ''}
      ${style.lineHeight ? `line-height: ${style.lineHeight};` : ''}
    `.trim();

    switch (type) {
      case 'heading':
        return `<h2 style="${baseStyle}">${content}</h2>`;

      case 'text':
        return `<p style="${baseStyle}">${content}</p>`;

      case 'button':
        const buttonStyle = `
          display: inline-block;
          padding: 12px 24px;
          background-color: ${style.backgroundColor || '#007bff'};
          color: ${style.color || '#ffffff'};
          text-decoration: none;
          border-radius: ${style.borderRadius || 4}px;
          font-weight: bold;
        `;
        return `
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="${style.textAlign || 'center'}" style="padding: 10px 0;">
                <a href="${properties?.url || '#'}" style="${buttonStyle}">${content}</a>
              </td>
            </tr>
          </table>
        `;

      case 'image':
        return `
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="${style.textAlign || 'center'}" style="padding: 10px 0;">
                <img src="${content}" alt="${properties?.alt || ''}" style="max-width: 100%; height: auto; ${style.borderRadius ? `border-radius: ${style.borderRadius}px;` : ''}" />
              </td>
            </tr>
          </table>
        `;

      case 'divider':
        return `
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 15px 0;">
                <hr style="border: none; border-top: 1px solid ${style.color || '#e5e5e5'}; margin: 0;" />
              </td>
            </tr>
          </table>
        `;

      case 'spacer':
        return `<div style="height: ${properties?.height || 20}px;"></div>`;

      case 'footer':
        return `<div style="font-size: 12px; color: #666666; text-align: center; padding: 20px 0;">${content}</div>`;

      default:
        return `<div style="${baseStyle}">${content}</div>`;
    }
  }

  private renderSocialLinks(links: { facebook?: string; twitter?: string; linkedin?: string; instagram?: string }): string {
    const icons: string[] = [];

    if (links.facebook) {
      icons.push(`<a href="${links.facebook}" style="margin: 0 5px;">Facebook</a>`);
    }
    if (links.twitter) {
      icons.push(`<a href="${links.twitter}" style="margin: 0 5px;">Twitter</a>`);
    }
    if (links.linkedin) {
      icons.push(`<a href="${links.linkedin}" style="margin: 0 5px;">LinkedIn</a>`);
    }
    if (links.instagram) {
      icons.push(`<a href="${links.instagram}" style="margin: 0 5px;">Instagram</a>`);
    }

    return icons.length > 0 ? `<p style="padding: 10px 0;">${icons.join(' | ')}</p>` : '';
  }

  private compileEmailText(design: EmailDesign): string {
    if (!design.elements || design.elements.length === 0) {
      return '';
    }

    return design.elements
      .sort((a, b) => a.order - b.order)
      .map((el) => {
        switch (el.type) {
          case 'heading':
          case 'text':
            return el.content;
          case 'button':
            return `${el.content}: ${el.properties?.url || ''}`;
          case 'divider':
            return '---';
          case 'spacer':
            return '';
          default:
            return el.content;
        }
      })
      .filter(Boolean)
      .join('\n\n');
  }
}
