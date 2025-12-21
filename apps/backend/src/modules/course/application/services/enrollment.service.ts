import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EnrollmentEntity,
  EnrollmentStatus,
} from '@/infrastructure/database/entities/enrollment.entity';
import { CourseEntity, CourseStatus } from '@/infrastructure/database/entities/course.entity';
import { MarketplaceCourseEntity, MarketplaceCourseStatus } from '@/infrastructure/database/entities/marketplace-course.entity';
import { UserCourseAccessEntity, AccessStatus } from '@/infrastructure/database/entities/user-course-access.entity';
import { TenantCourseLicenseEntity, LicenseStatus } from '@/infrastructure/database/entities/tenant-course-license.entity';
import { UserEntity } from '@/infrastructure/database/entities/user.entity';
import { CourseService } from './course.service';
import { CertificateService } from '@/modules/certificate/application/services/certificate.service';
import { NotificationService } from '@/modules/notification/application/services/notification.service';
import { UserRole } from '@repo/shared';

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(EnrollmentEntity)
    private readonly enrollmentRepository: Repository<EnrollmentEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    @InjectRepository(MarketplaceCourseEntity)
    private readonly marketplaceCourseRepository: Repository<MarketplaceCourseEntity>,
    @InjectRepository(UserCourseAccessEntity)
    private readonly userCourseAccessRepository: Repository<UserCourseAccessEntity>,
    @InjectRepository(TenantCourseLicenseEntity)
    private readonly tenantCourseLicenseRepository: Repository<TenantCourseLicenseEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly courseService: CourseService,
    @Inject(forwardRef(() => CertificateService))
    private readonly certificateService: CertificateService,
    private readonly notificationService: NotificationService,
  ) {}

  async enrollUser(
    courseId: string,
    userId: string,
    tenantId: string,
  ): Promise<EnrollmentEntity> {
    console.log('📚 Enrolling user:', { courseId, userId, tenantId });
    
    // Get user to check their role
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isSuperAdmin = user.role === UserRole.SUPERADMIN;
    
    // First try to find the course with the provided tenantId
    let course = await this.courseRepository.findOne({
      where: { id: courseId, tenantId },
    });

    // If not found, try to find the course by ID only (for cross-tenant access)
    if (!course) {
      course = await this.courseRepository.findOne({
        where: { id: courseId },
      });
      
      if (course) {
        console.log('📚 Found course in different tenant:', course.tenantId);
        // Use the course's tenant ID for the enrollment
        tenantId = course.tenantId;
      }
    }

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new ConflictException('Cannot enroll in unpublished course');
    }

    // Check if this is a marketplace course that requires payment
    const marketplaceCourse = await this.marketplaceCourseRepository.findOne({
      where: { 
        sourceCourseId: courseId, 
        status: MarketplaceCourseStatus.PUBLISHED 
      },
    });

    // If it's a marketplace course and user is NOT a superadmin, check access
    if (marketplaceCourse && !isSuperAdmin) {
      const isFree = marketplaceCourse.isFree || marketplaceCourse.basePrice === 0;
      
      if (!isFree) {
        // Check if user has been granted access through a license
        const userAccess = await this.userCourseAccessRepository.findOne({
          where: {
            userId,
            marketplaceCourseId: marketplaceCourse.id,
            status: AccessStatus.ACTIVE,
          },
          relations: ['license'],
        });

        // Also check if the user's tenant has an active license for this course
        const tenantLicense = await this.tenantCourseLicenseRepository.findOne({
          where: {
            tenantId: user.tenantId,
            marketplaceCourseId: marketplaceCourse.id,
            status: LicenseStatus.ACTIVE,
          },
        });

        // If no direct access and no tenant license with available seats, deny enrollment
        if (!userAccess && !tenantLicense) {
          console.log('❌ Access denied: No license found for paid course');
          throw new ForbiddenException(
            'This is a paid course. Please contact your administrator to purchase access.'
          );
        }

        // If tenant has license but user doesn't have direct access, check if it's unlimited license
        if (!userAccess && tenantLicense) {
          const isUnlimitedLicense = tenantLicense.licenseType === 'UNLIMITED';
          const hasSeatAvailable = tenantLicense.seatCount === null || 
            tenantLicense.seatsUsed < tenantLicense.seatCount;

          if (!isUnlimitedLicense && !hasSeatAvailable) {
            console.log('❌ Access denied: No seats available');
            throw new ForbiddenException(
              'No seats available for this course. Please contact your administrator.'
            );
          }
        }

        console.log('✅ Access verified for paid course');
      }
    }

    // Check if already enrolled - check by userId and courseId only (tenant-agnostic)
    const existing = await this.enrollmentRepository.findOne({
      where: { userId, courseId },
    });

    if (existing && existing.status === EnrollmentStatus.ACTIVE) {
      throw new ConflictException('User is already enrolled in this course');
    }

    // Create enrollment with the course's tenant ID
    const enrollment = this.enrollmentRepository.create({
      userId,
      courseId,
      tenantId: course.tenantId, // Use course's tenant, not the request tenant
      status: EnrollmentStatus.ACTIVE,
      progressPercentage: 0,
      lessonProgress: [],
      quizAttempts: [],
      lastAccessedAt: new Date(),
    });

    const saved = await this.enrollmentRepository.save(enrollment);
    console.log('✅ Enrollment created:', saved.id);

    // Increment course enrollment count
    await this.courseService.incrementEnrollmentCount(courseId);

    // Send notification about enrollment
    try {
      await this.notificationService.notifyCourseEnrolled(
        userId,
        course.tenantId,
        course.title,
        courseId,
      );
    } catch (error) {
      console.error('Failed to send enrollment notification:', error);
    }

    return saved;
  }

  async getEnrollmentsByUser(
    userId: string,
    _tenantId?: string,  // tenantId is optional now - we show all user enrollments
  ): Promise<EnrollmentEntity[]> {
    // Fetch all enrollments for this user regardless of tenant
    // This allows SUPERADMINs and users with cross-tenant access to see all their courses
    return await this.enrollmentRepository.find({
      where: { userId },
      relations: ['course', 'course.instructor'],
      order: { enrolledAt: 'DESC' },
    });
  }

  async getEnrollmentsByCourse(
    courseId: string,
    tenantId: string,
  ): Promise<EnrollmentEntity[]> {
    return await this.enrollmentRepository.find({
      where: { courseId, tenantId },
      relations: ['user'],
      order: { enrolledAt: 'DESC' },
    });
  }

  async updateProgress(
    enrollmentId: string,
    userId: string,
    _tenantId: string, // tenantId is kept for backwards compatibility but not used for lookup
    progressData: {
      lessonProgress?: any[];
      quizAttempts?: any[];
      // Support for individual lesson updates from frontend
      lessonId?: string;
      completed?: boolean;
    },
  ): Promise<EnrollmentEntity> {
    // Find enrollment by ID and userId only (tenant-agnostic for cross-tenant access)
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId, userId },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    // Handle individual lesson progress update (from frontend)
    if (progressData.lessonId !== undefined) {
      console.log('=== UPDATE PROGRESS DEBUG ===');
      console.log('Progress Data:', JSON.stringify(progressData));
      console.log('Enrollment ID:', enrollment.id);
      console.log('Current Lesson Progress:', JSON.stringify(enrollment.lessonProgress));
      
      const existingProgressIndex = enrollment.lessonProgress.findIndex(
        (p) => p.lessonId === progressData.lessonId,
      );

      const lessonProgressEntry = {
        lessonId: progressData.lessonId,
        completed: progressData.completed ?? false,
        completedAt: progressData.completed ? new Date() : undefined,
        timeSpentMinutes: 0,
      };

      if (existingProgressIndex >= 0) {
        // Update existing progress entry
        enrollment.lessonProgress[existingProgressIndex] = lessonProgressEntry;
        console.log('Updated existing progress entry at index:', existingProgressIndex);
      } else {
        // Add new progress entry
        enrollment.lessonProgress.push(lessonProgressEntry);
        console.log('Added new progress entry');
      }
      
      console.log('Updated Lesson Progress:', JSON.stringify(enrollment.lessonProgress));
    }

    // Handle batch lesson progress updates
    if (progressData.lessonProgress) {
      enrollment.lessonProgress = progressData.lessonProgress;
    }

    if (progressData.quizAttempts) {
      enrollment.quizAttempts = progressData.quizAttempts;
    }

    // Recalculate progress percentage based on course's total lessons
    enrollment.progressPercentage = await this.calculateProgressWithCourse(
      enrollment,
    );
    enrollment.lastAccessedAt = new Date();

    // Check if course is now complete (100% progress)
    const wasNotCompleted = enrollment.status !== EnrollmentStatus.COMPLETED;
    if (enrollment.progressPercentage >= 100 && wasNotCompleted) {
      console.log('🎉 Course completed! Marking enrollment as completed and issuing certificate...');
      enrollment.status = EnrollmentStatus.COMPLETED;
      enrollment.completedAt = new Date();
    }

    const savedEnrollment = await this.enrollmentRepository.save(enrollment);

    // Auto-issue certificate if course was just completed
    if (enrollment.progressPercentage >= 100 && wasNotCompleted) {
      console.log('🎓 Attempting to auto-issue certificate...');
      
      // Get course details for notification
      const course = await this.courseRepository.findOne({
        where: { id: enrollment.courseId },
      });
      
      // Send course completion notification
      try {
        if (course) {
          await this.notificationService.notifyCourseCompleted(
            enrollment.userId,
            enrollment.tenantId,
            course.title,
            enrollment.courseId,
          );
        }
      } catch (error) {
        console.error('Failed to send course completion notification:', error);
      }
      
      try {
        const certificate = await this.certificateService.autoIssueCertificate(
          enrollment.tenantId,
          enrollment.userId,
          enrollment.courseId,
        );
        if (certificate) {
          console.log('✅ Certificate auto-issued successfully:', certificate.certificateNumber);
        }
      } catch (error) {
        console.error('❌ Failed to auto-issue certificate:', error);
        // Don't throw - certificate issuance should not block progress update
      }
    }

    return savedEnrollment;
  }

  private async calculateProgressWithCourse(
    enrollment: EnrollmentEntity,
  ): Promise<number> {
    // Get the total lessons count from the course
    const course = await this.courseRepository.findOne({
      where: { id: enrollment.courseId },
    });

    if (!course || (course.lessonsCount === 0 && course.quizzesCount === 0)) {
      console.log('Progress calculation: No course or no content', {
        courseExists: !!course,
        lessonsCount: course?.lessonsCount,
        quizzesCount: course?.quizzesCount,
      });
      return 0;
    }

    const completedLessons = enrollment.lessonProgress.filter(
      (l) => l.completed,
    ).length;

    const completedQuizzes =
      enrollment.quizAttempts?.filter((qa) =>
        qa.attempts.some((a) => a.passed),
      ).length || 0;

    const totalItems = course.lessonsCount + course.quizzesCount;
    const completedItems = completedLessons + completedQuizzes;

    const progress = Math.round((completedItems / totalItems) * 100);
    
    console.log('Progress calculation:', {
      completedLessons,
      completedQuizzes,
      totalLessons: course.lessonsCount,
      totalQuizzes: course.quizzesCount,
      totalItems,
      completedItems,
      progress,
    });

    return progress;
  }

  async dropCourse(
    enrollmentId: string,
    userId: string,
    _tenantId: string, // tenantId is kept for backwards compatibility but not used
  ): Promise<void> {
    // Find enrollment by ID and userId only (tenant-agnostic for cross-tenant access)
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId, userId },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    enrollment.status = EnrollmentStatus.DROPPED;
    await this.enrollmentRepository.save(enrollment);

    // Decrement course enrollment count
    await this.courseService.decrementEnrollmentCount(enrollment.courseId);
  }
}
