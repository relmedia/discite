import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { InvitationEntity, InvitationStatus } from '@/infrastructure/database/entities/invitation.entity';
import { TenantEntity } from '@/infrastructure/database/entities/tenant.entity';
import { UserEntity } from '@/infrastructure/database/entities/user.entity';
import { GroupEntity } from '@/infrastructure/database/entities/group.entity';
import { CreateInvitationDto, BulkInviteDto } from '../../presentation/dto/create-invitation.dto';
import { UserRole } from '@repo/shared';
import { TenantType } from '@/infrastructure/database/entities/tenant.entity';

@Injectable()
export class InvitationService {
  constructor(
    @InjectRepository(InvitationEntity)
    private readonly invitationRepository: Repository<InvitationEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(GroupEntity)
    private readonly groupRepository: Repository<GroupEntity>,
  ) {}

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private getExpirationDate(days: number = 7): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  async createInvitation(
    tenantId: string,
    inviterId: string,
    dto: CreateInvitationDto,
  ): Promise<InvitationEntity> {
    // Verify tenant exists and is not the public tenant
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.type === TenantType.PUBLIC) {
      throw new BadRequestException('Cannot invite users to the public tenant');
    }

    // Check if user already exists in this tenant
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase(), tenantId },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists in this tenant');
    }

    // Check for existing pending invitation
    const existingInvitation = await this.invitationRepository.findOne({
      where: {
        email: dto.email.toLowerCase(),
        tenantId,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      // Resend existing invitation by updating expiration
      existingInvitation.expiresAt = this.getExpirationDate();
      existingInvitation.token = this.generateToken();
      existingInvitation.message = dto.message || existingInvitation.message;
      return this.invitationRepository.save(existingInvitation);
    }

    // Validate group if provided
    if (dto.groupId) {
      const group = await this.groupRepository.findOne({
        where: { id: dto.groupId, tenantId },
      });
      if (!group) {
        throw new NotFoundException('Group not found');
      }
    }

    // Create new invitation
    const invitation = this.invitationRepository.create({
      email: dto.email.toLowerCase(),
      tenantId,
      role: dto.role || UserRole.STUDENT,
      groupId: dto.groupId || null,
      token: this.generateToken(),
      expiresAt: this.getExpirationDate(),
      invitedById: inviterId,
      message: dto.message,
      status: InvitationStatus.PENDING,
    });

    return this.invitationRepository.save(invitation);
  }

  async bulkInvite(
    tenantId: string,
    inviterId: string,
    dto: BulkInviteDto,
  ): Promise<{ sent: string[]; skipped: string[]; errors: string[] }> {
    const results = {
      sent: [] as string[],
      skipped: [] as string[],
      errors: [] as string[],
    };

    for (const email of dto.emails) {
      try {
        await this.createInvitation(tenantId, inviterId, {
          email,
          role: dto.role,
          groupId: dto.groupId,
          message: dto.message,
        });
        results.sent.push(email);
      } catch (error) {
        if (error instanceof BadRequestException) {
          results.skipped.push(email);
        } else {
          results.errors.push(email);
        }
      }
    }

    return results;
  }

  async getInvitationsByTenant(tenantId: string): Promise<InvitationEntity[]> {
    return this.invitationRepository.find({
      where: { tenantId },
      relations: ['invitedBy', 'group'],
      order: { createdAt: 'DESC' },
    });
  }

  async getPendingInvitations(tenantId: string): Promise<InvitationEntity[]> {
    return this.invitationRepository.find({
      where: { tenantId, status: InvitationStatus.PENDING },
      relations: ['invitedBy', 'group'],
      order: { createdAt: 'DESC' },
    });
  }

  async getInvitationByToken(token: string): Promise<InvitationEntity | null> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['tenant', 'group'],
    });

    if (!invitation) {
      return null;
    }

    // Check if expired
    if (invitation.expiresAt < new Date()) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      return null;
    }

    return invitation;
  }

  async validateInvitation(token: string): Promise<{
    valid: boolean;
    invitation?: InvitationEntity;
    message?: string;
  }> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['tenant', 'group'],
    });

    if (!invitation) {
      return { valid: false, message: 'Invitation not found' };
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      return { valid: false, message: 'Invitation already used' };
    }

    if (invitation.status === InvitationStatus.CANCELLED) {
      return { valid: false, message: 'Invitation was cancelled' };
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      return { valid: false, message: 'Invitation has expired' };
    }

    if (!invitation.tenant.isActive) {
      return { valid: false, message: 'Organization is no longer active' };
    }

    return { valid: true, invitation };
  }

  async acceptInvitation(token: string): Promise<InvitationEntity> {
    const result = await this.validateInvitation(token);

    if (!result.valid || !result.invitation) {
      throw new BadRequestException(result.message || 'Invalid invitation');
    }

    result.invitation.status = InvitationStatus.ACCEPTED;
    result.invitation.acceptedAt = new Date();

    return this.invitationRepository.save(result.invitation);
  }

  async cancelInvitation(
    tenantId: string,
    invitationId: string,
  ): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId, tenantId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending invitations');
    }

    invitation.status = InvitationStatus.CANCELLED;
    await this.invitationRepository.save(invitation);
  }

  async resendInvitation(
    tenantId: string,
    invitationId: string,
  ): Promise<InvitationEntity> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId, tenantId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException('Invitation was already accepted');
    }

    // Reset invitation
    invitation.token = this.generateToken();
    invitation.expiresAt = this.getExpirationDate();
    invitation.status = InvitationStatus.PENDING;

    return this.invitationRepository.save(invitation);
  }

  async deleteInvitation(tenantId: string, invitationId: string): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId, tenantId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    await this.invitationRepository.remove(invitation);
  }
}

