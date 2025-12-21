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

export enum MarketplaceCourseStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum CourseLevel {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
}

export enum LicenseType {
  SEAT = 'SEAT',           // Pay per user seat
  UNLIMITED = 'UNLIMITED', // All users in tenant can access
  TIME_LIMITED = 'TIME_LIMITED', // Access expires after period
}

export interface LicenseOption {
  type: LicenseType;
  price: number;
  seatCount?: number;       // For SEAT type (minimum seats)
  durationMonths?: number;  // For TIME_LIMITED
  isSubscription: boolean;
}

@Entity('marketplace_courses')
@Index(['status'])
@Index(['publishedByTenantId'])
@Index(['category'])
export class MarketplaceCourseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  slug: string;

  @Column('text')
  description: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'decimal', precision: 5, scale: 1, default: 0 })
  durationHours: number;

  @Column({
    type: 'enum',
    enum: CourseLevel,
    default: CourseLevel.BEGINNER,
  })
  level: CourseLevel;

  @Column({
    type: 'enum',
    enum: MarketplaceCourseStatus,
    default: MarketplaceCourseStatus.DRAFT,
  })
  status: MarketplaceCourseStatus;

  @Column('simple-array', { default: '' })
  tags: string[];

  @Column({ nullable: true })
  category: string;

  // Pricing
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  basePrice: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ default: false })
  isFree: boolean;

  // License options stored as JSON
  @Column('jsonb', { default: [] })
  licenseOptions: LicenseOption[];

  // Stripe integration
  @Column({ nullable: true })
  stripeProductId: string;

  // Publisher info (platform or vendor tenant)
  @Column({ nullable: true })
  publishedByTenantId: string;

  @ManyToOne(() => TenantEntity, { nullable: true })
  @JoinColumn({ name: 'publishedByTenantId' })
  publishedByTenant: TenantEntity;

  @Column()
  createdById: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'createdById' })
  createdBy: UserEntity;

  // Stats
  @Column({ default: 0 })
  purchaseCount: number;

  @Column({ default: 0 })
  totalEnrollments: number;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ default: 0 })
  reviewCount: number;

  // Course content reference (if copying from existing course)
  @Column({ nullable: true })
  sourceCourseId: string;

  // Features included
  @Column({ default: false })
  includesCertificate: boolean;

  @Column({ nullable: true })
  certificateTemplateId: string;

  @Column({ default: 0 })
  lessonsCount: number;

  @Column({ default: 0 })
  quizzesCount: number;

  @Column({ nullable: true })
  deletedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

