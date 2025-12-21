import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from '../application/services/notification.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { ApiResponse } from '@repo/shared';

@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // Get user's notifications
  @Get()
  async getNotifications(
    @CurrentUser('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ): Promise<ApiResponse<any>> {
    const result = await this.notificationService.getUserNotifications(userId, {
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
      unreadOnly: unreadOnly === 'true',
    });

    return {
      success: true,
      data: result,
    };
  }

  // Get unread count
  @Get('unread-count')
  async getUnreadCount(
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    const count = await this.notificationService.getUnreadCount(userId);

    return {
      success: true,
      data: { count },
    };
  }

  // Mark a notification as read
  @Post(':id/read')
  async markAsRead(
    @Param('id') notificationId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    const notification = await this.notificationService.markAsRead(
      notificationId,
      userId,
    );

    if (!notification) {
      return {
        success: false,
        error: 'Notification not found',
      };
    }

    return {
      success: true,
      data: notification,
    };
  }

  // Mark all notifications as read
  @Post('read-all')
  async markAllAsRead(
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    const count = await this.notificationService.markAllAsRead(userId);

    return {
      success: true,
      data: { markedCount: count },
    };
  }

  // Delete a notification
  @Delete(':id')
  async deleteNotification(
    @Param('id') notificationId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    const deleted = await this.notificationService.delete(notificationId, userId);

    if (!deleted) {
      return {
        success: false,
        error: 'Notification not found',
      };
    }

    return {
      success: true,
      message: 'Notification deleted',
    };
  }
}
