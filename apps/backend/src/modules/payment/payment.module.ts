import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeService } from './application/services/stripe.service';
import { PaymentController } from './presentation/payment.controller';
import { LicenseModule } from '@/modules/license/license.module';
import { MarketplaceModule } from '@/modules/marketplace/marketplace.module';
import { HiddenPaymentEntity } from '@/infrastructure/database/entities/hidden-payment.entity';
import { TenantCourseLicenseEntity } from '@/infrastructure/database/entities/tenant-course-license.entity';
import { TenantEntity } from '@/infrastructure/database/entities/tenant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HiddenPaymentEntity,
      TenantCourseLicenseEntity,
      TenantEntity,
    ]),
    LicenseModule,
    MarketplaceModule,
  ],
  controllers: [PaymentController],
  providers: [StripeService],
  exports: [StripeService],
})
export class PaymentModule {}

