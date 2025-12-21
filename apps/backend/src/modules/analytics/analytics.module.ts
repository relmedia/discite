import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './application/services/analytics.service';
import { AnalyticsController } from './presentation/analytics.controller';
import { EnrollmentEntity } from '@/infrastructure/database/entities/enrollment.entity';
import { UserEntity } from '@/infrastructure/database/entities/user.entity';
import { CourseEntity } from '@/infrastructure/database/entities/course.entity';
import { TenantEntity } from '@/infrastructure/database/entities/tenant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EnrollmentEntity, UserEntity, CourseEntity, TenantEntity]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
