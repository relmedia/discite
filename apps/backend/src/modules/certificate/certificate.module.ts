import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificateEntity } from '@/infrastructure/database/entities/certificate.entity';
import { CertificateTemplateEntity } from '@/infrastructure/database/entities/certificate-template.entity';
import { CourseEntity } from '@/infrastructure/database/entities/course.entity';
import { EnrollmentEntity } from '@/infrastructure/database/entities/enrollment.entity';
import { UserEntity } from '@/infrastructure/database/entities/user.entity';
import { CertificateService } from './application/services/certificate.service';
import { CertificateController } from './presentation/certificate.controller';
import { CourseModule } from '@/modules/course/course.module';
import { NotificationModule } from '@/modules/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CertificateEntity,
      CertificateTemplateEntity,
      CourseEntity,
      EnrollmentEntity,
      UserEntity,
    ]),
    forwardRef(() => CourseModule),
    NotificationModule,
  ],
  controllers: [CertificateController],
  providers: [CertificateService],
  exports: [CertificateService],
})
export class CertificateModule {}

