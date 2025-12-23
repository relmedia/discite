import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserEntity } from '@/infrastructure/database/entities/user.entity';
import { EnrollmentEntity } from '@/infrastructure/database/entities/enrollment.entity';
import { TenantEntity, TenantType } from '@/infrastructure/database/entities/tenant.entity';
import { CertificateEntity } from '@/infrastructure/database/entities/certificate.entity';
import { CourseEntity } from '@/infrastructure/database/entities/course.entity';
import { UserAggregate } from '../../domain/user.aggregate';
import { CreateUserDto } from '../../presentation/dto/create-user.dto';
import { UpdateUserDto } from '../../presentation/dto/update-user.dto';
import { UserRole } from '@repo/shared';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(EnrollmentEntity)
    private readonly enrollmentRepository: Repository<EnrollmentEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(CertificateEntity)
    private readonly certificateRepository: Repository<CertificateEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
  ) {}

  async createUser(dto: CreateUserDto, tenantId: string): Promise<UserEntity> {
    // Check if user already exists in this tenant
    const existing = await this.userRepository.findOne({
      where: { email: dto.email, tenantId },
    });

    if (existing) {
      throw new ConflictException('User already exists in this tenant');
    }

    // Create user using domain logic
    const userData = UserAggregate.create({
      email: dto.email,
      name: dto.name,
      tenantId,
      role: dto.role,
    });

    const user = this.userRepository.create(userData);
    return await this.userRepository.save(user);
  }

  async getUserById(id: string, tenantId: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id, tenantId },
      relations: ['tenant'],
    });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return user;
  }

  async getUsersByTenant(tenantId: string, currentUserRole: UserRole): Promise<UserEntity[]> {
    // SUPERADMIN can see ALL users across ALL tenants
    if (currentUserRole === UserRole.SUPERADMIN) {
      return await this.userRepository.find({
        relations: ['tenant', 'group'],
        order: { createdAt: 'DESC' },
      });
    }

    // Regular admins can only see users from their own tenant
    return await this.userRepository.find({
      where: { tenantId },
      relations: ['tenant', 'group'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateUser(id: string, dto: UpdateUserDto, tenantId: string, currentUserRole: UserRole): Promise<UserEntity> {
    // Only SUPERADMIN can manage public tenant users
    let tenantIds = [tenantId];

    if (currentUserRole === UserRole.SUPERADMIN) {
      const publicTenant = await this.tenantRepository.findOne({
        where: { type: TenantType.PUBLIC },
      });
      if (publicTenant && publicTenant.id !== tenantId) {
        tenantIds = [tenantId, publicTenant.id];
      }
    }

    const user = await this.userRepository.findOne({
      where: { id, tenantId: In(tenantIds) },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Cannot change role to SUPERADMIN unless you're a SUPERADMIN
    if (dto.role === UserRole.SUPERADMIN && currentUserRole !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only SUPERADMIN can assign SUPERADMIN role');
    }

    // Cannot demote a SUPERADMIN unless you're a SUPERADMIN
    if (user.role === UserRole.SUPERADMIN && dto.role && dto.role !== UserRole.SUPERADMIN && currentUserRole !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only SUPERADMIN can change SUPERADMIN role');
    }

    // Check for email uniqueness if email is being changed (within user's tenant)
    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: dto.email, tenantId: user.tenantId },
      });
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    // Only SUPERADMIN can change a user's tenant
    if (dto.tenantId !== undefined && dto.tenantId !== user.tenantId) {
      if (currentUserRole !== UserRole.SUPERADMIN) {
        throw new ForbiddenException('Only SUPERADMIN can change user tenant');
      }
      
      // Verify the target tenant exists
      const targetTenant = await this.tenantRepository.findOne({
        where: { id: dto.tenantId },
      });
      if (!targetTenant) {
        throw new NotFoundException(`Tenant with ID ${dto.tenantId} not found`);
      }

      // Check for email uniqueness in the new tenant
      const existingInNewTenant = await this.userRepository.findOne({
        where: { email: dto.email || user.email, tenantId: dto.tenantId },
      });
      if (existingInNewTenant) {
        throw new ConflictException('Email already in use in the target tenant');
      }
    }

    // Update fields
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.groupId !== undefined) user.groupId = dto.groupId;
    if (dto.tenantId !== undefined) user.tenantId = dto.tenantId;

    return await this.userRepository.save(user);
  }

  async deleteUser(id: string, tenantId: string, currentUserId: string, currentUserRole: UserRole): Promise<void> {
    // Only SUPERADMIN can manage public tenant users
    let tenantIds = [tenantId];

    if (currentUserRole === UserRole.SUPERADMIN) {
      const publicTenant = await this.tenantRepository.findOne({
        where: { type: TenantType.PUBLIC },
      });
      if (publicTenant && publicTenant.id !== tenantId) {
        tenantIds = [tenantId, publicTenant.id];
      }
    }

    const user = await this.userRepository.findOne({
      where: { id, tenantId: In(tenantIds) },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Cannot delete yourself
    if (user.id === currentUserId) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    // Delete all enrollments for this user (in their actual tenant)
    await this.enrollmentRepository.delete({ userId: id, tenantId: user.tenantId });

    // Delete the user
    await this.userRepository.remove(user);
  }

  async resetUserCourseData(
    userId: string,
    tenantId: string,
    currentUserRole: UserRole,
    courseIds: string[],
    deleteCertificates: boolean = false,
  ): Promise<void> {
    // Only SUPERADMIN can manage public tenant users
    let tenantIds = [tenantId];

    if (currentUserRole === UserRole.SUPERADMIN) {
      const publicTenant = await this.tenantRepository.findOne({
        where: { type: TenantType.PUBLIC },
      });
      if (publicTenant && publicTenant.id !== tenantId) {
        tenantIds = [tenantId, publicTenant.id];
      }
    }

    const user = await this.userRepository.findOne({
      where: { id: userId, tenantId: In(tenantIds) },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Reset only selected course enrollments
    // Note: Don't filter by tenantId because marketplace course enrollments
    // are stored with the course's tenant ID, not the user's tenant ID
    if (courseIds.length > 0) {
      // Find enrollments to delete so we can decrement course enrollment counts
      const enrollmentsToDelete = await this.enrollmentRepository.find({
        where: { 
          userId, 
          courseId: In(courseIds),
        },
      });

      // Delete the enrollments
      if (enrollmentsToDelete.length > 0) {
        await this.enrollmentRepository.delete({ 
          userId, 
          courseId: In(courseIds),
        });

        // Decrement enrollment count for each course
        for (const enrollment of enrollmentsToDelete) {
          await this.courseRepository.decrement(
            { id: enrollment.courseId }, 
            'studentsEnrolled', 
            1
          );
        }
      }

      // Optionally delete certificates for selected courses
      if (deleteCertificates) {
        await this.certificateRepository.delete({ 
          userId, 
          courseId: In(courseIds),
        });
      }
    }
  }

  async getUserEnrollments(userId: string, tenantId: string, currentUserRole: UserRole): Promise<EnrollmentEntity[]> {
    // Only SUPERADMIN can view public tenant user enrollments
    let tenantIds = [tenantId];

    if (currentUserRole === UserRole.SUPERADMIN) {
      const publicTenant = await this.tenantRepository.findOne({
        where: { type: TenantType.PUBLIC },
      });
      if (publicTenant && publicTenant.id !== tenantId) {
        tenantIds = [tenantId, publicTenant.id];
      }
    }

    // Verify user exists and is accessible
    const user = await this.userRepository.findOne({
      where: { id: userId, tenantId: In(tenantIds) },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Fetch all enrollments for this user, regardless of enrollment tenant
    // This is needed because marketplace course enrollments store the course's tenant ID,
    // not the user's tenant ID
    return await this.enrollmentRepository.find({
      where: { userId },
      relations: ['course'],
      order: { enrolledAt: 'DESC' },
    });
  }
}