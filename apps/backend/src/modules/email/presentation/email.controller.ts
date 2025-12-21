import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { EmailService } from '../application/services/email.service';
import { ApiResponse, UserRole } from '@repo/shared';
import { EmailStatus } from '@/infrastructure/database/entities/email.entity';
import {
  SaveEmailSettingsDto,
  SendTestEmailDto,
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  SendEmailDto,
  SendTemplatedEmailDto,
  CreateCampaignDto,
  GetLogsQueryDto,
  UnsubscribeDto,
} from './dto/email.dto';

@Controller('api/email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  // ============================================
  // EMAIL SETTINGS
  // ============================================

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  async getSettings(
    @TenantId() tenantId: string,
    @CurrentUser('role') role: UserRole,
  ): Promise<ApiResponse<any>> {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPERADMIN) {
      return { success: false, error: 'Only admins can view email settings' };
    }

    const settings = await this.emailService.getSettings(tenantId);
    
    // Mask password
    if (settings?.smtp?.auth?.pass) {
      settings.smtp.auth.pass = '••••••••';
    }
    
    return { success: true, data: settings };
  }

  @Post('settings')
  @UseGuards(JwtAuthGuard)
  async saveSettings(
    @TenantId() tenantId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: SaveEmailSettingsDto,
  ): Promise<ApiResponse<any>> {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPERADMIN) {
      return { success: false, error: 'Only admins can update email settings' };
    }

    const settings = await this.emailService.saveSettings(tenantId, dto);
    
    // Mask password in response
    if (settings?.smtp?.auth?.pass) {
      settings.smtp.auth.pass = '••••••••';
    }
    
    return { success: true, data: settings };
  }

  @Post('settings/verify')
  @UseGuards(JwtAuthGuard)
  async verifyConnection(
    @TenantId() tenantId: string,
    @CurrentUser('role') role: UserRole,
  ): Promise<ApiResponse<any>> {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPERADMIN) {
      return { success: false, error: 'Only admins can verify email settings' };
    }

    const result = await this.emailService.verifyConnection(tenantId);
    return { success: result.success, data: result, error: result.error };
  }

  @Post('settings/test')
  @UseGuards(JwtAuthGuard)
  async sendTestEmail(
    @TenantId() tenantId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: SendTestEmailDto,
  ): Promise<ApiResponse<any>> {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPERADMIN) {
      return { success: false, error: 'Only admins can send test emails' };
    }

    const result = await this.emailService.sendTestEmail(tenantId, dto.email);
    return { success: result.success, data: result, error: result.error };
  }

  // ============================================
  // EMAIL TEMPLATES
  // ============================================

  @Get('templates')
  @UseGuards(JwtAuthGuard)
  async getTemplates(
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const templates = await this.emailService.getTemplates(tenantId);
    return { success: true, data: templates };
  }

  @Get('templates/:id')
  @UseGuards(JwtAuthGuard)
  async getTemplate(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const template = await this.emailService.getTemplate(id, tenantId);
    if (!template) {
      return { success: false, error: 'Template not found' };
    }
    return { success: true, data: template };
  }

  @Post('templates')
  @UseGuards(JwtAuthGuard)
  async createTemplate(
    @TenantId() tenantId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: CreateEmailTemplateDto,
  ): Promise<ApiResponse<any>> {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPERADMIN) {
      return { success: false, error: 'Only admins can create email templates' };
    }

    const template = await this.emailService.createTemplate(tenantId, dto);
    return { success: true, data: template };
  }

  @Put('templates/:id')
  @UseGuards(JwtAuthGuard)
  async updateTemplate(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: UpdateEmailTemplateDto,
  ): Promise<ApiResponse<any>> {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPERADMIN) {
      return { success: false, error: 'Only admins can update email templates' };
    }

    try {
      const template = await this.emailService.updateTemplate(id, tenantId, dto);
      return { success: true, data: template };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Delete('templates/:id')
  @UseGuards(JwtAuthGuard)
  async deleteTemplate(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser('role') role: UserRole,
  ): Promise<ApiResponse<any>> {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPERADMIN) {
      return { success: false, error: 'Only admins can delete email templates' };
    }

    try {
      await this.emailService.deleteTemplate(id, tenantId);
      return { success: true, data: { deleted: true } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // SEND EMAILS
  // ============================================

  @Post('send')
  @UseGuards(JwtAuthGuard)
  async sendEmail(
    @TenantId() tenantId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: SendEmailDto,
  ): Promise<ApiResponse<any>> {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPERADMIN) {
      return { success: false, error: 'Only admins can send emails' };
    }

    const log = await this.emailService.sendEmail(tenantId, dto);
    return {
      success: log.status === EmailStatus.SENT,
      data: log,
      error: log.failureReason,
    };
  }

  @Post('send/template')
  @UseGuards(JwtAuthGuard)
  async sendTemplatedEmail(
    @TenantId() tenantId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: SendTemplatedEmailDto,
  ): Promise<ApiResponse<any>> {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPERADMIN) {
      return { success: false, error: 'Only admins can send emails' };
    }

    try {
      const log = await this.emailService.sendTemplatedEmail(tenantId, dto);
      return {
        success: log.status === EmailStatus.SENT,
        data: log,
        error: log.failureReason,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // CAMPAIGNS (BULK EMAIL)
  // ============================================

  @Get('campaigns')
  @UseGuards(JwtAuthGuard)
  async getCampaigns(
    @TenantId() tenantId: string,
    @CurrentUser('role') role: UserRole,
  ): Promise<ApiResponse<any>> {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPERADMIN) {
      return { success: false, error: 'Only admins can view campaigns' };
    }

    const campaigns = await this.emailService.getCampaigns(tenantId);
    return { success: true, data: campaigns };
  }

  @Post('campaigns')
  @UseGuards(JwtAuthGuard)
  async createCampaign(
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: CreateCampaignDto,
  ): Promise<ApiResponse<any>> {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPERADMIN) {
      return { success: false, error: 'Only admins can create campaigns' };
    }

    const campaign = await this.emailService.createEmailCampaign(tenantId, {
      ...dto,
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
      createdByUserId: userId,
    });

    return { success: true, data: campaign };
  }

  @Post('campaigns/:id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelCampaign(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser('role') role: UserRole,
  ): Promise<ApiResponse<any>> {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPERADMIN) {
      return { success: false, error: 'Only admins can cancel campaigns' };
    }

    try {
      const campaign = await this.emailService.cancelCampaign(id, tenantId);
      return { success: true, data: campaign };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // EMAIL LOGS & STATS
  // ============================================

  @Get('logs')
  @UseGuards(JwtAuthGuard)
  async getLogs(
    @TenantId() tenantId: string,
    @CurrentUser('role') role: UserRole,
    @Query() query: GetLogsQueryDto,
  ): Promise<ApiResponse<any>> {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPERADMIN) {
      return { success: false, error: 'Only admins can view email logs' };
    }

    const { logs, total } = await this.emailService.getLogs(tenantId, {
      limit: query.limit,
      offset: query.offset,
      status: query.status as EmailStatus,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });

    return { success: true, data: { logs, total } };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(
    @TenantId() tenantId: string,
    @CurrentUser('role') role: UserRole,
    @Query('days') days?: string,
  ): Promise<ApiResponse<any>> {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPERADMIN) {
      return { success: false, error: 'Only admins can view email stats' };
    }

    const stats = await this.emailService.getEmailStats(tenantId, days ? parseInt(days) : 30);
    return { success: true, data: stats };
  }

  // ============================================
  // TRACKING (PUBLIC ENDPOINTS)
  // ============================================

  @Get('track/open/:trackingId')
  async trackOpen(
    @Param('trackingId') trackingId: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.emailService.trackOpen(trackingId);

    // Return a 1x1 transparent GIF
    const gif = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    res.writeHead(HttpStatus.OK, {
      'Content-Type': 'image/gif',
      'Content-Length': gif.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(gif);
  }

  @Get('track/click/:trackingId')
  async trackClick(
    @Param('trackingId') trackingId: string,
    @Query('url') url: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.emailService.trackClick(trackingId, url);

    // Redirect to the original URL
    const decodedUrl = decodeURIComponent(url);
    res.redirect(HttpStatus.FOUND, decodedUrl);
  }

  // ============================================
  // UNSUBSCRIBE (PUBLIC ENDPOINT)
  // ============================================

  @Get('unsubscribe/:trackingId')
  async showUnsubscribePage(
    @Param('trackingId') trackingId: string,
    @Res() res: Response,
  ): Promise<void> {
    // In a real app, you'd render an unsubscribe page
    // For now, just return a simple confirmation
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribe</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          h1 { color: #333; }
          form { margin: 20px 0; }
          button { background: #007bff; color: white; border: none; padding: 10px 20px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>Unsubscribe</h1>
        <p>Click the button below to unsubscribe from our emails.</p>
        <form method="POST" action="/api/email/unsubscribe">
          <input type="hidden" name="trackingId" value="${trackingId}" />
          <button type="submit">Unsubscribe</button>
        </form>
      </body>
      </html>
    `);
  }

  @Post('unsubscribe')
  async unsubscribe(
    @Body() dto: UnsubscribeDto,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    await this.emailService.unsubscribe(dto.email, tenantId, dto.reason);
    return { success: true, data: { unsubscribed: true } };
  }
}
