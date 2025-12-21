import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource } from 'typeorm';
import { LessonEntity } from '@/infrastructure/database/entities/lesson.entity';
import { CourseEntity } from '@/infrastructure/database/entities/course.entity';
import { EnrollmentEntity } from '@/infrastructure/database/entities/enrollment.entity';
import { LessonAggregate } from '../../domain/lesson.aggregate';
import { CreateLessonDto } from '../../presentation/dto/create-lesson.dto';
import { UpdateLessonDto } from '../../presentation/dto/update-lesson.dto';
import { ReorderLessonsDto } from '../../presentation/dto/reorder-lessons.dto';
import { UserRole, LessonProgress, LessonWithAccess } from '@repo/shared';

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(LessonEntity)
    private readonly lessonRepository: Repository<LessonEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    @InjectRepository(EnrollmentEntity)
    private readonly enrollmentRepository: Repository<EnrollmentEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async createLesson(
    dto: CreateLessonDto,
    tenantId: string,
  ): Promise<LessonEntity> {
    // Verify course exists
    const course = await this.courseRepository.findOne({
      where: { id: dto.courseId, tenantId, deletedAt: IsNull() },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Get max orderIndex for this course
    const maxOrderLesson = await this.lessonRepository.findOne({
      where: { courseId: dto.courseId, deletedAt: IsNull() },
      order: { orderIndex: 'DESC' },
    });

    const lessonData = LessonAggregate.create({
      title: dto.title,
      content: dto.content,
      courseId: dto.courseId,
      tenantId,
      type: dto.type,
      videoUrl: dto.videoUrl,
      documentUrl: dto.documentUrl,
      durationMinutes: dto.durationMinutes,
    });

    // Set orderIndex to max + 1
    lessonData.orderIndex = maxOrderLesson ? maxOrderLesson.orderIndex + 1 : 0;

    const lesson = this.lessonRepository.create(lessonData);
    const savedLesson = await this.lessonRepository.save(lesson);

    // Increment course lessonsCount
    await this.courseRepository.increment(
      { id: dto.courseId },
      'lessonsCount',
      1,
    );

    return savedLesson;
  }

  async getLessonById(
    id: string,
    tenantId: string,
    _userId?: string,
    userRole?: UserRole,
  ): Promise<LessonEntity> {
    const lesson = await this.lessonRepository.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
      relations: ['course'],
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    // If student, verify enrollment and published status
    if (userRole === UserRole.STUDENT) {
      if (!lesson.isPublished) {
        throw new ForbiddenException('This lesson is not yet published');
      }
      // TODO: Verify enrollment when enrollment service is available
    }

    return lesson;
  }

  async getLessonsByCourse(
    courseId: string,
    tenantId: string,
    userId?: string,
    userRole?: UserRole,
  ): Promise<LessonWithAccess[]> {
    const query = this.lessonRepository
      .createQueryBuilder('lesson')
      .where('lesson.courseId = :courseId', { courseId })
      .andWhere('lesson.tenantId = :tenantId', { tenantId })
      .andWhere('lesson.deletedAt IS NULL')
      .orderBy('lesson.orderIndex', 'ASC');

    // Students can only see published lessons
    if (userRole === UserRole.STUDENT) {
      query.andWhere('lesson.isPublished = :isPublished', {
        isPublished: true,
      });
    }

    const lessons = await query.getMany();

    // Fetch enrollment to include progress data (if user is enrolled)
    let enrollment: EnrollmentEntity | null = null;
    if (userId) {
      enrollment = await this.enrollmentRepository.findOne({
        where: { courseId, userId, tenantId },
      });
      console.log('=== LESSON SERVICE DEBUG ===');
      console.log('UserId:', userId);
      console.log('UserRole:', userRole);
      console.log('Enrollment found:', !!enrollment);
      console.log('Enrollment ID:', enrollment?.id);
      console.log('Lesson Progress:', JSON.stringify(enrollment?.lessonProgress));
      console.log('===========================');
    }

    // Map lessons to include progress and locked status
    const lessonsWithAccess: LessonWithAccess[] = lessons.map((lesson, index) => {
      const lessonProgress = enrollment?.lessonProgress?.find(
        (p: LessonProgress) => p.lessonId === lesson.id,
      );

      // First lesson is always unlocked, others require previous lesson completion
      // Only apply locking if user is enrolled (has enrollment data)
      let isLocked = false;
      if (enrollment && index > 0) {
        const previousLesson = lessons[index - 1];
        const previousProgress = enrollment.lessonProgress?.find(
          (p: LessonProgress) => p.lessonId === previousLesson.id,
        );
        isLocked = !previousProgress?.completed;
      }

      return {
        ...lesson,
        progress: lessonProgress,
        isLocked,
      };
    });

    console.log('First lesson with access:', JSON.stringify(lessonsWithAccess[0]));

    return lessonsWithAccess;
  }

  async updateLesson(
    id: string,
    dto: UpdateLessonDto,
    tenantId: string,
  ): Promise<LessonEntity> {
    const lesson = await this.getLessonById(id, tenantId);

    Object.assign(lesson, dto);
    lesson.updatedAt = new Date();

    return await this.lessonRepository.save(lesson);
  }

  async publishLesson(id: string, tenantId: string): Promise<LessonEntity> {
    const lesson = await this.getLessonById(id, tenantId);
    LessonAggregate.publish(lesson);
    return await this.lessonRepository.save(lesson);
  }

  async unpublishLesson(id: string, tenantId: string): Promise<LessonEntity> {
    const lesson = await this.getLessonById(id, tenantId);
    LessonAggregate.unpublish(lesson);
    return await this.lessonRepository.save(lesson);
  }

  async deleteLesson(id: string, tenantId: string): Promise<void> {
    const lesson = await this.getLessonById(id, tenantId);

    // Soft delete the lesson
    lesson.deletedAt = new Date();
    await this.lessonRepository.save(lesson);

    // Decrement course lessonsCount
    await this.courseRepository.decrement(
      { id: lesson.courseId },
      'lessonsCount',
      1,
    );

    // Reorder remaining lessons
    const remainingLessons = await this.lessonRepository.find({
      where: {
        courseId: lesson.courseId,
        tenantId,
        deletedAt: IsNull(),
      },
      order: { orderIndex: 'ASC' },
    });

    // Update orderIndex to be sequential (0, 1, 2, ...)
    for (let i = 0; i < remainingLessons.length; i++) {
      if (remainingLessons[i].orderIndex !== i) {
        remainingLessons[i].orderIndex = i;
        await this.lessonRepository.save(remainingLessons[i]);
      }
    }
  }

  async reorderLessons(
    courseId: string,
    dto: ReorderLessonsDto,
    tenantId: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const lessonOrder of dto.lessons) {
        const lesson = await queryRunner.manager.findOne(LessonEntity, {
          where: {
            id: lessonOrder.id,
            courseId,
            tenantId,
            deletedAt: IsNull(),
          },
        });

        if (!lesson) {
          throw new NotFoundException(
            `Lesson with ID ${lessonOrder.id} not found`,
          );
        }

        lesson.orderIndex = lessonOrder.orderIndex;
        lesson.updatedAt = new Date();
        await queryRunner.manager.save(lesson);
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async countLessonsByCourse(courseId: string): Promise<number> {
    return await this.lessonRepository.count({
      where: { courseId, deletedAt: IsNull() },
    });
  }

  /**
   * Calculate which lessons are locked based on sequential completion
   * Lesson N is locked if lesson N-1 is not completed
   * First lesson is always unlocked
   */
  calculateLessonAccess(
    lessons: LessonEntity[],
    progressData: LessonProgress[],
  ): Array<LessonEntity & { isLocked: boolean; progress?: LessonProgress }> {
    return lessons.map((lesson, index) => {
      const progress = progressData.find((p) => p.lessonId === lesson.id);

      // First lesson is never locked
      if (index === 0) {
        return { ...lesson, isLocked: false, progress };
      }

      // Check if previous lesson is completed
      const prevLesson = lessons[index - 1];
      const prevProgress = progressData.find(
        (p) => p.lessonId === prevLesson.id,
      );
      const isLocked = !prevProgress?.completed;

      return { ...lesson, isLocked, progress };
    });
  }
}
 
