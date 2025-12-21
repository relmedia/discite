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
import { UserEntity } from './user.entity';
import { CourseEntity } from './course.entity';
import { TenantEntity } from './tenant.entity';

export enum EnrollmentStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DROPPED = 'DROPPED',
}

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  completedAt?: Date;
  timeSpentMinutes: number;
}

export interface QuizAttempt {
  quizId: string;
  attempts: {
    attemptNumber: number;
    score: number;
    totalPoints: number;
    passed: boolean;
    completedAt: Date;
  }[];
  bestScore: number;
}

@Entity('enrollments')
@Index(['userId', 'courseId'], { unique: true })
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'courseId'])
export class EnrollmentEntity {
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

  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIVE,
  })
  status: EnrollmentStatus;

  @Column({ default: 0 })
  progressPercentage: number;

  @Column('jsonb', { default: [] })
  lessonProgress: LessonProgress[];

  @Column('jsonb', { default: [] })
  quizAttempts: QuizAttempt[];

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  lastAccessedAt: Date;

  @CreateDateColumn()
  enrolledAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
