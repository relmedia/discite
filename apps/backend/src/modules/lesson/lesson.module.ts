import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonEntity } from '@/infrastructure/database/entities/lesson.entity';
import { CourseEntity } from '@/infrastructure/database/entities/course.entity';
import { EnrollmentEntity } from '@/infrastructure/database/entities/enrollment.entity';
import { LessonController } from './presentation/lesson.controller';
import { LessonService } from './application/services/lesson.service';
import { CourseModule } from '../course/course.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LessonEntity,
      CourseEntity,
      EnrollmentEntity,
    ]),
    forwardRef(() => CourseModule),
  ],
  controllers: [LessonController],
  providers: [LessonService],
  exports: [LessonService],
})
export class LessonModule {}
