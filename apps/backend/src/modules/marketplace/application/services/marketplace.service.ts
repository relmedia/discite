import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MarketplaceCourseEntity,
  MarketplaceCourseStatus,
  LicenseOption,
  CourseLevel,
} from '@/infrastructure/database/entities/marketplace-course.entity';
import { CourseEntity } from '@/infrastructure/database/entities/course.entity';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(MarketplaceCourseEntity)
    private readonly marketplaceCourseRepository: Repository<MarketplaceCourseEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
  ) {}

  // Create a new marketplace course (SUPERADMIN only)
  async createMarketplaceCourse(
    dto: {
      title: string;
      description: string;
      thumbnailUrl?: string;
      durationHours: number;
      level: string;
      tags?: string[];
      category?: string;
      basePrice: number;
      currency?: string;
      isFree?: boolean;
      licenseOptions: LicenseOption[];
      includesCertificate?: boolean;
      sourceCourseId?: string;
    },
    createdById: string,
    tenantId?: string,
  ): Promise<MarketplaceCourseEntity> {
    // Generate slug from title
    const slug = this.generateSlug(dto.title);

    // Check if slug already exists
    const existing = await this.marketplaceCourseRepository.findOne({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException('A course with this title already exists');
    }

    // Fetch source course data if sourceCourseId is provided
    let lessonsCount = 0;
    let quizzesCount = 0;
    let totalEnrollments = 0;
    let durationHours = dto.durationHours;

    if (dto.sourceCourseId) {
      const sourceCourse = await this.courseRepository.findOne({
        where: { id: dto.sourceCourseId },
      });
      if (sourceCourse) {
        lessonsCount = sourceCourse.lessonsCount || 0;
        quizzesCount = sourceCourse.quizzesCount || 0;
        totalEnrollments = sourceCourse.studentsEnrolled || 0;
        // Use source course duration if not explicitly provided
        if (!dto.durationHours && sourceCourse.durationHours) {
          durationHours = sourceCourse.durationHours;
        }
      }
    }

    const course = this.marketplaceCourseRepository.create({
      title: dto.title,
      description: dto.description,
      thumbnailUrl: dto.thumbnailUrl,
      durationHours,
      level: dto.level as CourseLevel,
      category: dto.category,
      basePrice: dto.basePrice,
      licenseOptions: dto.licenseOptions,
      includesCertificate: dto.includesCertificate,
      sourceCourseId: dto.sourceCourseId,
      slug,
      tags: dto.tags || [],
      currency: dto.currency || 'USD',
      isFree: dto.isFree ?? (dto.basePrice === 0),
      status: MarketplaceCourseStatus.DRAFT,
      createdById,
      publishedByTenantId: tenantId,
      lessonsCount,
      quizzesCount,
      totalEnrollments,
    });

    return await this.marketplaceCourseRepository.save(course) as MarketplaceCourseEntity;
  }

  // Update a marketplace course
  async updateMarketplaceCourse(
    id: string,
    dto: Partial<{
      title: string;
      description: string;
      thumbnailUrl: string;
      durationHours: number;
      level: string;
      tags: string[];
      category: string;
      basePrice: number;
      currency: string;
      isFree: boolean;
      licenseOptions: LicenseOption[];
      includesCertificate: boolean;
    }>,
  ): Promise<MarketplaceCourseEntity> {
    const course = await this.getMarketplaceCourseById(id);

    // If title is changing, update slug
    if (dto.title && dto.title !== course.title) {
      const newSlug = this.generateSlug(dto.title);
      const existing = await this.marketplaceCourseRepository.findOne({
        where: { slug: newSlug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('A course with this title already exists');
      }
      (dto as any).slug = newSlug;
    }

    Object.assign(course, dto);
    return await this.marketplaceCourseRepository.save(course);
  }

  // Get a single marketplace course by ID
  async getMarketplaceCourseById(id: string): Promise<MarketplaceCourseEntity> {
    const course = await this.marketplaceCourseRepository.findOne({
      where: { id },
      relations: ['createdBy', 'publishedByTenant'],
    });

    if (!course) {
      throw new NotFoundException('Marketplace course not found');
    }

    return course;
  }

  // Get a single marketplace course by slug
  async getMarketplaceCourseBySlug(slug: string): Promise<MarketplaceCourseEntity> {
    const course = await this.marketplaceCourseRepository.findOne({
      where: { slug },
      relations: ['createdBy', 'publishedByTenant'],
    });

    if (!course) {
      throw new NotFoundException('Marketplace course not found');
    }

    return course;
  }

  // Get a marketplace course by source course ID (returns null if not found)
  async getMarketplaceCourseBySourceId(sourceCourseId: string): Promise<MarketplaceCourseEntity | null> {
    const course = await this.marketplaceCourseRepository.findOne({
      where: { sourceCourseId, deletedAt: undefined },
      relations: ['createdBy', 'publishedByTenant'],
    });

    return course || null;
  }

  // Get all published marketplace courses (public catalog)
  async getPublishedCourses(options?: {
    category?: string;
    level?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ courses: MarketplaceCourseEntity[]; total: number }> {
    const query = this.marketplaceCourseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.createdBy', 'createdBy')
      .leftJoinAndSelect('course.publishedByTenant', 'publishedByTenant')
      .where('course.status = :status', { status: MarketplaceCourseStatus.PUBLISHED })
      .andWhere('course.deletedAt IS NULL');

    if (options?.category) {
      query.andWhere('course.category = :category', { category: options.category });
    }

    if (options?.level) {
      query.andWhere('course.level = :level', { level: options.level });
    }

    if (options?.search) {
      query.andWhere(
        '(course.title ILIKE :search OR course.description ILIKE :search OR course.category ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    const total = await query.getCount();

    query.orderBy('course.createdAt', 'DESC');

    if (options?.page && options?.limit) {
      query.skip((options.page - 1) * options.limit).take(options.limit);
    }

    const courses = await query.getMany();

    // Enrich courses with real data from source courses
    const enrichedCourses = await Promise.all(
      courses.map(async (course) => {
        if (course.sourceCourseId) {
          const sourceCourse = await this.courseRepository.findOne({
            where: { id: course.sourceCourseId },
          });
          if (sourceCourse) {
            // Override with real data from source course
            course.lessonsCount = sourceCourse.lessonsCount || 0;
            course.quizzesCount = sourceCourse.quizzesCount || 0;
            // Use max of stored enrollments or source enrollments
            course.totalEnrollments = Math.max(
              course.totalEnrollments || 0,
              sourceCourse.studentsEnrolled || 0,
            );
          }
        }
        return course;
      }),
    );

    return { courses: enrichedCourses, total };
  }

  // Get all marketplace courses (for admin management)
  async getAllMarketplaceCourses(options?: {
    status?: MarketplaceCourseStatus;
    page?: number;
    limit?: number;
  }): Promise<{ courses: MarketplaceCourseEntity[]; total: number }> {
    const query = this.marketplaceCourseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.createdBy', 'createdBy')
      .leftJoinAndSelect('course.publishedByTenant', 'publishedByTenant')
      .where('course.deletedAt IS NULL');

    if (options?.status) {
      query.andWhere('course.status = :status', { status: options.status });
    }

    const total = await query.getCount();

    query.orderBy('course.createdAt', 'DESC');

    if (options?.page && options?.limit) {
      query.skip((options.page - 1) * options.limit).take(options.limit);
    }

    const courses = await query.getMany();

    return { courses, total };
  }

  // Sync marketplace course data from source course
  async syncCourseData(id: string): Promise<MarketplaceCourseEntity> {
    const course = await this.getMarketplaceCourseById(id);

    if (!course.sourceCourseId) {
      return course; // No source course to sync from
    }

    const sourceCourse = await this.courseRepository.findOne({
      where: { id: course.sourceCourseId },
    });

    if (sourceCourse) {
      course.lessonsCount = sourceCourse.lessonsCount || 0;
      course.quizzesCount = sourceCourse.quizzesCount || 0;
      // Don't overwrite totalEnrollments as it might include marketplace enrollments
      // Only update if source has more
      if ((sourceCourse.studentsEnrolled || 0) > (course.totalEnrollments || 0)) {
        course.totalEnrollments = sourceCourse.studentsEnrolled || 0;
      }
      return await this.marketplaceCourseRepository.save(course);
    }

    return course;
  }

  // Publish a marketplace course
  async publishCourse(id: string): Promise<MarketplaceCourseEntity> {
    const course = await this.getMarketplaceCourseById(id);

    if (course.status === MarketplaceCourseStatus.PUBLISHED) {
      throw new ConflictException('Course is already published');
    }

    // Validate course has minimum requirements
    if (!course.title || !course.description) {
      throw new ForbiddenException('Course must have title and description to be published');
    }

    if (course.licenseOptions.length === 0 && !course.isFree) {
      throw new ForbiddenException('Paid courses must have at least one license option');
    }

    // Sync data from source course before publishing
    if (course.sourceCourseId) {
      const sourceCourse = await this.courseRepository.findOne({
        where: { id: course.sourceCourseId },
      });
      if (sourceCourse) {
        course.lessonsCount = sourceCourse.lessonsCount || 0;
        course.quizzesCount = sourceCourse.quizzesCount || 0;
        if ((sourceCourse.studentsEnrolled || 0) > (course.totalEnrollments || 0)) {
          course.totalEnrollments = sourceCourse.studentsEnrolled || 0;
        }
      }
    }

    course.status = MarketplaceCourseStatus.PUBLISHED;
    return await this.marketplaceCourseRepository.save(course);
  }

  // Unpublish a marketplace course
  async unpublishCourse(id: string): Promise<MarketplaceCourseEntity> {
    const course = await this.getMarketplaceCourseById(id);

    if (course.status !== MarketplaceCourseStatus.PUBLISHED) {
      throw new ConflictException('Course is not published');
    }

    course.status = MarketplaceCourseStatus.DRAFT;
    return await this.marketplaceCourseRepository.save(course);
  }

  // Archive a marketplace course
  async archiveCourse(id: string): Promise<MarketplaceCourseEntity> {
    const course = await this.getMarketplaceCourseById(id);
    course.status = MarketplaceCourseStatus.ARCHIVED;
    return await this.marketplaceCourseRepository.save(course);
  }

  // Soft delete a marketplace course
  async deleteCourse(id: string): Promise<void> {
    const course = await this.getMarketplaceCourseById(id);
    course.deletedAt = new Date();
    await this.marketplaceCourseRepository.save(course);
  }

  // Get categories list
  async getCategories(): Promise<string[]> {
    const result = await this.marketplaceCourseRepository
      .createQueryBuilder('course')
      .select('DISTINCT course.category', 'category')
      .where('course.category IS NOT NULL')
      .andWhere('course.status = :status', { status: MarketplaceCourseStatus.PUBLISHED })
      .getRawMany();

    return result.map((r) => r.category).filter(Boolean);
  }

  // Increment purchase count
  async incrementPurchaseCount(id: string): Promise<void> {
    await this.marketplaceCourseRepository.increment({ id }, 'purchaseCount', 1);
  }

  // Increment enrollment count
  async incrementEnrollmentCount(id: string, count: number = 1): Promise<void> {
    await this.marketplaceCourseRepository.increment({ id }, 'totalEnrollments', count);
  }

  // Update Stripe product ID
  async updateStripeProductId(id: string, stripeProductId: string): Promise<void> {
    await this.marketplaceCourseRepository.update(id, { stripeProductId });
  }

  // Helper to generate slug
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}

