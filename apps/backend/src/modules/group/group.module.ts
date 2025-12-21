import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupEntity } from '@/infrastructure/database/entities/group.entity';
import { UserEntity } from '@/infrastructure/database/entities/user.entity';
import { GroupService } from './application/services/group.service';
import { GroupController } from './presentation/group.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GroupEntity, UserEntity])],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService],
})
export class GroupModule {}
