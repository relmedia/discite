import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { TenantEntity } from './tenant.entity';

export enum NotificationType {
  COURSE_ENROLLED = 'course_enrolled',
  COURSE_COMPLETED = 'course_completed',
  QUIZ_PASSED = 'quiz_passed',
  QUIZ_FAILED = 'quiz_failed',
  CERTIFICATE_ISSUED = 'certificate_issued',
  LICENSE_ASSIGNED = 'license_assigned',
  INVITATION_RECEIVED = 'invitation_received',
  SYSTEM = 'system',
}

@Entity('notifications')
@Index(['userId', 'isRead'])
@Index(['userId', 'createdAt'])
@Index(['tenantId', 'userId'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ nullable: true })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenantId' })
  tenant: TenantEntity;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ nullable: true })
  link: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  readAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
