import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantCourseLicenseEntity } from '@/infrastructure/database/entities/tenant-course-license.entity';
import { UserCourseAccessEntity } from '@/infrastructure/database/entities/user-course-access.entity';
import { UserEntity } from '@/infrastructure/database/entities/user.entity';
import { LicenseService } from './application/services/license.service';
import { LicenseController } from './presentation/license.controller';
import { MarketplaceModule } from '@/modules/marketplace/marketplace.module';
import { NotificationModule } from '@/modules/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TenantCourseLicenseEntity,
      UserCourseAccessEntity,
      UserEntity,
    ]),
    forwardRef(() => MarketplaceModule),
    NotificationModule,
  ],
  controllers: [LicenseController],
  providers: [LicenseService],
  exports: [LicenseService],
})
export class LicenseModule {}

