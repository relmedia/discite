import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitationEntity } from '@/infrastructure/database/entities/invitation.entity';
import { TenantEntity } from '@/infrastructure/database/entities/tenant.entity';
import { UserEntity } from '@/infrastructure/database/entities/user.entity';
import { GroupEntity } from '@/infrastructure/database/entities/group.entity';
import { InvitationService } from './application/services/invitation.service';
import { InvitationController } from './presentation/invitation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvitationEntity,
      TenantEntity,
      UserEntity,
      GroupEntity,
    ]),
  ],
  controllers: [InvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}

