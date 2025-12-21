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

export enum LessonType {
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
  DOCUMENT = 'DOCUMENT',
  MIXED = 'MIXED',
}

@Entity('lessons')
@Index(['courseId', 'orderIndex'])
@Index(['tenantId'])
export class LessonEntity {
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
  content: string;

  @Column({
    type: 'enum',
    enum: LessonType,
    default: LessonType.TEXT,
  })
  type: LessonType;

  @Column({ nullable: true })
  videoUrl: string;

  @Column({ nullable: true })
  documentUrl: string;

  @Column({ default: 0 })
  orderIndex: number;

  @Column({ default: 0 })
  durationMinutes: number;

  @Column({ default: false })
  isPublished: boolean;

  @Column({ nullable: true })
  deletedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
