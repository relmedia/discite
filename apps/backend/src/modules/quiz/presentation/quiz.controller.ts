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
import { QuizService } from '../application/services/quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ApiResponse, UserRole } from '@repo/shared';

@Controller('api/quizzes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  // SUPERADMIN only - Create quiz
  @Post()
  @Roles(UserRole.SUPERADMIN)
  async createQuiz(
    @Body() dto: CreateQuizDto,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const quiz = await this.quizService.createQuiz(dto, tenantId);
    return {
      success: true,
      data: quiz,
      message: 'Quiz created successfully',
    };
  }

  // Get quizzes by course - access control in service layer
  @Get()
  async getQuizzes(
    @Query('courseId') courseId: string,
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<ApiResponse<any>> {
    const quizzes = await this.quizService.getQuizzesByCourse(
      courseId,
      tenantId,
      userId,
      userRole,
    );
    return {
      success: true,
      data: quizzes,
    };
  }

  // Get single quiz - with access validation
  @Get(':id')
  async getQuizById(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<ApiResponse<any>> {
    const quiz = await this.quizService.getQuizById(id, tenantId, userId, userRole);
    return {
      success: true,
      data: quiz,
    };
  }

  // Get quiz attempts for current user
  @Get(':id/attempts')
  async getQuizAttempts(
    @Param('id') _id: string,
    @TenantId() _tenantId: string,
    @CurrentUser('userId') _userId: string,
  ): Promise<ApiResponse<any>> {
    // This will be handled by getting enrollment and filtering quizAttempts
    // For now, return empty - can be enhanced later
    return {
      success: true,
      data: [],
    };
  }

  // Submit quiz attempt
  @Post(':id/submit')
  async submitQuiz(
    @Param('id') id: string,
    @Body() dto: SubmitQuizDto,
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    const result = await this.quizService.submitQuiz(id, dto, userId, tenantId);
    return {
      success: true,
      data: result,
      message: 'Quiz submitted successfully',
    };
  }

  // SUPERADMIN only - Update quiz
  @Put(':id')
  @Roles(UserRole.SUPERADMIN)
  async updateQuiz(
    @Param('id') id: string,
    @Body() dto: UpdateQuizDto,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const quiz = await this.quizService.updateQuiz(id, dto, tenantId);
    return {
      success: true,
      data: quiz,
      message: 'Quiz updated successfully',
    };
  }

  // SUPERADMIN only - Publish quiz
  @Post(':id/publish')
  @Roles(UserRole.SUPERADMIN)
  async publishQuiz(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const quiz = await this.quizService.publishQuiz(id, tenantId);
    return {
      success: true,
      data: quiz,
      message: 'Quiz published successfully',
    };
  }

  // SUPERADMIN only - Unpublish quiz
  @Post(':id/unpublish')
  @Roles(UserRole.SUPERADMIN)
  async unpublishQuiz(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const quiz = await this.quizService.unpublishQuiz(id, tenantId);
    return {
      success: true,
      data: quiz,
      message: 'Quiz unpublished successfully',
    };
  }

  // SUPERADMIN only - Delete quiz
  @Delete(':id')
  @Roles(UserRole.SUPERADMIN)
  async deleteQuiz(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<void>> {
    await this.quizService.deleteQuiz(id, tenantId);
    return {
      success: true,
      message: 'Quiz deleted successfully',
    };
  }
}

