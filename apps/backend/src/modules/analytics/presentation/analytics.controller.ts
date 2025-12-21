import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { UserRole } from '@repo/shared';
import { AnalyticsService } from '../application/services/analytics.service';
import { ApiResponse } from '@repo/shared';

@Controller('api/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('visitors')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getVisitorStats(
    @TenantId() tenantId: string,
    @Query('days') days?: string,
  ): Promise<ApiResponse<any>> {
    const daysNum = days ? parseInt(days, 10) : 90;
    const data = await this.analyticsService.getVisitorStats(tenantId, daysNum);
    
    return {
      success: true,
      data,
    };
  }

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getDashboardMetrics(
    @TenantId() tenantId: string,
    @CurrentUser('role') role: UserRole,
    @Query('days') days?: string,
  ): Promise<ApiResponse<any>> {
    try {
      const daysNum = days ? parseInt(days, 10) : 30;

      if (role === UserRole.SUPERADMIN) {
        const data = await this.analyticsService.getSuperadminDashboardMetrics(daysNum);
        return {
          success: true,
          data,
        };
      } else {
        const data = await this.analyticsService.getTenantDashboardMetrics(tenantId, daysNum);
        return {
          success: true,
          data,
        };
      }
    } catch (error: any) {
      this.logger.error(`Failed to fetch dashboard metrics: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message || 'Failed to fetch dashboard metrics',
      };
    }
  }
}
