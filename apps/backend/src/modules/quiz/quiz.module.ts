import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizEntity } from '@/infrastructure/database/entities/quiz.entity';
import { CourseEntity } from '@/infrastructure/database/entities/course.entity';
import { EnrollmentEntity } from '@/infrastructure/database/entities/enrollment.entity';
import { QuizController } from './presentation/quiz.controller';
import { QuizService } from './application/services/quiz.service';
import { NotificationModule } from '@/modules/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuizEntity,
      CourseEntity,
      EnrollmentEntity,
    ]),
    NotificationModule,
  ],
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}

