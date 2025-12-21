import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { EnrollmentService } from '../application/services/enrollment.service';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ApiResponse } from '@repo/shared';

@Controller('api/enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  async enrollInCourse(
    @Body() dto: EnrollCourseDto,
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser() fullUser: any,
  ): Promise<ApiResponse<any>> {
    console.log('🎓 Enrollment Request:', {
      courseId: dto.courseId,
      userId,
      userIdType: typeof userId,
      fullUser,
      fullUserKeys: fullUser ? Object.keys(fullUser) : null,
      tenantId,
    });

    // Validate userId is present
    if (!userId) {
      console.error('❌ UserId is null or undefined!', { fullUser });
      throw new Error('User ID is required for enrollment');
    }

    const enrollment = await this.enrollmentService.enrollUser(
      dto.courseId,
      userId,
      tenantId,
    );
    return {
      success: true,
      data: enrollment,
      message: 'Successfully enrolled in course',
    };
  }

  @Get('my-courses')
  async getMyEnrollments(
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    const enrollments = await this.enrollmentService.getEnrollmentsByUser(
      userId,
      tenantId,
    );
    return {
      success: true,
      data: enrollments,
    };
  }

  @Get('course/:courseId')
  async getCourseEnrollments(
    @Param('courseId') courseId: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const enrollments = await this.enrollmentService.getEnrollmentsByCourse(
      courseId,
      tenantId,
    );
    return {
      success: true,
      data: enrollments,
    };
  }

  @Put(':id/progress')
  async updateProgress(
    @Param('id') id: string,
    @Body() progressData: any,
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    const enrollment = await this.enrollmentService.updateProgress(
      id,
      userId,
      tenantId,
      progressData,
    );
    return {
      success: true,
      data: enrollment,
      message: 'Progress updated successfully',
    };
  }

  @Delete(':id')
  async dropCourse(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<void>> {
    await this.enrollmentService.dropCourse(id, userId, tenantId);
    return {
      success: true,
      message: 'Successfully dropped course',
    };
  }
}
