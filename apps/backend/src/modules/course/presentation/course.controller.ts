import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CourseService } from '../application/services/course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ReorderCurriculumDto } from './dto/reorder-curriculum.dto';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ApiResponse, UserRole } from '@repo/shared';

@Controller('api/courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @Roles(UserRole.SUPERADMIN)
  async createCourse(
    @Body() dto: CreateCourseDto,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const course = await this.courseService.createCourse(dto, tenantId);

    // Reload course with instructor relation
    const courseWithInstructor = await this.courseService.getCourseById(course.id, tenantId);

    // Transform course to include instructorName
    const transformedCourse = {
      ...courseWithInstructor,
      instructorName: courseWithInstructor.instructor?.name || 'Unknown',
    };

    return {
      success: true,
      data: transformedCourse,
      message: 'Course created successfully',
    };
  }

  @Get()
  async getCourses(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('level') level?: string,
    @Query('instructorId') instructorId?: string,
  ): Promise<ApiResponse<any>> {
    const courses = await this.courseService.getCoursesByTenant(tenantId, {
      status: status as any,
      level,
      instructorId,
    });

    // Transform courses to include instructorName
    const transformedCourses = courses.map(course => ({
      ...course,
      instructorName: course.instructor?.name || 'Unknown',
    }));

    return {
      success: true,
      data: transformedCourses,
    };
  }

  @Get(':id')
  async getCourseById(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const course = await this.courseService.getCourseById(id, tenantId);

    // Transform course to include instructorName
    const transformedCourse = {
      ...course,
      instructorName: course.instructor?.name || 'Unknown',
    };

    return {
      success: true,
      data: transformedCourse,
    };
  }

  @Put(':id')
  @Roles(UserRole.SUPERADMIN)
  async updateCourse(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<ApiResponse<any>> {
    const course = await this.courseService.updateCourse(
      id,
      dto,
      tenantId,
      userId,
      userRole,
    );
    return {
      success: true,
      data: course,
      message: 'Course updated successfully',
    };
  }

  @Post(':id/publish')
  @Roles(UserRole.SUPERADMIN)
  async publishCourse(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const course = await this.courseService.publishCourse(id, tenantId);
    return {
      success: true,
      data: course,
      message: 'Course published successfully',
    };
  }

  @Post(':id/unpublish')
  @Roles(UserRole.SUPERADMIN)
  async unpublishCourse(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const course = await this.courseService.unpublishCourse(id, tenantId);
    return {
      success: true,
      data: course,
      message: 'Course unpublished successfully',
    };
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN)
  async deleteCourse(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<void>> {
    await this.courseService.deleteCourse(id, tenantId);
    return {
      success: true,
      message: 'Course deleted successfully',
    };
  }

  @Get(':id/curriculum')
  async getCurriculum(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const curriculum = await this.courseService.getCurriculum(id, tenantId);
    return {
      success: true,
      data: curriculum,
    };
  }

  @Post(':id/curriculum/reorder')
  @Roles(UserRole.SUPERADMIN)
  async reorderCurriculum(
    @Param('id') id: string,
    @Body() dto: ReorderCurriculumDto,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<void>> {
    await this.courseService.reorderCurriculum(id, dto, tenantId);
    return {
      success: true,
      message: 'Curriculum reordered successfully',
    };
  }
}
