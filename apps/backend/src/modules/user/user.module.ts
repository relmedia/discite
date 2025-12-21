import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '@/infrastructure/database/entities/user.entity';
import { EnrollmentEntity } from '@/infrastructure/database/entities/enrollment.entity';
import { TenantEntity } from '@/infrastructure/database/entities/tenant.entity';
import { CertificateEntity } from '@/infrastructure/database/entities/certificate.entity';
import { CourseEntity } from '@/infrastructure/database/entities/course.entity';
import { UserController } from './presentation/user.controller';
import { UserService } from './application/services/user.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, EnrollmentEntity, TenantEntity, CertificateEntity, CourseEntity])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}