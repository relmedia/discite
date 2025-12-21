import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LicenseService } from '../application/services/license.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { ApiResponse, UserRole, LicenseStatus, AccessStatus } from '@repo/shared';
import { AssignUsersDto } from './dto/assign-users.dto';
import { RevokeAccessDto } from './dto/revoke-access.dto';

@Controller('api/licenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  // Get all licenses for the current tenant (Admin)
  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getTenantLicenses(
    @TenantId() tenantId: string,
    @Query('status') status?: LicenseStatus,
  ): Promise<ApiResponse<any>> {
    const licenses = await this.licenseService.getTenantLicenses(tenantId, status);
    return {
      success: true,
      data: licenses,
    };
  }

  // Get active licenses (courses available for the tenant)
  @Get('active')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getActiveLicenses(@TenantId() tenantId: string): Promise<ApiResponse<any>> {
    const licenses = await this.licenseService.getActiveLicenses(tenantId);
    return {
      success: true,
      data: licenses,
    };
  }

  // Get a single license by ID
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getLicenseById(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const license = await this.licenseService.getLicenseById(id);

    // Verify license belongs to tenant (unless superadmin)
    if (license.tenantId !== tenantId) {
      return {
        success: false,
        error: 'License not found',
      };
    }

    return {
      success: true,
      data: license,
    };
  }

  // Get users assigned to a license
  @Get(':id/users')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getLicenseUsers(
    @Param('id') id: string,
    @Query('status') status?: AccessStatus,
  ): Promise<ApiResponse<any>> {
    const users = await this.licenseService.getLicenseUsers(id, status);
    return {
      success: true,
      data: users,
    };
  }

  // Assign users to a license
  @Post(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async assignUsers(
    @Param('id') licenseId: string,
    @Body() dto: AssignUsersDto,
    @CurrentUser('userId') userId: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const access = await this.licenseService.assignUsersToLicense(
      licenseId,
      dto.userIds,
      userId,
      tenantId,
    );

    return {
      success: true,
      data: access,
      message: `${access.length} user(s) assigned to course`,
    };
  }

  // Revoke user access
  @Put('access/:accessId/revoke')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async revokeAccess(
    @Param('accessId') accessId: string,
    @Body() dto: RevokeAccessDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    const access = await this.licenseService.revokeUserAccess(
      accessId,
      userId,
      dto.reason,
    );

    return {
      success: true,
      data: access,
      message: 'User access revoked',
    };
  }

  // Get current user's course access
  @Get('user/my-courses')
  async getMyCoursesAccess(
    @CurrentUser('userId') userId: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const access = await this.licenseService.getUserCourseAccess(userId, tenantId);
    return {
      success: true,
      data: access,
    };
  }

  // Check if user has access to a specific course
  @Get('user/check-access/:courseId')
  async checkAccess(
    @Param('courseId') courseId: string,
    @CurrentUser('userId') userId: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<boolean>> {
    const hasAccess = await this.licenseService.hasUserAccess(userId, courseId, tenantId);
    return {
      success: true,
      data: hasAccess,
    };
  }

  // Cancel a license (Admin)
  @Put(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async cancelLicense(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<ApiResponse<any>> {
    const license = await this.licenseService.cancelLicense(id, reason);
    return {
      success: true,
      data: license,
      message: 'License cancelled',
    };
  }
}

