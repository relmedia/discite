import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  EmailTemplateEntity,
  EmailSettingsEntity,
  EmailLogEntity,
  EmailQueueEntity,
  EmailUnsubscribeEntity,
} from '@/infrastructure/database/entities/email.entity';
import { EmailService } from './application/services/email.service';
import { EmailController } from './presentation/email.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmailTemplateEntity,
      EmailSettingsEntity,
      EmailLogEntity,
      EmailQueueEntity,
      EmailUnsubscribeEntity,
    ]),
  ],
  providers: [EmailService],
  controllers: [EmailController],
  exports: [EmailService],
})
export class EmailModule {}
