import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EnrollmentEntity, EnrollmentStatus } from '@/infrastructure/database/entities/enrollment.entity';
import { UserEntity } from '@/infrastructure/database/entities/user.entity';
import { CourseEntity } from '@/infrastructure/database/entities/course.entity';
import { TenantEntity } from '@/infrastructure/database/entities/tenant.entity';

export interface VisitorDataPoint {
  date: string;
  visitors: number;
}

export interface GrowthDataPoint {
  date: string;
  count: number;
}

export interface TenantMetrics {
  tenantId: string;
  tenantName: string;
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  activeUsers: number;
  completionRate: number;
}

export interface CoursePerformance {
  courseId: string;
  courseTitle: string;
  enrollments: number;
  completions: number;
  averageProgress: number;
  completionRate: number;
}

export interface DashboardMetrics {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  activeUsers: number;
  averageCompletionRate: number;
  averageProgress: number;
  userGrowth: GrowthDataPoint[];
  enrollmentTrends: GrowthDataPoint[];
  courseCompletionRates: GrowthDataPoint[];
  topCourses: CoursePerformance[];
  userDistributionByRole: { role: string; count: number }[];
}

export interface SuperadminDashboardMetrics extends DashboardMetrics {
  totalTenants: number;
  activeTenants: number;
  tenantGrowth: GrowthDataPoint[];
  topTenants: TenantMetrics[];
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(EnrollmentEntity)
    private readonly enrollmentRepository: Repository<EnrollmentEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
  ) {}

  async getVisitorStats(tenantId: string, days: number = 90): Promise<VisitorDataPoint[]> {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999); // End of today
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0); // Start of day

    // Get all enrollments that have activity in the date range
    // This includes enrollments created, accessed, or updated (which includes progress updates)
    const enrollments = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .where('enrollment.tenantId = :tenantId', { tenantId })
      .andWhere(
        '(enrollment.enrolledAt BETWEEN :startDate AND :endDate OR ' +
        'enrollment.lastAccessedAt BETWEEN :startDate AND :endDate OR ' +
        'enrollment.updatedAt BETWEEN :startDate AND :endDate)',
        { startDate, endDate }
      )
      .select([
        'enrollment.id',
        'enrollment.userId',
        'enrollment.enrolledAt',
        'enrollment.lastAccessedAt',
        'enrollment.updatedAt',
        'enrollment.lessonProgress',
        'enrollment.quizAttempts',
      ])
      .getMany();

    // Get user creation dates
    const newUsers = await this.userRepository.find({
      where: {
        tenantId,
        createdAt: Between(startDate, endDate),
      },
      select: ['id', 'createdAt'],
    });

    // Group activity by date - using Sets to track unique visitors per day
    const dateMap = new Map<string, Set<string>>();

    // Initialize all dates in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dateMap.set(dateStr, new Set());
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Process enrollment activities
    enrollments.forEach(enrollment => {
      // Enrollment date
      if (enrollment.enrolledAt && enrollment.enrolledAt >= startDate && enrollment.enrolledAt <= endDate) {
        const dateStr = enrollment.enrolledAt.toISOString().split('T')[0];
        const dayVisitors = dateMap.get(dateStr);
        if (dayVisitors) {
          dayVisitors.add(enrollment.userId);
        }
      }

      // Last accessed date
      if (enrollment.lastAccessedAt && enrollment.lastAccessedAt >= startDate && enrollment.lastAccessedAt <= endDate) {
        const dateStr = enrollment.lastAccessedAt.toISOString().split('T')[0];
        const dayVisitors = dateMap.get(dateStr);
        if (dayVisitors) {
          dayVisitors.add(enrollment.userId);
        }
      }

      // Updated date (includes progress updates)
      if (enrollment.updatedAt && enrollment.updatedAt >= startDate && enrollment.updatedAt <= endDate) {
        const dateStr = enrollment.updatedAt.toISOString().split('T')[0];
        const dayVisitors = dateMap.get(dateStr);
        if (dayVisitors) {
          dayVisitors.add(enrollment.userId);
        }
      }

      // Lesson completion dates
      if (enrollment.lessonProgress && Array.isArray(enrollment.lessonProgress)) {
        enrollment.lessonProgress.forEach((progress: any) => {
          if (progress.completedAt) {
            const completedDate = new Date(progress.completedAt);
            if (completedDate >= startDate && completedDate <= endDate) {
              const dateStr = completedDate.toISOString().split('T')[0];
              const dayVisitors = dateMap.get(dateStr);
              if (dayVisitors) {
                dayVisitors.add(enrollment.userId);
              }
            }
          }
        });
      }

      // Quiz attempt dates
      if (enrollment.quizAttempts && Array.isArray(enrollment.quizAttempts)) {
        enrollment.quizAttempts.forEach((quizAttempt: any) => {
          if (quizAttempt.attempts && Array.isArray(quizAttempt.attempts)) {
            quizAttempt.attempts.forEach((attempt: any) => {
              if (attempt.completedAt) {
                const attemptDate = new Date(attempt.completedAt);
                if (attemptDate >= startDate && attemptDate <= endDate) {
                  const dateStr = attemptDate.toISOString().split('T')[0];
                  const dayVisitors = dateMap.get(dateStr);
                  if (dayVisitors) {
                    dayVisitors.add(enrollment.userId);
                  }
                }
              }
            });
          }
        });
      }
    });

    // Process new user registrations
    newUsers.forEach(user => {
      const dateStr = user.createdAt.toISOString().split('T')[0];
      const dayVisitors = dateMap.get(dateStr);
      if (dayVisitors) {
        dayVisitors.add(user.id);
      }
    });

    // Convert to counts (unique visitors per day)
    const result: VisitorDataPoint[] = Array.from(dateMap.entries())
      .map(([date, visitors]) => ({
        date,
        visitors: visitors.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  }

  // ============================================
  // TENANT ADMIN DASHBOARD METRICS
  // ============================================

  async getTenantDashboardMetrics(tenantId: string, days: number = 30): Promise<DashboardMetrics> {
    try {
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      // Basic counts
      const [totalUsers, totalCourses, totalEnrollments] = await Promise.all([
        this.userRepository.count({ where: { tenantId } }),
        this.courseRepository.count({ where: { tenantId } }),
        this.enrollmentRepository.count({ where: { tenantId } }),
      ]);

    // Active users (users with activity in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeUsers = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .where('enrollment.tenantId = :tenantId', { tenantId })
      .andWhere('enrollment.lastAccessedAt >= :sevenDaysAgo', { sevenDaysAgo })
      .select('COUNT(DISTINCT enrollment.userId)', 'count')
      .getRawOne();
    const activeUsersCount = parseInt(activeUsers?.count || '0', 10);

    // Completion rate
    const completedEnrollments = await this.enrollmentRepository.count({
      where: {
        tenantId,
        status: EnrollmentStatus.COMPLETED,
      },
    });
    const averageCompletionRate = totalEnrollments > 0
      ? (completedEnrollments / totalEnrollments) * 100
      : 0;

    // Average progress
    const enrollmentsWithProgress = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .where('enrollment.tenantId = :tenantId', { tenantId })
      .select('AVG(enrollment.progressPercentage)', 'avg')
      .getRawOne();
    const averageProgress = parseFloat(enrollmentsWithProgress?.avg || '0');

    // Growth trends
    const userGrowth = await this.getUserGrowthTrend(tenantId, days);
    const enrollmentTrends = await this.getEnrollmentTrends(tenantId, days);
    const courseCompletionRates = await this.getCourseCompletionTrends(tenantId, days);

    // Top courses
    const topCourses = await this.getTopCourses(tenantId, 10);

    // User distribution by role
    const userDistribution = await this.getUserDistributionByRole(tenantId);

    return {
      totalUsers,
      totalCourses,
      totalEnrollments,
      activeUsers: activeUsersCount,
      averageCompletionRate,
      averageProgress,
      userGrowth,
      enrollmentTrends,
      courseCompletionRates,
      topCourses,
      userDistributionByRole: userDistribution,
    };
    } catch (error: any) {
      this.logger.error(`Failed to get tenant dashboard metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ============================================
  // SUPERADMIN DASHBOARD METRICS
  // ============================================

  async getSuperadminDashboardMetrics(days: number = 30): Promise<SuperadminDashboardMetrics> {
    try {
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      // Platform-wide counts
      const [totalTenants, totalUsers, totalCourses, totalEnrollments] = await Promise.all([
        this.tenantRepository.count({ where: { isActive: true } }),
        this.userRepository.count(),
        this.courseRepository.count(),
        this.enrollmentRepository.count(),
      ]);

    // Active tenants (tenants with activity in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeTenants = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .where('enrollment.lastAccessedAt >= :sevenDaysAgo', { sevenDaysAgo })
      .select('COUNT(DISTINCT enrollment.tenantId)', 'count')
      .getRawOne();
    const activeTenantsCount = parseInt(activeTenants?.count || '0', 10);

    // Active users
    const activeUsers = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .where('enrollment.lastAccessedAt >= :sevenDaysAgo', { sevenDaysAgo })
      .select('COUNT(DISTINCT enrollment.userId)', 'count')
      .getRawOne();
    const activeUsersCount = parseInt(activeUsers?.count || '0', 10);

    // Platform-wide completion rate
    const completedEnrollments = await this.enrollmentRepository.count({
      where: { status: EnrollmentStatus.COMPLETED },
    });
    const averageCompletionRate = totalEnrollments > 0
      ? (completedEnrollments / totalEnrollments) * 100
      : 0;

    // Average progress
    const enrollmentsWithProgress = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select('AVG(enrollment.progressPercentage)', 'avg')
      .getRawOne();
    const averageProgress = parseFloat(enrollmentsWithProgress?.avg || '0');

    // Growth trends (platform-wide)
    const userGrowth = await this.getUserGrowthTrend(null, days);
    const enrollmentTrends = await this.getEnrollmentTrends(null, days);
    const courseCompletionRates = await this.getCourseCompletionTrends(null, days);
    const tenantGrowth = await this.getTenantGrowthTrend(days);

    // Top courses (platform-wide)
    const topCourses = await this.getTopCourses(null, 10);

    // Top tenants
    const topTenants = await this.getTopTenants(10);

    // User distribution by role (platform-wide)
    const userDistribution = await this.getUserDistributionByRole(null);

    return {
      totalTenants,
      activeTenants: activeTenantsCount,
      totalUsers,
      totalCourses,
      totalEnrollments,
      activeUsers: activeUsersCount,
      averageCompletionRate,
      averageProgress,
      userGrowth,
      enrollmentTrends,
      courseCompletionRates,
      tenantGrowth,
      topCourses,
      topTenants,
      userDistributionByRole: userDistribution,
    };
    } catch (error: any) {
      this.logger.error(`Failed to get superadmin dashboard metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async getUserGrowthTrend(tenantId: string | null, days: number): Promise<GrowthDataPoint[]> {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt IS NOT NULL')
      .andWhere('user.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .select("DATE_TRUNC('day', user.createdAt)", "date")
      .addSelect("COUNT(*)", "count")
      .groupBy("DATE_TRUNC('day', user.createdAt)")
      .orderBy("DATE_TRUNC('day', user.createdAt)", "ASC");

    if (tenantId) {
      query.andWhere('user.tenantId = :tenantId', { tenantId });
    }

    const results = await query.getRawMany();

    // Fill in missing dates
    const dateMap = new Map<string, number>();
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dateMap.set(dateStr, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    results.forEach((row: any) => {
      if (!row.date) return;
      // DATE_TRUNC returns a timestamp, convert to date string
      let dateValue: Date;
      if (row.date instanceof Date) {
        dateValue = row.date;
      } else if (typeof row.date === 'string') {
        dateValue = new Date(row.date);
      } else {
        // Handle PostgreSQL timestamp format
        dateValue = new Date(row.date);
      }
      if (isNaN(dateValue.getTime())) {
        this.logger.warn(`Invalid date value: ${row.date}`);
        return;
      }
      const dateStr = dateValue.toISOString().split('T')[0];
      dateMap.set(dateStr, parseInt(row.count || '0', 10));
    });

    // Calculate cumulative counts
    let cumulative = 0;
    return Array.from(dateMap.entries())
      .map(([date, count]) => {
        cumulative += count;
        return { date, count: cumulative };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getEnrollmentTrends(tenantId: string | null, days: number): Promise<GrowthDataPoint[]> {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const query = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .where('enrollment.enrolledAt IS NOT NULL')
      .andWhere('enrollment.enrolledAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .select("DATE_TRUNC('day', enrollment.enrolledAt)", "date")
      .addSelect("COUNT(*)", "count")
      .groupBy("DATE_TRUNC('day', enrollment.enrolledAt)")
      .orderBy("DATE_TRUNC('day', enrollment.enrolledAt)", "ASC");

    if (tenantId) {
      query.andWhere('enrollment.tenantId = :tenantId', { tenantId });
    }

    const results = await query.getRawMany();

    const dateMap = new Map<string, number>();
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dateMap.set(dateStr, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    results.forEach((row: any) => {
      if (!row.date) return;
      // DATE_TRUNC returns a timestamp, convert to date string
      let dateValue: Date;
      if (row.date instanceof Date) {
        dateValue = row.date;
      } else if (typeof row.date === 'string') {
        dateValue = new Date(row.date);
      } else {
        // Handle PostgreSQL timestamp format
        dateValue = new Date(row.date);
      }
      if (isNaN(dateValue.getTime())) {
        this.logger.warn(`Invalid date value: ${row.date}`);
        return;
      }
      const dateStr = dateValue.toISOString().split('T')[0];
      dateMap.set(dateStr, parseInt(row.count || '0', 10));
    });

    return Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getCourseCompletionTrends(tenantId: string | null, days: number): Promise<GrowthDataPoint[]> {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const query = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .where('enrollment.completedAt IS NOT NULL')
      .andWhere('enrollment.completedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('enrollment.status = :status', { status: EnrollmentStatus.COMPLETED })
      .select("DATE_TRUNC('day', enrollment.completedAt)", "date")
      .addSelect("COUNT(*)", "count")
      .groupBy("DATE_TRUNC('day', enrollment.completedAt)")
      .orderBy("DATE_TRUNC('day', enrollment.completedAt)", "ASC");

    if (tenantId) {
      query.andWhere('enrollment.tenantId = :tenantId', { tenantId });
    }

    const results = await query.getRawMany();

    const dateMap = new Map<string, number>();
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dateMap.set(dateStr, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    results.forEach((row: any) => {
      if (!row.date) return;
      // DATE_TRUNC returns a timestamp, convert to date string
      let dateValue: Date;
      if (row.date instanceof Date) {
        dateValue = row.date;
      } else if (typeof row.date === 'string') {
        dateValue = new Date(row.date);
      } else {
        // Handle PostgreSQL timestamp format
        dateValue = new Date(row.date);
      }
      if (isNaN(dateValue.getTime())) {
        this.logger.warn(`Invalid date value: ${row.date}`);
        return;
      }
      const dateStr = dateValue.toISOString().split('T')[0];
      dateMap.set(dateStr, parseInt(row.count || '0', 10));
    });

    return Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getTenantGrowthTrend(days: number): Promise<GrowthDataPoint[]> {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const results = await this.tenantRepository
      .createQueryBuilder('tenant')
      .where('tenant.createdAt IS NOT NULL')
      .andWhere('tenant.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .select("DATE_TRUNC('day', tenant.createdAt)", "date")
      .addSelect("COUNT(*)", "count")
      .groupBy("DATE_TRUNC('day', tenant.createdAt)")
      .orderBy("DATE_TRUNC('day', tenant.createdAt)", "ASC")
      .getRawMany();

    const dateMap = new Map<string, number>();
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dateMap.set(dateStr, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    results.forEach((row: any) => {
      if (!row.date) return;
      // DATE_TRUNC returns a timestamp, convert to date string
      let dateValue: Date;
      if (row.date instanceof Date) {
        dateValue = row.date;
      } else if (typeof row.date === 'string') {
        dateValue = new Date(row.date);
      } else {
        // Handle PostgreSQL timestamp format
        dateValue = new Date(row.date);
      }
      if (isNaN(dateValue.getTime())) {
        this.logger.warn(`Invalid date value: ${row.date}`);
        return;
      }
      const dateStr = dateValue.toISOString().split('T')[0];
      dateMap.set(dateStr, parseInt(row.count || '0', 10));
    });

    let cumulative = 0;
    return Array.from(dateMap.entries())
      .map(([date, count]) => {
        cumulative += count;
        return { date, count: cumulative };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getTopCourses(tenantId: string | null, limit: number = 10): Promise<CoursePerformance[]> {
    const query = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .innerJoin('enrollment.course', 'course')
      .select('course.id', 'courseId')
      .addSelect('course.title', 'courseTitle')
      .addSelect('COUNT(enrollment.id)', 'enrollments')
      .addSelect('SUM(CASE WHEN enrollment.status = :completed THEN 1 ELSE 0 END)', 'completions')
      .addSelect('AVG(enrollment.progressPercentage)', 'averageProgress')
      .where('enrollment.status != :dropped', { dropped: EnrollmentStatus.DROPPED })
      .groupBy('course.id')
      .addGroupBy('course.title')
      .orderBy('COUNT(enrollment.id)', 'DESC')
      .limit(limit)
      .setParameter('completed', EnrollmentStatus.COMPLETED);

    if (tenantId) {
      query.andWhere('enrollment.tenantId = :tenantId', { tenantId });
    }

    const results = await query.getRawMany();

    return results.map((row: any) => {
      const enrollments = parseInt(row.enrollments, 10);
      const completions = parseInt(row.completions || '0', 10);
      return {
        courseId: row.courseId,
        courseTitle: row.courseTitle,
        enrollments,
        completions,
        averageProgress: parseFloat(row.averageProgress || '0'),
        completionRate: enrollments > 0 ? (completions / enrollments) * 100 : 0,
      };
    });
  }

  private async getTopTenants(limit: number = 10): Promise<TenantMetrics[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const results = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .innerJoin('enrollment.tenant', 'tenant')
      .select('tenant.id', 'tenantId')
      .addSelect('tenant.name', 'tenantName')
      .addSelect('COUNT(DISTINCT enrollment.userId)', 'totalUsers')
      .addSelect('COUNT(DISTINCT enrollment.courseId)', 'totalCourses')
      .addSelect('COUNT(enrollment.id)', 'totalEnrollments')
      .addSelect('COUNT(DISTINCT CASE WHEN enrollment.lastAccessedAt >= :sevenDaysAgo THEN enrollment.userId END)', 'activeUsers')
      .addSelect('SUM(CASE WHEN enrollment.status = :completed THEN 1 ELSE 0 END)', 'completedEnrollments')
      .groupBy('tenant.id')
      .addGroupBy('tenant.name')
      .orderBy('COUNT(enrollment.id)', 'DESC')
      .limit(limit)
      .setParameter('completed', EnrollmentStatus.COMPLETED)
      .setParameter('sevenDaysAgo', sevenDaysAgo)
      .getRawMany();

    return results.map((row: any) => {
      const totalEnrollments = parseInt(row.totalEnrollments, 10);
      const completedEnrollments = parseInt(row.completedEnrollments || '0', 10);
      return {
        tenantId: row.tenantId,
        tenantName: row.tenantName,
        totalUsers: parseInt(row.totalUsers, 10),
        totalCourses: parseInt(row.totalCourses, 10),
        totalEnrollments,
        activeUsers: parseInt(row.activeUsers || '0', 10),
        completionRate: totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0,
      };
    });
  }

  private async getUserDistributionByRole(tenantId: string | null): Promise<{ role: string; count: number }[]> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .orderBy('COUNT(*)', 'DESC');

    if (tenantId) {
      query.where('user.tenantId = :tenantId', { tenantId });
    }

    const results = await query.getRawMany();

    return results.map((row: any) => ({
      role: row.role,
      count: parseInt(row.count, 10),
    }));
  }
}
