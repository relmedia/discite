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
import { CertificateTemplateEntity } from './certificate-template.entity';

export enum CourseLevel {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
}

export enum CourseStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('courses')
@Index(['tenantId', 'slug'], { unique: true })
@Index(['tenantId', 'status'])
export class CourseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => TenantEntity)
  @JoinColumn({ name: 'tenantId' })
  tenant: TenantEntity;

  @Column()
  instructorId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'instructorId' })
  instructor: UserEntity;

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
    enum: CourseStatus,
    default: CourseStatus.DRAFT,
  })
  status: CourseStatus;

  @Column('simple-array', { default: '' })
  tags: string[];

  @Column({ default: 0 })
  studentsEnrolled: number;

  @Column({ default: 0 })
  lessonsCount: number;

  @Column({ default: 0 })
  quizzesCount: number;

  // Certificate settings
  @Column({ default: false })
  enableCertificate: boolean;

  @Column({ nullable: true })
  certificateTemplateId: string;

  @ManyToOne(() => CertificateTemplateEntity, { nullable: true })
  @JoinColumn({ name: 'certificateTemplateId' })
  certificateTemplate: CertificateTemplateEntity;

  @Column({ nullable: true })
  certificateExpiryMonths: number; // null = never expires

  @Column({ default: false })
  includeGradeOnCertificate: boolean;

  @Column({ nullable: true })
  deletedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
