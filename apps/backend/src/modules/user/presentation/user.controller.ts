import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { UserService } from '../application/services/user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetCourseDataDto } from './dto/reset-course-data.dto';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { ApiResponse, UserRole } from '@repo/shared';

@Controller('api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async createUser(
    @Body() dto: CreateUserDto,
    @TenantId() tenantId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<ApiResponse<any>> {
    // Only SUPERADMIN can create SUPERADMIN users
    if (dto.role === UserRole.SUPERADMIN && currentUserRole !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only SUPERADMIN can create SUPERADMIN users');
    }
    
    const user = await this.userService.createUser(dto, tenantId);
    return {
      success: true,
      data: user,
      message: 'User created successfully',
    };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getUsersByTenant(
    @TenantId() tenantId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<ApiResponse<any>> {
    const users = await this.userService.getUsersByTenant(tenantId, currentUserRole);
    return {
      success: true,
      data: users,
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getUserById(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const user = await this.userService.getUserById(id, tenantId);
    return {
      success: true,
      data: user,
    };
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @TenantId() tenantId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<ApiResponse<any>> {
    const user = await this.userService.updateUser(id, dto, tenantId, currentUserRole);
    return {
      success: true,
      data: user,
      message: 'User updated successfully',
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async deleteUser(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser('userId') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<ApiResponse<any>> {
    await this.userService.deleteUser(id, tenantId, currentUserId, currentUserRole);
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  @Post(':id/reset-course-data')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async resetUserCourseData(
    @Param('id') id: string,
    @Body() dto: ResetCourseDataDto,
    @TenantId() tenantId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<ApiResponse<any>> {
    await this.userService.resetUserCourseData(
      id, 
      tenantId, 
      currentUserRole, 
      dto.courseIds,
      dto.deleteCertificates
    );
    return {
      success: true,
      message: 'User course data reset successfully',
    };
  }

  @Get(':id/enrollments')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getUserEnrollments(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<ApiResponse<any>> {
    const enrollments = await this.userService.getUserEnrollments(id, tenantId, currentUserRole);
    return {
      success: true,
      data: enrollments,
    };
  }
}