import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { MessagingService } from '../application/services/messaging.service';
import {
  CreateConversationDto,
  SendMessageDto,
  EditMessageDto,
  AddParticipantsDto,
  StartDirectConversationDto,
} from './dto/messaging.dto';
import { ConversationType } from '@/infrastructure/database/entities/conversation.entity';
import { ApiResponse } from '@repo/shared';
import { UserRole } from '@repo/shared';

@Controller('api/messages')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // ============== CONVERSATION ENDPOINTS ==============

  @Post('conversations')
  async createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUser('userId') userId: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const conversation = await this.messagingService.createConversation(dto, userId, tenantId);
    return { success: true, data: conversation };
  }

  @Post('conversations/direct')
  async startDirectConversation(
    @Body() dto: StartDirectConversationDto,
    @CurrentUser('userId') userId: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const conversation = await this.messagingService.getOrCreateDirectConversation(
      userId,
      dto.userId,
      tenantId,
    );
    return { success: true, data: conversation };
  }

  @Get('conversations')
  async getConversations(
    @CurrentUser('userId') userId: string,
    @TenantId() tenantId: string,
    @Query('type') type?: ConversationType,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ApiResponse<any>> {
    const result = await this.messagingService.getUserConversations(userId, tenantId, {
      type,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return { success: true, data: result };
  }

  @Get('conversations/:id')
  async getConversation(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    const conversation = await this.messagingService.getConversationById(id, userId);
    return { success: true, data: conversation };
  }

  @Get('unread-count')
  async getUnreadCount(
    @CurrentUser('userId') userId: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    const count = await this.messagingService.getUnreadCount(userId, tenantId);
    return { success: true, data: { count } };
  }

  // ============== MESSAGE ENDPOINTS ==============

  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') conversationId: string,
    @CurrentUser('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ): Promise<ApiResponse<any>> {
    const result = await this.messagingService.getMessages(conversationId, userId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      before,
    });
    return { success: true, data: result };
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    const message = await this.messagingService.sendMessage(conversationId, dto, userId);
    return { success: true, data: message };
  }

  @Post('conversations/:id/read')
  async markAsRead(
    @Param('id') conversationId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    await this.messagingService.markAsRead(conversationId, userId);
    return { success: true };
  }

  @Put('messages/:id')
  async editMessage(
    @Param('id') messageId: string,
    @Body() dto: EditMessageDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    const message = await this.messagingService.editMessage(messageId, dto.content, userId);
    return { success: true, data: message };
  }

  @Delete('messages/:id')
  async deleteMessage(
    @Param('id') messageId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    await this.messagingService.deleteMessage(messageId, userId);
    return { success: true };
  }

  // ============== PARTICIPANT ENDPOINTS ==============

  @Post('conversations/:id/participants')
  async addParticipants(
    @Param('id') conversationId: string,
    @Body() dto: AddParticipantsDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    await this.messagingService.addParticipants(conversationId, dto.userIds, userId);
    return { success: true };
  }

  @Delete('conversations/:id/participants/:userId')
  async removeParticipant(
    @Param('id') conversationId: string,
    @Param('userId') userIdToRemove: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    await this.messagingService.removeParticipant(conversationId, userIdToRemove, userId);
    return { success: true };
  }

  @Post('conversations/:id/leave')
  async leaveConversation(
    @Param('id') conversationId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    await this.messagingService.leaveConversation(conversationId, userId);
    return { success: true };
  }

  @Post('conversations/:id/mute')
  async toggleMute(
    @Param('id') conversationId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    const isMuted = await this.messagingService.toggleMute(conversationId, userId);
    return { success: true, data: { isMuted } };
  }

  // ============== USER SEARCH ==============

  @Get('users')
  async getAvailableUsers(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @TenantId() tenantId: string,
    @Query('search') search?: string,
  ): Promise<ApiResponse<any>> {
    console.log('GET /api/messages/users:', { userId, tenantId, userRole, search });

    const users = await this.messagingService.getAvailableUsers(userId, tenantId, userRole, search);
    
    console.log('Returning', users.length, 'users');
    
    return { success: true, data: users };
  }
}
