import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource } from 'typeorm';
import { CourseEntity, CourseStatus } from '@/infrastructure/database/entities/course.entity';
import { UserEntity } from '@/infrastructure/database/entities/user.entity';
import { LessonEntity } from '@/infrastructure/database/entities/lesson.entity';
import { QuizEntity } from '@/infrastructure/database/entities/quiz.entity';
import { MarketplaceCourseEntity, MarketplaceCourseStatus } from '@/infrastructure/database/entities/marketplace-course.entity';
import { CourseAggregate } from '../../domain/course.aggregate';
import { CreateCourseDto } from '../../presentation/dto/create-course.dto';
import { UpdateCourseDto } from '../../presentation/dto/update-course.dto';
import { ReorderCurriculumDto, CurriculumItemType } from '../../presentation/dto/reorder-curriculum.dto';
import { UserRole, CourseLevel } from '@repo/shared';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(LessonEntity)
    private readonly lessonRepository: Repository<LessonEntity>,
    @InjectRepository(QuizEntity)
    private readonly quizRepository: Repository<QuizEntity>,
    @InjectRepository(MarketplaceCourseEntity)
    private readonly marketplaceCourseRepository: Repository<MarketplaceCourseEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async createCourse(
    dto: CreateCourseDto,
    tenantId: string,
  ): Promise<CourseEntity> {
    // Verify instructor exists
    const instructor = await this.userRepository.findOne({
      where: { id: dto.instructorId, tenantId },
    });

    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    // Check slug uniqueness
    const slug = CourseAggregate.generateSlug(dto.title);
    const existing = await this.courseRepository.findOne({
      where: { slug, tenantId, deletedAt: IsNull() },
    });

    if (existing) {
      throw new ConflictException('Course with this title already exists');
    }

    const courseData = CourseAggregate.create({
      title: dto.title,
      description: dto.description,
      instructorId: dto.instructorId,
      tenantId,
      level: dto.level,
      durationHours: dto.durationHours,
      thumbnailUrl: dto.thumbnailUrl,
      tags: dto.tags,
    });

    const course = this.courseRepository.create(courseData);
    const savedCourse = await this.courseRepository.save(course);

    // If listing on marketplace, create MarketplaceCourse
    if (dto.listOnMarketplace) {
      await this.createMarketplaceCourse(savedCourse, dto, tenantId);
    }

    return savedCourse;
  }

  private async createMarketplaceCourse(
    course: CourseEntity,
    dto: CreateCourseDto,
    tenantId: string,
  ): Promise<MarketplaceCourseEntity> {
    const marketplaceCourse = this.marketplaceCourseRepository.create({
      title: course.title,
      slug: course.slug,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl || undefined,
      durationHours: course.durationHours,
      level: course.level as unknown as CourseLevel,
      tags: course.tags || [],
      category: dto.category || undefined,
      basePrice: dto.isFree ? 0 : (dto.basePrice || 0),
      currency: dto.currency || 'USD',
      isFree: dto.isFree || false,
      licenseOptions: dto.licenseOptions || [],
      includesCertificate: dto.includesCertificate || false,
      status: MarketplaceCourseStatus.DRAFT,
      createdById: dto.instructorId,
      publishedByTenantId: tenantId,
      sourceCourseId: course.id,
    });

    const saved = await this.marketplaceCourseRepository.save(marketplaceCourse);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async getCourseById(id: string, tenantId: string): Promise<CourseEntity> {
    // First try to find course within the user's tenant
    let course = await this.courseRepository.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
      relations: ['instructor'],
    });

    // If not found, check if it's a published marketplace course (cross-tenant access)
    if (!course) {
      // Look for the course by ID only
      const crossTenantCourse = await this.courseRepository.findOne({
        where: { id, deletedAt: IsNull(), status: CourseStatus.PUBLISHED },
        relations: ['instructor'],
      });

      // Verify it's listed on the marketplace
      if (crossTenantCourse) {
        const marketplaceListing = await this.marketplaceCourseRepository.findOne({
          where: { 
            sourceCourseId: id, 
            status: MarketplaceCourseStatus.PUBLISHED 
          },
        });

        if (marketplaceListing) {
          course = crossTenantCourse;
        }
      }
    }

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  async getCoursesByTenant(
    tenantId: string,
    filters?: { status?: CourseStatus; level?: string; instructorId?: string },
  ): Promise<CourseEntity[]> {
    const query = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .where('course.tenantId = :tenantId', { tenantId })
      .andWhere('course.deletedAt IS NULL');

    if (filters?.status) {
      query.andWhere('course.status = :status', { status: filters.status });
    }

    if (filters?.level) {
      query.andWhere('course.level = :level', { level: filters.level });
    }

    if (filters?.instructorId) {
      query.andWhere('course.instructorId = :instructorId', {
        instructorId: filters.instructorId,
      });
    }

    query.orderBy('course.createdAt', 'DESC');

    return await query.getMany();
  }

  async updateCourse(
    id: string,
    dto: UpdateCourseDto,
    tenantId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseEntity> {
    const course = await this.getCourseById(id, tenantId);

    // Debug logging
    console.log('🔍 Authorization Check:', {
      courseInstructorId: course.instructorId,
      userId: userId,
      userRole: userRole,
      userRoleType: typeof userRole,
      isInstructor: course.instructorId === userId,
      isAdmin: userRole === UserRole.ADMIN,
      isSuperAdmin: userRole === UserRole.SUPERADMIN,
      UserRoleEnum: UserRole,
      UserRoleADMIN: UserRole.ADMIN,
      UserRoleSUPERADMIN: UserRole.SUPERADMIN,
      strictEquality: userRole === 'SUPERADMIN',
    });

    // Authorization: Only course instructor, ADMIN, or SUPERADMIN can update
    const canUpdate =
      course.instructorId === userId ||
      userRole === UserRole.ADMIN ||
      userRole === UserRole.SUPERADMIN;

    if (!canUpdate) {
      throw new ForbiddenException(
        'You do not have permission to update this course',
      );
    }

    Object.assign(course, dto);
    course.updatedAt = new Date();

    return await this.courseRepository.save(course);
  }

  async publishCourse(id: string, tenantId: string): Promise<CourseEntity> {
    const course = await this.getCourseById(id, tenantId);
    course.status = CourseStatus.PUBLISHED;
    const savedCourse = await this.courseRepository.save(course);

    // Also publish associated marketplace course if it exists
    const marketplaceCourse = await this.marketplaceCourseRepository.findOne({
      where: { sourceCourseId: id },
    });
    if (marketplaceCourse && marketplaceCourse.status !== MarketplaceCourseStatus.PUBLISHED) {
      marketplaceCourse.status = MarketplaceCourseStatus.PUBLISHED;
      await this.marketplaceCourseRepository.save(marketplaceCourse);
    }

    return savedCourse;
  }

  async unpublishCourse(id: string, tenantId: string): Promise<CourseEntity> {
    const course = await this.getCourseById(id, tenantId);
    course.status = CourseStatus.DRAFT;
    const savedCourse = await this.courseRepository.save(course);

    // Also unpublish associated marketplace course if it exists
    const marketplaceCourse = await this.marketplaceCourseRepository.findOne({
      where: { sourceCourseId: id },
    });
    if (marketplaceCourse && marketplaceCourse.status === MarketplaceCourseStatus.PUBLISHED) {
      marketplaceCourse.status = MarketplaceCourseStatus.DRAFT;
      await this.marketplaceCourseRepository.save(marketplaceCourse);
    }

    return savedCourse;
  }

  async deleteCourse(id: string, tenantId: string): Promise<void> {
    const course = await this.getCourseById(id, tenantId);
    course.deletedAt = new Date();
    await this.courseRepository.save(course);
  }

  async incrementEnrollmentCount(courseId: string): Promise<void> {
    await this.courseRepository.increment({ id: courseId }, 'studentsEnrolled', 1);
  }

  async decrementEnrollmentCount(courseId: string): Promise<void> {
    await this.courseRepository.decrement({ id: courseId }, 'studentsEnrolled', 1);
  }

  async incrementLessonsCount(courseId: string): Promise<void> {
    await this.courseRepository.increment({ id: courseId }, 'lessonsCount', 1);
  }

  async decrementLessonsCount(courseId: string): Promise<void> {
    await this.courseRepository.decrement({ id: courseId }, 'lessonsCount', 1);
  }

  async reorderCurriculum(
    courseId: string,
    dto: ReorderCurriculumDto,
    tenantId: string,
  ): Promise<void> {
    // Verify course exists
    await this.getCourseById(courseId, tenantId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of dto.items) {
        if (item.type === CurriculumItemType.LESSON) {
          const lesson = await queryRunner.manager.findOne(LessonEntity, {
            where: { id: item.id, courseId, tenantId, deletedAt: IsNull() },
          });

          if (!lesson) {
            throw new NotFoundException(`Lesson with ID ${item.id} not found`);
          }

          lesson.orderIndex = item.orderIndex;
          lesson.updatedAt = new Date();
          await queryRunner.manager.save(lesson);
        } else if (item.type === CurriculumItemType.QUIZ) {
          const quiz = await queryRunner.manager.findOne(QuizEntity, {
            where: { id: item.id, courseId, tenantId, deletedAt: IsNull() },
          });

          if (!quiz) {
            throw new NotFoundException(`Quiz with ID ${item.id} not found`);
          }

          quiz.orderIndex = item.orderIndex;
          quiz.updatedAt = new Date();
          await queryRunner.manager.save(quiz);
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getCurriculum(
    courseId: string,
    tenantId: string,
  ): Promise<{ lessons: LessonEntity[]; quizzes: QuizEntity[] }> {
    // This will handle cross-tenant access for marketplace courses
    const course = await this.getCourseById(courseId, tenantId);
    
    // Use the course's actual tenantId for fetching curriculum (for cross-tenant marketplace courses)
    const actualTenantId = course.tenantId;

    const [lessons, quizzes] = await Promise.all([
      this.lessonRepository.find({
        where: { courseId, tenantId: actualTenantId, deletedAt: IsNull() },
        order: { orderIndex: 'ASC' },
      }),
      this.quizRepository.find({
        where: { courseId, tenantId: actualTenantId, deletedAt: IsNull() },
        order: { orderIndex: 'ASC' },
      }),
    ]);

    return { lessons, quizzes };
  }
}
