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
import { LessonService } from '../application/services/lesson.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ReorderLessonsDto } from './dto/reorder-lessons.dto';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ApiResponse, UserRole } from '@repo/shared';

@Controller('api/lessons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  // SUPERADMIN only - Create lesson
  @Post()
  @Roles(UserRole.SUPERADMIN)
  async createLesson(
    @Body() dto: CreateLessonDto,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const lesson = await this.lessonService.createLesson(dto, tenantId);
    return {
      success: true,
      data: lesson,
      message: 'Lesson created successfully',
    };
  }

  // Get lessons by course - access control in service layer
  @Get()
  async getLessons(
    @Query('courseId') courseId: string,
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<ApiResponse<any>> {
    const lessons = await this.lessonService.getLessonsByCourse(
      courseId,
      tenantId,
      userId,
      userRole,
    );
    return {
      success: true,
      data: lessons,
    };
  }

  // Get single lesson - with access validation
  @Get(':id')
  async getLessonById(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<ApiResponse<any>> {
    const lesson = await this.lessonService.getLessonById(
      id,
      tenantId,
      userId,
      userRole,
    );
    return {
      success: true,
      data: lesson,
    };
  }

  // SUPERADMIN only - Update lesson
  @Put(':id')
  @Roles(UserRole.SUPERADMIN)
  async updateLesson(
    @Param('id') id: string,
    @Body() dto: UpdateLessonDto,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const lesson = await this.lessonService.updateLesson(id, dto, tenantId);
    return {
      success: true,
      data: lesson,
      message: 'Lesson updated successfully',
    };
  }

  // SUPERADMIN only - Publish lesson
  @Post(':id/publish')
  @Roles(UserRole.SUPERADMIN)
  async publishLesson(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const lesson = await this.lessonService.publishLesson(id, tenantId);
    return {
      success: true,
      data: lesson,
      message: 'Lesson published successfully',
    };
  }

  // SUPERADMIN only - Unpublish lesson
  @Post(':id/unpublish')
  @Roles(UserRole.SUPERADMIN)
  async unpublishLesson(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const lesson = await this.lessonService.unpublishLesson(id, tenantId);
    return {
      success: true,
      data: lesson,
      message: 'Lesson unpublished successfully',
    };
  }

  // SUPERADMIN only - Delete lesson
  @Delete(':id')
  @Roles(UserRole.SUPERADMIN)
  async deleteLesson(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<void>> {
    await this.lessonService.deleteLesson(id, tenantId);
    return {
      success: true,
      message: 'Lesson deleted successfully',
    };
  }

  // SUPERADMIN only - Reorder lessons
  @Post('courses/:courseId/reorder')
  @Roles(UserRole.SUPERADMIN)
  async reorderLessons(
    @Param('courseId') courseId: string,
    @Body() dto: ReorderLessonsDto,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<void>> {
    await this.lessonService.reorderLessons(courseId, dto, tenantId);
    return {
      success: true,
      message: 'Lessons reordered successfully',
    };
  }
}
