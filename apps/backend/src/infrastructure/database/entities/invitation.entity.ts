import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { UserEntity } from './user.entity';
import { GroupEntity } from './group.entity';
import { UserRole } from '@repo/shared';

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Entity('invitations')
@Index(['tenantId', 'email'])
@Index(['token'], { unique: true })
export class InvitationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => TenantEntity)
  @JoinColumn({ name: 'tenantId' })
  tenant: TenantEntity;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @Column({ nullable: true })
  groupId: string | null;

  @ManyToOne(() => GroupEntity, { nullable: true })
  @JoinColumn({ name: 'groupId' })
  group: GroupEntity;

  @Column()
  token: string;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  invitedById: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'invitedById' })
  invitedBy: UserEntity;

  @Column({ nullable: true })
  message: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  acceptedAt: Date;
}

