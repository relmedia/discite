import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { GroupModule } from './modules/group/group.module';
import { CourseModule } from './modules/course/course.module';
import { LessonModule } from './modules/lesson/lesson.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { CertificateModule } from './modules/certificate/certificate.module';
import { InvitationModule } from './modules/invitation/invitation.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { LicenseModule } from './modules/license/license.module';
import { PaymentModule } from './modules/payment/payment.module';
import { NotificationModule } from './modules/notification/notification.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { EmailModule } from './modules/email/email.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuthModule,
    TenantModule,
    UserModule,
    GroupModule,
    CourseModule,
    LessonModule,
    QuizModule,
    CertificateModule,
    InvitationModule,
    MarketplaceModule,
    LicenseModule,
    PaymentModule,
    NotificationModule,
    MessagingModule,
    EmailModule,
    AnalyticsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/me',
        '/api/auth/google',
        '/api/auth/google/callback',
        '/api/tenants',
        '/api/certificates/verify/(.*)',
        '/api/invitations/validate/(.*)',
        '/api/marketplace/courses',
        '/api/marketplace/courses/slug/(.*)',
        '/api/marketplace/categories',
        '/api/payments/webhook',
        '/api/email/track/(.*)',
        '/api/email/unsubscribe/(.*)',
      )
      .forRoutes('*');
  }
}