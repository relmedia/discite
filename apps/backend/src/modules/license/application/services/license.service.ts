import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  TenantCourseLicenseEntity,
  LicenseStatus,
} from '@/infrastructure/database/entities/tenant-course-license.entity';
import {
  UserCourseAccessEntity,
  AccessStatus,
} from '@/infrastructure/database/entities/user-course-access.entity';
import { LicenseType } from '@/infrastructure/database/entities/marketplace-course.entity';
import { UserEntity } from '@/infrastructure/database/entities/user.entity';
import { MarketplaceService } from '@/modules/marketplace/application/services/marketplace.service';
import { NotificationService } from '@/modules/notification/application/services/notification.service';

@Injectable()
export class LicenseService {
  constructor(
    @InjectRepository(TenantCourseLicenseEntity)
    private readonly licenseRepository: Repository<TenantCourseLicenseEntity>,
    @InjectRepository(UserCourseAccessEntity)
    private readonly accessRepository: Repository<UserCourseAccessEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly marketplaceService: MarketplaceService,
    private readonly notificationService: NotificationService,
  ) {}

  // Create a new license after successful payment
  async createLicense(dto: {
    tenantId: string;
    marketplaceCourseId: string;
    licenseType: LicenseType;
    seatCount?: number;
    amountPaid: number;
    currency: string;
    purchasedById: string;
    stripePaymentIntentId?: string;
    stripeSubscriptionId?: string;
    isSubscription?: boolean;
    subscriptionInterval?: string;
    durationMonths?: number;
    autoAssignPurchaser?: boolean; // Auto-assign the purchaser to the license
  }): Promise<TenantCourseLicenseEntity> {
    // Check if tenant already has an active license for this course
    const existingLicense = await this.licenseRepository.findOne({
      where: {
        tenantId: dto.tenantId,
        marketplaceCourseId: dto.marketplaceCourseId,
        status: In([LicenseStatus.ACTIVE, LicenseStatus.PENDING]),
      },
    });

    if (existingLicense) {
      throw new ConflictException('Tenant already has an active license for this course');
    }

    // Calculate validity dates
    const validFrom = new Date();
    let validUntil: Date | null = null;

    if (dto.licenseType === LicenseType.TIME_LIMITED && dto.durationMonths) {
      validUntil = new Date();
      validUntil.setMonth(validUntil.getMonth() + dto.durationMonths);
    }

    const license = this.licenseRepository.create({
      tenantId: dto.tenantId,
      marketplaceCourseId: dto.marketplaceCourseId,
      licenseType: dto.licenseType,
      status: LicenseStatus.ACTIVE,
      seatCount: dto.seatCount,
      seatsUsed: 0,
      validFrom,
      validUntil,
      amountPaid: dto.amountPaid,
      currency: dto.currency,
      purchasedById: dto.purchasedById,
      purchasedAt: new Date(),
      stripePaymentIntentId: dto.stripePaymentIntentId,
      stripeSubscriptionId: dto.stripeSubscriptionId,
      isSubscription: dto.isSubscription || false,
      subscriptionInterval: dto.subscriptionInterval,
    });

    const savedLicense = await this.licenseRepository.save(license);

    // Increment purchase count on marketplace course
    await this.marketplaceService.incrementPurchaseCount(dto.marketplaceCourseId);

    // Auto-assign the purchaser to the license if requested
    if (dto.autoAssignPurchaser) {
      try {
        await this.autoAssignPurchaserToLicense(
          savedLicense.id,
          dto.purchasedById,
          dto.tenantId,
          dto.marketplaceCourseId,
        );
      } catch (error) {
        // Log the error but don't fail the license creation
        console.error('Failed to auto-assign purchaser to license:', error);
      }
    }

    return savedLicense;
  }

  // Auto-assign purchaser directly without strict tenant verification
  // This is for users who purchased a course for themselves
  private async autoAssignPurchaserToLicense(
    licenseId: string,
    userId: string,
    tenantId: string,
    marketplaceCourseId: string,
  ): Promise<UserCourseAccessEntity | null> {
    // First, check if user already has access
    const existingAccess = await this.accessRepository.findOne({
      where: {
        licenseId,
        userId,
        status: AccessStatus.ACTIVE,
      },
    });

    if (existingAccess) {
      console.log('User already has access to this course');
      return existingAccess;
    }

    // Find the user (without tenant restriction for self-assignment)
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      console.error('User not found for auto-assignment:', userId);
      return null;
    }

    // Get the license to update seat count
    const license = await this.licenseRepository.findOne({
      where: { id: licenseId },
    });

    if (!license) {
      console.error('License not found for auto-assignment:', licenseId);
      return null;
    }

