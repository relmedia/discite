import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketplaceCourseEntity } from '@/infrastructure/database/entities/marketplace-course.entity';
import { CourseEntity } from '@/infrastructure/database/entities/course.entity';
import { MarketplaceService } from './application/services/marketplace.service';
import { MarketplaceController } from './presentation/marketplace.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MarketplaceCourseEntity, CourseEntity])],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}

