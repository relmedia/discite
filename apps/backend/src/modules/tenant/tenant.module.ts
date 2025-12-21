import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantEntity } from '@/infrastructure/database/entities/tenant.entity';
import { TenantController } from './presentation/tenant.controller';
import { TenantService } from './application/services/tenant.service';

@Module({
  imports: [TypeOrmModule.forFeature([TenantEntity])],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}