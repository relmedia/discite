import { apiClient } from './client';

export type NotificationType =
  | 'course_enrolled'
  | 'course_completed'
  | 'quiz_passed'
  | 'quiz_failed'
  | 'certificate_issued'
  | 'license_assigned'
  | 'invitation_received'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  tenantId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  link?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

export const notificationsApi = {
  // Get user's notifications
  async getNotifications(options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationsResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.unreadOnly) params.append('unreadOnly', 'true');

    const queryString = params.toString();
    const endpoint = `/api/notifications${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<NotificationsResponse>(endpoint);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to load notifications');
    }
    return response.data;
  },

  // Get unread count
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ count: number }>('/api/notifications/unread-count');
    if (!response.success || !response.data) {
      return 0;
    }
    return response.data.count;
  },

  // Mark a notification as read
  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await apiClient.post<Notification>(
      `/api/notifications/${notificationId}/read`,
      {}
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to mark notification as read');
    }
    return response.data;
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<number> {
    const response = await apiClient.post<{ markedCount: number }>(
      '/api/notifications/read-all',
      {}
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to mark all as read');
    }
    return response.data.markedCount;
  },

  // Delete a notification
  async deleteNotification(notificationId: string): Promise<void> {
    const response = await apiClient.delete(`/api/notifications/${notificationId}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete notification');
    }
  },
};
