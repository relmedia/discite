import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { UserRole } from '@repo/shared';
import { CertificateService } from '../application/services/certificate.service';
import { CreateCertificateTemplateDto } from './dto/create-certificate-template.dto';
import { UpdateCertificateTemplateDto } from './dto/update-certificate-template.dto';
import { IssueCertificateDto, RevokeCertificateDto } from './dto/issue-certificate.dto';

@Controller('api/certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  // ============== TEMPLATE ENDPOINTS ==============

  @Post('templates')
  @Roles(UserRole.SUPERADMIN)
  async createTemplate(
    @TenantId() tenantId: string,
    @Body() dto: CreateCertificateTemplateDto,
  ) {
    const template = await this.certificateService.createTemplate(tenantId, dto);
    return { success: true, data: template };
  }

  @Get('templates')
  async getTemplates(@TenantId() tenantId: string) {
    const templates = await this.certificateService.getTemplates(tenantId);
    return { success: true, data: templates };
  }

  @Get('templates/:id')
  async getTemplateById(
    @TenantId() tenantId: string,
    @Param('id') templateId: string,
  ) {
    const template = await this.certificateService.getTemplateById(tenantId, templateId);
    return { success: true, data: template };
  }

  @Put('templates/:id')
  @Roles(UserRole.SUPERADMIN)
  async updateTemplate(
    @TenantId() tenantId: string,
    @Param('id') templateId: string,
    @Body() dto: UpdateCertificateTemplateDto,
  ) {
    const template = await this.certificateService.updateTemplate(tenantId, templateId, dto);
    return { success: true, data: template };
  }

  @Delete('templates/:id')
  @Roles(UserRole.SUPERADMIN)
  async deleteTemplate(
    @TenantId() tenantId: string,
    @Param('id') templateId: string,
  ) {
    await this.certificateService.deleteTemplate(tenantId, templateId);
    return { success: true };
  }

  // ============== CERTIFICATE ENDPOINTS ==============

  @Post('issue')
  @Roles(UserRole.SUPERADMIN)
  async issueCertificate(
    @TenantId() tenantId: string,
    @Body() dto: IssueCertificateDto,
  ) {
    const certificate = await this.certificateService.issueCertificate(tenantId, dto);
    return { success: true, data: certificate };
  }

  @Get('my-certificates')
  async getMyCertificates(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
  ) {
    const certificates = await this.certificateService.getCertificatesByUser(tenantId, user.id);
    return { success: true, data: certificates };
  }

  @Get('by-user/:userId')
  @Roles(UserRole.SUPERADMIN)
  async getCertificatesByUser(
    @TenantId() tenantId: string,
    @Param('userId') userId: string,
  ) {
    const certificates = await this.certificateService.getCertificatesByUser(tenantId, userId);
    return { success: true, data: certificates };
  }

  @Get('by-course/:courseId')
  @Roles(UserRole.SUPERADMIN)
  async getCertificatesByCourse(
    @TenantId() tenantId: string,
    @Param('courseId') courseId: string,
  ) {
    const certificates = await this.certificateService.getCertificatesByCourse(tenantId, courseId);
    return { success: true, data: certificates };
  }

  @Get(':id')
  async getCertificateById(
    @TenantId() tenantId: string,
    @Param('id') certificateId: string,
  ) {
    const certificate = await this.certificateService.getCertificateById(tenantId, certificateId);
    return { success: true, data: certificate };
  }

  @Post(':id/revoke')
  @Roles(UserRole.SUPERADMIN)
  async revokeCertificate(
    @TenantId() tenantId: string,
    @Param('id') certificateId: string,
    @Body() dto: RevokeCertificateDto,
  ) {
    const certificate = await this.certificateService.revokeCertificate(tenantId, certificateId, dto);
    return { success: true, data: certificate };
  }

  // ============== PUBLIC VERIFICATION ==============

  @Get('verify/:certificateNumber')
  @Public()
  async verifyCertificate(@Param('certificateNumber') certificateNumber: string) {
    const certificate = await this.certificateService.verifyCertificate(certificateNumber);
    
    if (!certificate) {
      return {
        success: true,
        data: {
          valid: false,
          message: 'Certificate not found, expired, or revoked',
        },
      };
    }

    return {
      success: true,
      data: {
        valid: true,
        certificate: {
          certificateNumber: certificate.certificateNumber,
          studentName: certificate.studentName,
          courseName: certificate.courseName,
          issueDate: certificate.issueDate,
          expiryDate: certificate.expiryDate,
          instructorName: certificate.instructorName,
        },
      },
    };
  }
}

