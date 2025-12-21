import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TenantService } from '../application/services/tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { SetCustomDomainDto } from './dto/set-custom-domain.dto';
import { ApiResponse, UserRole } from '@repo/shared';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('api/tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async createTenant(@Body() dto: CreateTenantDto): Promise<ApiResponse<any>> {
    const tenant = await this.tenantService.createTenant(dto);
    return {
      success: true,
      data: tenant,
      message: 'Tenant created successfully',
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async getAllTenants(): Promise<ApiResponse<any>> {
    const tenants = await this.tenantService.getAllTenants();
    return {
      success: true,
      data: tenants,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async getTenantById(@Param('id') id: string): Promise<ApiResponse<any>> {
    const tenant = await this.tenantService.getTenantById(id);
    return {
      success: true,
      data: tenant,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async updateTenant(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
  ): Promise<ApiResponse<any>> {
    const tenant = await this.tenantService.updateTenant(id, dto);
    return {
      success: true,
      data: tenant,
      message: 'Tenant updated successfully',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async deleteTenant(@Param('id') id: string): Promise<ApiResponse<any>> {
    await this.tenantService.deleteTenant(id);
    return {
      success: true,
      message: 'Tenant deleted successfully',
    };
  }

  // Custom Domain Endpoints

  @Put(':id/custom-domain')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async setCustomDomain(
    @Param('id') id: string,
    @Body() dto: SetCustomDomainDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.tenantService.setCustomDomain(id, dto.customDomain);
    return {
      success: true,
      data: result,
      message: 'Custom domain set. Please verify DNS ownership.',
    };
  }

  @Delete(':id/custom-domain')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async removeCustomDomain(@Param('id') id: string): Promise<ApiResponse<any>> {
    const tenant = await this.tenantService.removeCustomDomain(id);
    return {
      success: true,
      data: tenant,
      message: 'Custom domain removed successfully',
    };
  }

  @Post(':id/custom-domain/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async verifyCustomDomain(@Param('id') id: string): Promise<ApiResponse<any>> {
    const result = await this.tenantService.verifyCustomDomain(id);
    return {
      success: result.verified,
      data: result,
      message: result.message,
    };
  }

  @Get(':id/custom-domain/instructions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async getVerificationInstructions(@Param('id') id: string): Promise<ApiResponse<any>> {
    const instructions = await this.tenantService.getVerificationInstructions(id);
    return {
      success: true,
      data: instructions,
    };
  }

  @Get('by-domain/:domain')
  async getTenantByDomain(@Param('domain') domain: string): Promise<ApiResponse<any>> {
    const tenant = await this.tenantService.getTenantByCustomDomain(domain);
    if (!tenant) {
      return {
        success: false,
        error: 'Tenant not found for this domain',
      };
    }
    return {
      success: true,
      data: tenant,
    };
  }
}