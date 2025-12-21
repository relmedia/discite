import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseEntity } from '@/infrastructure/database/entities/course.entity';
import { LessonEntity } from '@/infrastructure/database/entities/lesson.entity';
import { QuizEntity } from '@/infrastructure/database/entities/quiz.entity';
import { EnrollmentEntity } from '@/infrastructure/database/entities/enrollment.entity';
import { UserEntity } from '@/infrastructure/database/entities/user.entity';
import { MarketplaceCourseEntity } from '@/infrastructure/database/entities/marketplace-course.entity';
import { UserCourseAccessEntity } from '@/infrastructure/database/entities/user-course-access.entity';
import { TenantCourseLicenseEntity } from '@/infrastructure/database/entities/tenant-course-license.entity';
import { CourseService } from './application/services/course.service';
import { EnrollmentService } from './application/services/enrollment.service';
import { CourseController } from './presentation/course.controller';
import { EnrollmentController } from './presentation/enrollment.controller';
import { CertificateModule } from '@/modules/certificate/certificate.module';
import { NotificationModule } from '@/modules/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourseEntity,
      LessonEntity,
      QuizEntity,
      EnrollmentEntity,
      UserEntity,
      MarketplaceCourseEntity,
      UserCourseAccessEntity,
      TenantCourseLicenseEntity,
    ]),
    forwardRef(() => CertificateModule),
    NotificationModule,
  ],
  controllers: [CourseController, EnrollmentController],
  providers: [CourseService, EnrollmentService],
  exports: [CourseService, EnrollmentService],
})
export class CourseModule {}