    // For seat-based licenses, check if there are seats available
    if (license.licenseType === LicenseType.SEAT) {
      const availableSeats = (license.seatCount || 0) - license.seatsUsed;
      if (availableSeats < 1) {
        console.error('No seats available for auto-assignment');
        return null;
      }
    }

    // Create access record - use user's actual tenantId if they have one, otherwise use the license's tenantId
    const access = this.accessRepository.create({
      userId,
      licenseId,
      tenantId: user.tenantId || tenantId,
      marketplaceCourseId,
      status: AccessStatus.ACTIVE,
      assignedAt: new Date(),
      assignedById: userId, // Self-assigned
    });

    const savedAccess = await this.accessRepository.save(access);

    // Update seats used for seat-based licenses
    if (license.licenseType === LicenseType.SEAT) {
      license.seatsUsed = license.seatsUsed + 1;
      await this.licenseRepository.save(license);
    }

    console.log('Auto-assigned purchaser to license:', {
      userId,
      licenseId,
      accessId: (savedAccess as UserCourseAccessEntity).id,
    });

    // Send notification about license assignment
    try {
      // Get marketplace course to get the name
      const marketplaceCourse = await this.marketplaceService.getMarketplaceCourseById(marketplaceCourseId);
      await this.notificationService.notifyLicenseAssigned(
        userId,
        user.tenantId || tenantId,
        marketplaceCourse.title,
        marketplaceCourse.sourceCourseId || marketplaceCourseId,
      );
    } catch (error) {
      console.error('Failed to send auto-assignment notification:', error);
    }

