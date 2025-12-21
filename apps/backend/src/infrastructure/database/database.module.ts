import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TenantEntity } from './entities/tenant.entity';
import { UserEntity } from './entities/user.entity';
import { GroupEntity } from './entities/group.entity';
import { CourseEntity } from './entities/course.entity';
import { LessonEntity } from './entities/lesson.entity';
import { QuizEntity } from './entities/quiz.entity';
import { EnrollmentEntity } from './entities/enrollment.entity';
import { CertificateEntity } from './entities/certificate.entity';
import { CertificateTemplateEntity } from './entities/certificate-template.entity';
import { InvitationEntity } from './entities/invitation.entity';
import { MarketplaceCourseEntity } from './entities/marketplace-course.entity';
import { TenantCourseLicenseEntity } from './entities/tenant-course-license.entity';
import { UserCourseAccessEntity } from './entities/user-course-access.entity';
import { HiddenPaymentEntity } from './entities/hidden-payment.entity';
import { NotificationEntity } from './entities/notification.entity';
import {
  ConversationEntity,
  ConversationParticipantEntity,
  MessageEntity,
} from './entities/conversation.entity';
import {
  EmailTemplateEntity,
  EmailSettingsEntity,
  EmailLogEntity,
  EmailQueueEntity,
  EmailUnsubscribeEntity,
} from './entities/email.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'myapp'),
        entities: [
          TenantEntity,
          UserEntity,
          GroupEntity,
          CourseEntity,
          LessonEntity,
          QuizEntity,
          EnrollmentEntity,
          CertificateEntity,
          CertificateTemplateEntity,
          InvitationEntity,
          MarketplaceCourseEntity,
          TenantCourseLicenseEntity,
          UserCourseAccessEntity,
          HiddenPaymentEntity,
          NotificationEntity,
          ConversationEntity,
          ConversationParticipantEntity,
          MessageEntity,
          EmailTemplateEntity,
          EmailSettingsEntity,
          EmailLogEntity,
          EmailQueueEntity,
          EmailUnsubscribeEntity,
        ],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('DB_LOGGING') === 'true' ? true : ['error', 'warn'],
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}