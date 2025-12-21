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
} from '@nestjs/common';
import { MarketplaceService } from '../application/services/marketplace.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { ApiResponse, UserRole, MarketplaceCourseStatus } from '@repo/shared';
import { CreateMarketplaceCourseDto } from './dto/create-marketplace-course.dto';
import { UpdateMarketplaceCourseDto } from './dto/update-marketplace-course.dto';

@Controller('api/marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  // ===== PUBLIC ENDPOINTS =====

  // Get published courses (public catalog)
  @Get('courses')
  @Public()
  async getPublishedCourses(
    @Query('category') category?: string,
    @Query('level') level?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<any>> {
    const result = await this.marketplaceService.getPublishedCourses({
      category,
      level,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return {
      success: true,
      data: {
        courses: result.courses,
        total: result.total,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : result.total,
      },
    };
  }

  // Get single course by slug (public)
  @Get('courses/slug/:slug')
  @Public()
  async getCourseBySlug(@Param('slug') slug: string): Promise<ApiResponse<any>> {
    const course = await this.marketplaceService.getMarketplaceCourseBySlug(slug);
    return {
      success: true,
      data: course,
    };
  }

  // Get categories (public)
  @Get('categories')
  @Public()
  async getCategories(): Promise<ApiResponse<string[]>> {
    const categories = await this.marketplaceService.getCategories();
    return {
      success: true,
      data: categories,
    };
  }

  // ===== ADMIN ENDPOINTS =====

  // Get all courses (admin view)
  @Get('admin/courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async getAllCourses(
    @Query('status') status?: MarketplaceCourseStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<any>> {
    const result = await this.marketplaceService.getAllMarketplaceCourses({
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return {
      success: true,
      data: {
        courses: result.courses,
        total: result.total,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : result.total,
      },
    };
  }

  // Get marketplace course by source course ID (admin)
  // NOTE: This route must come BEFORE /:id to avoid route conflict
  @Get('admin/courses/source/:sourceCourseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async getCourseBySourceId(
    @Param('sourceCourseId') sourceCourseId: string,
  ): Promise<ApiResponse<any>> {
    const course = await this.marketplaceService.getMarketplaceCourseBySourceId(sourceCourseId);
    return {
      success: true,
      data: course,
    };
  }

  // Get single course by ID (admin)
  @Get('admin/courses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async getCourseById(@Param('id') id: string): Promise<ApiResponse<any>> {
    const course = await this.marketplaceService.getMarketplaceCourseById(id);
    return {
      success: true,
      data: course,
    };
  }

  // Create a new marketplace course
  @Post('admin/courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async createCourse(
    @Body() dto: CreateMarketplaceCourseDto,
    @CurrentUser('userId') userId: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const course = await this.marketplaceService.createMarketplaceCourse(
      dto,
      userId,
      tenantId,
    );

    return {
      success: true,
      data: course,
      message: 'Marketplace course created successfully',
    };
  }

  // Update a marketplace course
  @Put('admin/courses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async updateCourse(
    @Param('id') id: string,
    @Body() dto: UpdateMarketplaceCourseDto,
  ): Promise<ApiResponse<any>> {
    const course = await this.marketplaceService.updateMarketplaceCourse(id, dto);

    return {
      success: true,
      data: course,
      message: 'Marketplace course updated successfully',
    };
  }

  // Publish a course
  @Post('admin/courses/:id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async publishCourse(@Param('id') id: string): Promise<ApiResponse<any>> {
    const course = await this.marketplaceService.publishCourse(id);

    return {
      success: true,
      data: course,
      message: 'Course published successfully',
    };
  }

  // Unpublish a course
  @Post('admin/courses/:id/unpublish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async unpublishCourse(@Param('id') id: string): Promise<ApiResponse<any>> {
    const course = await this.marketplaceService.unpublishCourse(id);

    return {
      success: true,
      data: course,
      message: 'Course unpublished successfully',
    };
  }

  // Archive a course
  @Post('admin/courses/:id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async archiveCourse(@Param('id') id: string): Promise<ApiResponse<any>> {
    const course = await this.marketplaceService.archiveCourse(id);

    return {
      success: true,
      data: course,
      message: 'Course archived successfully',
    };
  }

  // Delete a course (soft delete)
  @Delete('admin/courses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async deleteCourse(@Param('id') id: string): Promise<ApiResponse<any>> {
    await this.marketplaceService.deleteCourse(id);

    return {
      success: true,
      message: 'Course deleted successfully',
    };
  }
}

