import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { UserEntity } from './user.entity';
import { TenantCourseLicenseEntity } from './tenant-course-license.entity';
import { MarketplaceCourseEntity } from './marketplace-course.entity';

export enum AccessStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  COMPLETED = 'COMPLETED',
}

@Entity('user_course_access')
@Index(['userId', 'licenseId'], { unique: true })
@Index(['tenantId', 'userId'])
@Index(['licenseId', 'status'])
export class UserCourseAccessEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => TenantEntity)
  @JoinColumn({ name: 'tenantId' })
  tenant: TenantEntity;

  @Column()
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  licenseId: string;

  @ManyToOne(() => TenantCourseLicenseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'licenseId' })
  license: TenantCourseLicenseEntity;

  @Column()
  marketplaceCourseId: string;

  @ManyToOne(() => MarketplaceCourseEntity)
  @JoinColumn({ name: 'marketplaceCourseId' })
  marketplaceCourse: MarketplaceCourseEntity;

  @Column({
    type: 'enum',
    enum: AccessStatus,
    default: AccessStatus.ACTIVE,
  })
  status: AccessStatus;

  // Progress tracking
  @Column({ default: 0 })
  progressPercentage: number;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  lastAccessedAt: Date;

  // Assignment info
  @Column({ nullable: true })
  assignedById: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'assignedById' })
  assignedBy: UserEntity;

  @Column()
  assignedAt: Date;

  // Revocation info (if access was revoked)
  @Column({ nullable: true })
  revokedAt: Date;

  @Column({ nullable: true })
  revokedById: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'revokedById' })
  revokedBy: UserEntity;

  @Column({ type: 'text', nullable: true })
  revocationReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

