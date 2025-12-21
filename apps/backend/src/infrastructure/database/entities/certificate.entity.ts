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
import { CourseEntity } from './course.entity';
import { CertificateTemplateEntity } from './certificate-template.entity';

@Entity('certificates')
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'courseId'])
@Index(['certificateNumber'], { unique: true })
export class CertificateEntity {
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
  courseId: string;

  @ManyToOne(() => CourseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: CourseEntity;

  @Column()
  templateId: string;

  @ManyToOne(() => CertificateTemplateEntity)
  @JoinColumn({ name: 'templateId' })
  template: CertificateTemplateEntity;

  @Column({ unique: true })
  certificateNumber: string; // Unique verification number

  @Column()
  studentName: string; // Name as displayed on certificate

  @Column()
  courseName: string; // Course name at time of issue

  @Column({ nullable: true })
  instructorName: string;

  @Column({ type: 'float', nullable: true })
  finalGrade: number; // Optional: final grade/score

  @Column()
  completionDate: Date;

  @Column()
  issueDate: Date;

  @Column({ nullable: true })
  expiryDate: Date; // Optional expiry

  @Column({ nullable: true })
  pdfUrl: string; // Stored PDF URL

  @Column('jsonb', { nullable: true })
  metadata: {
    totalLessons?: number;
    totalQuizzes?: number;
    totalTimeSpentMinutes?: number;
    averageQuizScore?: number;
  };

  @Column({ default: false })
  isRevoked: boolean;

  @Column({ nullable: true })
  revokedAt: Date;

  @Column({ nullable: true })
  revokedReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

