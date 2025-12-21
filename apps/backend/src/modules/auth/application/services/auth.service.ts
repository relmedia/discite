import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '@/infrastructure/database/entities/user.entity';
import { TenantEntity } from '@/infrastructure/database/entities/tenant.entity';
import { InvitationEntity, InvitationStatus } from '@/infrastructure/database/entities/invitation.entity';
import { JwtPayload } from '../../strategies/jwt.strategy';
import { GoogleProfile } from '../../strategies/google.strategy';
import { UserRole } from '@repo/shared';
import { TenantType } from '@/infrastructure/database/entities/tenant.entity';

// Extended payload for impersonation
interface ImpersonationJwtPayload extends JwtPayload {
  impersonatedBy?: string;
  impersonatedByEmail?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(InvitationEntity)
    private readonly invitationRepository: Repository<InvitationEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Auto-detect tenant from user email
   * Searches for user by email across all tenants
   */
  async validateUserByEmail(email: string, password: string): Promise<UserEntity | null> {
    // Find user by email across all tenants
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['tenant'],
    });

    if (!user || !user.passwordHash) {
      return null;
    }

    // Check if tenant is active
    if (!user.tenant.isActive) {
      throw new UnauthorizedException('Tenant is inactive');
    }

    const isPasswordValid = await this.validatePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async validateUser(email: string, password: string, tenantSubdomain?: string): Promise<UserEntity | null> {
    // If no tenant subdomain provided, auto-detect from email
    if (!tenantSubdomain) {
      return this.validateUserByEmail(email, password);
    }

    // Find tenant first
    const tenant = await this.tenantRepository.findOne({
      where: { subdomain: tenantSubdomain },
    });

    if (!tenant) {
      return null;
    }

    // Find user by email and tenant
    const user = await this.userRepository.findOne({
      where: {
        email: email.toLowerCase(),
        tenantId: tenant.id,
      },
      relations: ['tenant'],
    });

    if (!user || !user.passwordHash) {
      return null;
    }

    // Check if tenant is active
    if (!user.tenant.isActive) {
      throw new UnauthorizedException('Tenant is inactive');
    }

    const isPasswordValid = await this.validatePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(user: UserEntity) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        subdomain: user.tenant.subdomain,
        isActive: user.tenant.isActive,
      },
    };
  }

  async register(
    email: string,
    password: string,
    name: string,
    tenantSubdomain?: string,
    invitationToken?: string,
  ): Promise<UserEntity> {
    let tenant: TenantEntity;
    let role = UserRole.STUDENT;
    let groupId: string | null = null;

    if (invitationToken) {
      // Invitation-based registration
      const invitation = await this.invitationRepository.findOne({
        where: { token: invitationToken },
        relations: ['tenant', 'group'],
      });

      if (!invitation) {
        throw new BadRequestException('Invalid invitation token');
      }

      if (invitation.status === InvitationStatus.ACCEPTED) {
        throw new BadRequestException('Invitation has already been used');
      }

      if (invitation.status === InvitationStatus.CANCELLED) {
        throw new BadRequestException('Invitation was cancelled');
      }

      if (invitation.expiresAt < new Date()) {
        invitation.status = InvitationStatus.EXPIRED;
        await this.invitationRepository.save(invitation);
        throw new BadRequestException('Invitation has expired');
      }

      // Verify email matches invitation
      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        throw new BadRequestException('Email does not match invitation');
      }

      if (!invitation.tenant.isActive) {
        throw new BadRequestException('Organization is no longer active');
      }

      tenant = invitation.tenant;
      role = invitation.role;
      groupId = invitation.groupId;

      // Mark invitation as accepted
      invitation.status = InvitationStatus.ACCEPTED;
      invitation.acceptedAt = new Date();
      await this.invitationRepository.save(invitation);
    } else if (tenantSubdomain) {
      // Legacy: subdomain-based registration (for existing tenants allowing open signup)
      const foundTenant = await this.tenantRepository.findOne({
        where: { subdomain: tenantSubdomain },
      });

      if (!foundTenant) {
        throw new UnauthorizedException('Invalid tenant');
      }

      // Don't allow direct registration to organization tenants
      if (foundTenant.type === TenantType.ORGANIZATION) {
        throw new BadRequestException('This organization requires an invitation to join');
      }

      tenant = foundTenant;
    } else {
      // Public registration - assign to public tenant
      const publicTenant = await this.tenantRepository.findOne({
        where: { type: TenantType.PUBLIC },
      });

      if (!publicTenant) {
        throw new BadRequestException('Registration is currently unavailable. Please contact support.');
      }

      tenant = publicTenant;
    }

    // Check if user already exists in this tenant
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase(), tenantId: tenant.id },
    });

    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const user = this.userRepository.create({
      email: email.toLowerCase(),
      name,
      tenantId: tenant.id,
      passwordHash,
      role,
      groupId,
    });

    const savedUser = await this.userRepository.save(user);

    // Load user with tenant relation
    const userWithTenant = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['tenant'],
    });

    if (!userWithTenant) {
      throw new Error('Failed to create user');
    }

    return userWithTenant;
  }

  async googleLogin(googleProfile: GoogleProfile) {
    // Try to find existing user by email across all tenants
    const existingUser = await this.userRepository.findOne({
      where: { email: googleProfile.email.toLowerCase() },
      relations: ['tenant'],
    });

    if (existingUser) {
      // User exists, log them in
      return this.login(existingUser);
    }

    // User doesn't exist - extract tenant from email domain or create default
    const emailDomain = googleProfile.email.split('@')[1];
    const tenantSubdomain = emailDomain.split('.')[0]; // e.g., company.com -> company

    // Try to find tenant by subdomain
    let tenant = await this.tenantRepository.findOne({
      where: { subdomain: tenantSubdomain },
    });

    // If tenant doesn't exist, create it automatically
    if (!tenant) {
      const newTenant = this.tenantRepository.create({
        name: tenantSubdomain.charAt(0).toUpperCase() + tenantSubdomain.slice(1),
        subdomain: tenantSubdomain,
        isActive: true,
        settings: {
          maxUsers: 10,
          features: ['basic'],
          customization: {
            theme: 'default',
          },
        },
      });

      tenant = await this.tenantRepository.save(newTenant);
    }

    if (!tenant.isActive) {
      throw new UnauthorizedException('Tenant is inactive');
    }

    // Check if this is the first user in the tenant (make them ADMIN)
    const userCount = await this.userRepository.count({
      where: { tenantId: tenant.id },
    });
    const isFirstUser = userCount === 0;

    // Create new user
    const newUser = this.userRepository.create({
      email: googleProfile.email.toLowerCase(),
      name: googleProfile.name,
      tenantId: tenant.id,
      role: isFirstUser ? UserRole.ADMIN : UserRole.STUDENT,
      // No password hash for Google OAuth users
    });

    const savedUser = await this.userRepository.save(newUser);

    const user = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['tenant'],
    });

    if (!user) {
      throw new Error('Failed to create user');
    }

    // Generate JWT token and return user data
    return this.login(user);
  }

  /**
   * Handle OAuth login from Auth.js (NextAuth)
   * This endpoint syncs OAuth users with the backend database
   */
  async oauthLogin(oauthData: {
    provider: string;
    providerAccountId: string;
    email: string;
    name?: string;
    image?: string;
  }) {
    // Try to find existing user by email across all tenants
    const existingUser = await this.userRepository.findOne({
      where: { email: oauthData.email.toLowerCase() },
      relations: ['tenant'],
    });

    if (existingUser) {
      // User exists, log them in
      return this.login(existingUser);
    }

    // User doesn't exist - extract tenant from email domain or use public tenant
    const emailDomain = oauthData.email.split('@')[1];
    const tenantSubdomain = emailDomain.split('.')[0];

    // Try to find tenant by subdomain
    let tenant = await this.tenantRepository.findOne({
      where: { subdomain: tenantSubdomain },
    });

    // If tenant doesn't exist, try to find or create public tenant
    if (!tenant) {
      // Try to find public tenant
      tenant = await this.tenantRepository.findOne({
        where: { type: TenantType.PUBLIC },
      });

      // If no public tenant, create one based on email domain
      if (!tenant) {
        const newTenant = this.tenantRepository.create({
          name: tenantSubdomain.charAt(0).toUpperCase() + tenantSubdomain.slice(1),
          subdomain: tenantSubdomain,
          isActive: true,
          type: TenantType.ORGANIZATION,
          settings: {
            maxUsers: 10,
            features: ['basic'],
            customization: {
              theme: 'default',
            },
          },
        });

        tenant = await this.tenantRepository.save(newTenant);
      }
    }

    if (!tenant.isActive) {
      throw new UnauthorizedException('Tenant is inactive');
    }

    // Check if this is the first user in the tenant (make them ADMIN)
    const userCount = await this.userRepository.count({
      where: { tenantId: tenant.id },
    });
    const isFirstUser = userCount === 0;

    // Create new user
    const newUser = this.userRepository.create({
      email: oauthData.email.toLowerCase(),
      name: oauthData.name || oauthData.email.split('@')[0],
      tenantId: tenant.id,
      role: isFirstUser ? UserRole.ADMIN : UserRole.STUDENT,
      // No password hash for OAuth users
    });

    const savedUser = await this.userRepository.save(newUser);

    const user = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['tenant'],
    });

    if (!user) {
      throw new Error('Failed to create user');
    }

    // Generate JWT token and return user data
    return this.login(user);
  }

  /**
   * Impersonate a user (switch to user)
   * Only SUPERADMIN and ADMIN can impersonate users
   */
  async impersonateUser(targetUserId: string, adminUser: { userId: string; email: string; role: string }) {
    // Only SUPERADMIN and ADMIN can impersonate
    if (adminUser.role !== UserRole.SUPERADMIN && adminUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can switch to other users');
    }

    // Find the target user
    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
      relations: ['tenant'],
    });

    if (!targetUser) {
      throw new BadRequestException('User not found');
    }

    // Admin can only impersonate users they manage
    // SuperAdmin can impersonate anyone
    if (adminUser.role === UserRole.ADMIN) {
      const adminUserEntity = await this.userRepository.findOne({
        where: { id: adminUser.userId },
      });

      if (!adminUserEntity) {
        throw new ForbiddenException('Invalid admin user');
      }

      // Admin can only impersonate users in their own tenant
      if (targetUser.tenantId !== adminUserEntity.tenantId) {
        throw new ForbiddenException('You can only switch to users in your organization');
      }

      // Admin cannot impersonate other admins or superadmins
      if (targetUser.role === UserRole.ADMIN || targetUser.role === UserRole.SUPERADMIN) {
        throw new ForbiddenException('You cannot switch to other administrators');
      }
    }

    // SuperAdmin cannot impersonate other SuperAdmins
    if (adminUser.role === UserRole.SUPERADMIN && targetUser.role === UserRole.SUPERADMIN && targetUser.id !== adminUser.userId) {
      throw new ForbiddenException('You cannot switch to other super administrators');
    }

    // Create impersonation token with original admin info
    const payload: ImpersonationJwtPayload = {
      sub: targetUser.id,
      email: targetUser.email,
      tenantId: targetUser.tenantId,
      role: targetUser.role,
      impersonatedBy: adminUser.userId,
      impersonatedByEmail: adminUser.email,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        tenantId: targetUser.tenantId,
      },
      tenant: {
        id: targetUser.tenant.id,
        name: targetUser.tenant.name,
        subdomain: targetUser.tenant.subdomain,
        isActive: targetUser.tenant.isActive,
      },
      impersonation: {
        isImpersonating: true,
        originalUserId: adminUser.userId,
        originalUserEmail: adminUser.email,
      },
    };
  }

  /**
   * Stop impersonation and return to original admin user
   */
  async stopImpersonation(originalUserId: string) {
    const adminUser = await this.userRepository.findOne({
      where: { id: originalUserId },
      relations: ['tenant'],
    });

    if (!adminUser) {
      throw new BadRequestException('Original user not found');
    }

    return this.login(adminUser);
  }
}
