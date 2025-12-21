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
import { CourseEntity } from './course.entity';
import { TenantEntity } from './tenant.entity';

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string | string[];
  points: number;
}

@Entity('quizzes')
@Index(['courseId', 'orderIndex'])
@Index(['tenantId'])
export class QuizEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => TenantEntity)
  @JoinColumn({ name: 'tenantId' })
  tenant: TenantEntity;

  @Column()
  courseId: string;

  @ManyToOne(() => CourseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: CourseEntity;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('jsonb')
  questions: QuizQuestion[];

  @Column({ default: 0 })
  orderIndex: number;

  @Column({ default: 0 })
  passingScore: number;

  @Column({ default: 60 })
  durationMinutes: number;

  @Column({ default: false })
  isPublished: boolean;

  @Column('simple-array', { default: '' })
  requiredLessonIds: string[];

  @Column({ nullable: true })
  attachedToLessonId: string;

  @Column({ nullable: true })
  maxAttempts: number;

  @Column({ nullable: true })
  deletedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
