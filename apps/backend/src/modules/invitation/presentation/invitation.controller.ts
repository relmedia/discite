import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { InvitationService } from '../application/services/invitation.service';
import { CreateInvitationDto, BulkInviteDto } from './dto/create-invitation.dto';
import { UserRole } from '@repo/shared';

@Controller('api/invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async createInvitation(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateInvitationDto,
  ) {
    const invitation = await this.invitationService.createInvitation(
      tenantId,
      user.id,
      dto,
    );
    return { success: true, data: invitation };
  }

  @Post('bulk')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async bulkInvite(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: BulkInviteDto,
  ) {
    const results = await this.invitationService.bulkInvite(
      tenantId,
      user.id,
      dto,
    );
    return { success: true, data: results };
  }

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async getInvitations(@TenantId() tenantId: string) {
    const invitations = await this.invitationService.getInvitationsByTenant(tenantId);
    return { success: true, data: invitations };
  }

  @Get('pending')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async getPendingInvitations(@TenantId() tenantId: string) {
    const invitations = await this.invitationService.getPendingInvitations(tenantId);
    return { success: true, data: invitations };
  }

  @Get('validate/:token')
  @Public()
  async validateInvitation(@Param('token') token: string) {
    const result = await this.invitationService.validateInvitation(token);
    
    if (!result.valid) {
      return { success: false, message: result.message };
    }

    return {
      success: true,
      data: {
        email: result.invitation!.email,
        tenantName: result.invitation!.tenant.name,
        role: result.invitation!.role,
        groupName: result.invitation!.group?.name,
        message: result.invitation!.message,
      },
    };
  }

  @Post(':id/resend')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async resendInvitation(
    @TenantId() tenantId: string,
    @Param('id') invitationId: string,
  ) {
    const invitation = await this.invitationService.resendInvitation(
      tenantId,
      invitationId,
    );
    return { success: true, data: invitation };
  }

  @Post(':id/cancel')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async cancelInvitation(
    @TenantId() tenantId: string,
    @Param('id') invitationId: string,
  ) {
    await this.invitationService.cancelInvitation(tenantId, invitationId);
    return { success: true, message: 'Invitation cancelled' };
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async deleteInvitation(
    @TenantId() tenantId: string,
    @Param('id') invitationId: string,
  ) {
    await this.invitationService.deleteInvitation(tenantId, invitationId);
    return { success: true, message: 'Invitation deleted' };
  }
}

