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
import { MarketplaceCourseEntity, LicenseType } from './marketplace-course.entity';

export enum LicenseStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  PENDING = 'PENDING', // Payment pending
}

@Entity('tenant_course_licenses')
@Index(['tenantId', 'marketplaceCourseId'], { unique: true })
@Index(['tenantId', 'status'])
@Index(['status', 'validUntil'])
export class TenantCourseLicenseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => TenantEntity)
  @JoinColumn({ name: 'tenantId' })
  tenant: TenantEntity;

  @Column()
  marketplaceCourseId: string;

  @ManyToOne(() => MarketplaceCourseEntity)
  @JoinColumn({ name: 'marketplaceCourseId' })
  marketplaceCourse: MarketplaceCourseEntity;

  @Column({
    type: 'enum',
    enum: LicenseType,
  })
  licenseType: LicenseType;

  @Column({
    type: 'enum',
    enum: LicenseStatus,
    default: LicenseStatus.PENDING,
  })
  status: LicenseStatus;

  // For SEAT type licenses
  @Column({ nullable: true })
  seatCount: number;

  @Column({ default: 0 })
  seatsUsed: number;

  // Validity period
  @Column()
  validFrom: Date;

  @Column({ nullable: true, type: 'timestamp' })
  validUntil: Date | null; // null = no expiration

  // Payment info
  @Column('decimal', { precision: 10, scale: 2 })
  amountPaid: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ nullable: true })
  stripePaymentIntentId: string;

  @Column({ nullable: true })
  stripeSubscriptionId: string;

  @Column({ nullable: true })
  stripeInvoiceId: string;

  // Subscription info
  @Column({ default: false })
  isSubscription: boolean;

  @Column({ nullable: true })
  subscriptionInterval: string; // 'month' or 'year'

  @Column({ nullable: true })
  nextBillingDate: Date;

  // Purchased by
  @Column()
  purchasedById: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'purchasedById' })
  purchasedBy: UserEntity;

  @Column()
  purchasedAt: Date;

  // Cancellation info
  @Column({ nullable: true })
  cancelledAt: Date;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

