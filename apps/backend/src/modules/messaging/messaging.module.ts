import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ConversationEntity,
  ConversationParticipantEntity,
  MessageEntity,
} from '@/infrastructure/database/entities/conversation.entity';
import { UserEntity } from '@/infrastructure/database/entities/user.entity';
import { MessagingService } from './application/services/messaging.service';
import { MessagingController } from './presentation/messaging.controller';
import { NotificationModule } from '@/modules/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConversationEntity,
      ConversationParticipantEntity,
      MessageEntity,
      UserEntity,
    ]),
    NotificationModule,
  ],
  controllers: [MessagingController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