    return savedAccess as UserCourseAccessEntity;
  }

  // Get license by ID
  async getLicenseById(id: string): Promise<TenantCourseLicenseEntity> {
    const license = await this.licenseRepository.findOne({
      where: { id },
      relations: ['tenant', 'marketplaceCourse', 'purchasedBy'],
    });

    if (!license) {
      throw new NotFoundException('License not found');
    }

    return license;
  }

  // Get all licenses for a tenant
  async getTenantLicenses(
    tenantId: string,
    status?: LicenseStatus,
  ): Promise<TenantCourseLicenseEntity[]> {
    const where: any = { tenantId };
    if (status) {
      where.status = status;
    }

    return this.licenseRepository.find({
      where,
      relations: ['marketplaceCourse', 'purchasedBy'],
      order: { purchasedAt: 'DESC' },
    });
  }

  // Get active licenses for a tenant (for course access)
  async getActiveLicenses(tenantId: string): Promise<TenantCourseLicenseEntity[]> {
    return this.licenseRepository
      .createQueryBuilder('license')
      .leftJoinAndSelect('license.marketplaceCourse', 'course')
      .where('license.tenantId = :tenantId', { tenantId })
      .andWhere('license.status = :status', { status: LicenseStatus.ACTIVE })
      .andWhere('(license.validUntil IS NULL OR license.validUntil > :now)', { now: new Date() })
      .getMany();
  }

  // Assign users to a license (consume seats)
  async assignUsersToLicense(
    licenseId: string,
    userIds: string[],
    assignedById: string,
    tenantId: string,
  ): Promise<UserCourseAccessEntity[]> {
    const license = await this.getLicenseById(licenseId);

    // Verify license belongs to the tenant
    if (license.tenantId !== tenantId) {
      throw new ForbiddenException('License does not belong to this tenant');
    }

    // Check license status
    if (license.status !== LicenseStatus.ACTIVE) {
      throw new BadRequestException('License is not active');
    }

    // Check expiration
    if (license.validUntil && new Date() > license.validUntil) {
      throw new BadRequestException('License has expired');
    }

    // For seat-based licenses, check available seats
    if (license.licenseType === LicenseType.SEAT) {
      const availableSeats = (license.seatCount || 0) - license.seatsUsed;
      if (userIds.length > availableSeats) {
        throw new BadRequestException(
          `Not enough seats available. Available: ${availableSeats}, Requested: ${userIds.length}`,
        );
      }
    }

    // Verify all users belong to the tenant
    const users = await this.userRepository.find({
      where: { id: In(userIds), tenantId },
    });

    if (users.length !== userIds.length) {
      throw new BadRequestException('One or more users not found in this tenant');
    }

    // Check for existing access
    const existingAccess = await this.accessRepository.find({
      where: {
        licenseId,
        userId: In(userIds),
        status: AccessStatus.ACTIVE,
      },
    });

    const existingUserIds = new Set(existingAccess.map((a) => a.userId));
    const newUserIds = userIds.filter((id) => !existingUserIds.has(id));

    if (newUserIds.length === 0) {
      throw new ConflictException('All users already have access to this course');
    }

    // Create access records
    const accessRecords = newUserIds.map((userId) =>
      this.accessRepository.create({
        tenantId,
        userId,
        licenseId,
        marketplaceCourseId: license.marketplaceCourseId,
        status: AccessStatus.ACTIVE,
        assignedById,
        assignedAt: new Date(),
      }),
    );

    const savedAccess = await this.accessRepository.save(accessRecords);

    // Update seats used for seat-based licenses
    if (license.licenseType === LicenseType.SEAT) {
      license.seatsUsed += newUserIds.length;
      await this.licenseRepository.save(license);
    }

    // Update enrollment count on marketplace course
    await this.marketplaceService.incrementEnrollmentCount(
      license.marketplaceCourseId,
      newUserIds.length,
    );

    // Send notifications to assigned users
    const courseName = license.marketplaceCourse?.title || 'Course';
    const courseId = license.marketplaceCourse?.sourceCourseId;
    
    for (const userId of newUserIds) {
      try {
        await this.notificationService.notifyLicenseAssigned(
          userId,
          tenantId,
          courseName,
          courseId || license.marketplaceCourseId,
        );
      } catch (error) {
        console.error(`Failed to send license assignment notification to user ${userId}:`, error);
      }
    }

    return savedAccess;
  }

  // Revoke user access
  async revokeUserAccess(
    accessId: string,
    revokedById: string,
    reason?: string,
  ): Promise<UserCourseAccessEntity> {
    const access = await this.accessRepository.findOne({
      where: { id: accessId },
      relations: ['license'],
    });

    if (!access) {
      throw new NotFoundException('Access record not found');
    }

    if (access.status !== AccessStatus.ACTIVE) {
      throw new BadRequestException('Access is not active');
    }

    access.status = AccessStatus.REVOKED;
    access.revokedAt = new Date();
    access.revokedById = revokedById;
    access.revocationReason = reason || null;

    const savedAccess = await this.accessRepository.save(access);

    // For seat-based licenses, free up the seat
    if (access.license.licenseType === LicenseType.SEAT) {
      access.license.seatsUsed = Math.max(0, access.license.seatsUsed - 1);
      await this.licenseRepository.save(access.license);
    }

    return savedAccess;
  }

  // Get users with access to a license
  async getLicenseUsers(
    licenseId: string,
    status?: AccessStatus,
  ): Promise<UserCourseAccessEntity[]> {
    const where: any = { licenseId };
    if (status) {
      where.status = status;
    }

    return this.accessRepository.find({
      where,
      relations: ['user'],
      order: { assignedAt: 'DESC' },
    });
  }

  // Get user's course access for a tenant
  async getUserCourseAccess(
    userId: string,
    tenantId: string,
  ): Promise<UserCourseAccessEntity[]> {
    return this.accessRepository.find({
      where: {
        userId,
        tenantId,
        status: AccessStatus.ACTIVE,
      },
      relations: ['marketplaceCourse', 'license'],
    });
  }

  // Check if user has access to a specific course
  async hasUserAccess(
    userId: string,
    marketplaceCourseId: string,
    tenantId: string,
  ): Promise<boolean> {
    const access = await this.accessRepository.findOne({
      where: {
        userId,
        marketplaceCourseId,
        tenantId,
        status: AccessStatus.ACTIVE,
      },
      relations: ['license'],
    });

    if (!access) return false;

    // Check if license is still valid
    if (access.license.status !== LicenseStatus.ACTIVE) return false;
    if (access.license.validUntil && new Date() > access.license.validUntil) return false;

    return true;
  }

  // Cancel a license
  async cancelLicense(
    licenseId: string,
    reason?: string,
  ): Promise<TenantCourseLicenseEntity> {
    const license = await this.getLicenseById(licenseId);

    if (license.status === LicenseStatus.CANCELLED) {
      throw new BadRequestException('License is already cancelled');
    }

    license.status = LicenseStatus.CANCELLED;
    license.cancelledAt = new Date();
    license.cancellationReason = reason || null;

    // Revoke all active user access
    await this.accessRepository.update(
      { licenseId, status: AccessStatus.ACTIVE },
      {
        status: AccessStatus.REVOKED,
        revokedAt: new Date(),
        revocationReason: 'License cancelled',
      },
    );

    return await this.licenseRepository.save(license);
  }

  // Expire licenses that have passed their validUntil date
  async expireOldLicenses(): Promise<number> {
    const result = await this.licenseRepository
      .createQueryBuilder()
      .update()
      .set({ status: LicenseStatus.EXPIRED })
      .where('status = :status', { status: LicenseStatus.ACTIVE })
      .andWhere('validUntil IS NOT NULL')
      .andWhere('validUntil < :now', { now: new Date() })
      .execute();

    return result.affected || 0;
  }

  // Update license Stripe subscription ID
  async updateStripeSubscription(
    licenseId: string,
    subscriptionId: string,
    nextBillingDate?: Date,
  ): Promise<void> {
    await this.licenseRepository.update(licenseId, {
      stripeSubscriptionId: subscriptionId,
      nextBillingDate,
    });
  }
}

