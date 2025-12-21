import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import {
  NotificationEntity,
  NotificationType,
} from '@/infrastructure/database/entities/notification.entity';
import { EmailService } from '@/modules/email/application/services/email.service';
import { EmailTemplateType } from '@/infrastructure/database/entities/email.entity';

export interface CreateNotificationDto {
  userId: string;
  tenantId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  link?: string;
}

// Map notification types to email template types
const NOTIFICATION_TO_EMAIL_TYPE: Partial<Record<NotificationType, EmailTemplateType>> = {
  [NotificationType.COURSE_ENROLLED]: EmailTemplateType.COURSE_ENROLLED,
  [NotificationType.COURSE_COMPLETED]: EmailTemplateType.COURSE_COMPLETED,
  [NotificationType.QUIZ_PASSED]: EmailTemplateType.QUIZ_RESULT,
  [NotificationType.QUIZ_FAILED]: EmailTemplateType.QUIZ_RESULT,
  [NotificationType.CERTIFICATE_ISSUED]: EmailTemplateType.CERTIFICATE_ISSUED,
  [NotificationType.LICENSE_ASSIGNED]: EmailTemplateType.LICENSE_ASSIGNED,
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    @Inject(forwardRef(() => EmailService))
    private readonly emailService: EmailService,
  ) {}

  // Create a new notification
  async create(dto: CreateNotificationDto): Promise<NotificationEntity> {
    const notification = this.notificationRepository.create(dto);
    return this.notificationRepository.save(notification);
  }

  // Create multiple notifications (e.g., for bulk actions)
  async createMany(dtos: CreateNotificationDto[]): Promise<NotificationEntity[]> {
    const notifications = this.notificationRepository.create(dtos);
    return this.notificationRepository.save(notifications);
  }

  // Get notifications for a user
  async getUserNotifications(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    },
  ): Promise<{ notifications: NotificationEntity[]; total: number; unreadCount: number }> {
    const { limit = 20, offset = 0, unreadOnly = false } = options || {};

    const whereCondition: any = { userId };
    if (unreadOnly) {
      whereCondition.isRead = false;
    }

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: whereCondition,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    const unreadCount = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });

    return { notifications, total, unreadCount };
  }

  // Get unread count for a user
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  // Mark a notification as read
  async markAsRead(notificationId: string, userId: string): Promise<NotificationEntity | null> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return null;
    }

    notification.isRead = true;
    notification.readAt = new Date();
    return this.notificationRepository.save(notification);
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return result.affected || 0;
  }

  // Delete a notification
  async delete(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.notificationRepository.delete({
      id: notificationId,
      userId,
    });
    return (result.affected || 0) > 0;
  }

  // Delete all read notifications older than a certain date
  async deleteOldReadNotifications(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.notificationRepository.delete({
      isRead: true,
      createdAt: LessThan(cutoffDate),
    });
    return result.affected || 0;
  }

  // Private helper to send email notifications
  private async sendEmailNotification(
    tenantId: string,
    userEmail: string,
    userName: string | undefined,
    userId: string,
    type: NotificationType,
    variables: Record<string, any>,
  ): Promise<void> {
    try {
      // Get email settings to check if this notification type should send email
      const settings = await this.emailService.getSettings(tenantId);
      
      if (!settings?.isEnabled) {
        return; // Email not enabled
      }

      const emailType = NOTIFICATION_TO_EMAIL_TYPE[type];
      if (!emailType) {
        return; // No email template for this notification type
      }

      // Check notification settings
      const notifSettings = settings.notificationSettings;
      if (notifSettings) {
        const shouldSendEmail = 
          (type === NotificationType.COURSE_ENROLLED && notifSettings.courseEnrolled) ||
          (type === NotificationType.COURSE_COMPLETED && notifSettings.courseCompleted) ||
          ((type === NotificationType.QUIZ_PASSED || type === NotificationType.QUIZ_FAILED) && notifSettings.quizResult) ||
          (type === NotificationType.CERTIFICATE_ISSUED && notifSettings.certificateIssued) ||
          (type === NotificationType.LICENSE_ASSIGNED && notifSettings.licenseAssigned);

        if (!shouldSendEmail) {
          return;
        }
      }

      // Send the email
      await this.emailService.sendTemplatedEmail(tenantId, {
        to: userEmail,
        toName: userName,
        userId,
        templateType: emailType,
        variables,
      });
    } catch (error) {
      this.logger.error(`Failed to send email notification: ${error}`);
      // Don't throw - email failure shouldn't break the notification flow
    }
  }

  // Helper methods for creating specific notification types
  async notifyCourseEnrolled(
    userId: string,
    tenantId: string,
    courseName: string,
    courseId: string,
    userEmail?: string,
    userName?: string,
  ): Promise<NotificationEntity> {
    const notification = await this.create({
      userId,
      tenantId,
      type: NotificationType.COURSE_ENROLLED,
      title: 'Course Enrollment',
      message: `You have been enrolled in "${courseName}"`,
      data: { courseId, courseName },
      link: `/dashboard/courses/${courseId}`,
    });

    // Send email notification if email is provided
    if (userEmail) {
      await this.sendEmailNotification(tenantId, userEmail, userName, userId, NotificationType.COURSE_ENROLLED, {
        userName: userName || 'Student',
        courseName,
        courseId,
        courseUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/courses/${courseId}`,
      });
    }

    return notification;
  }

  async notifyCourseCompleted(
    userId: string,
    tenantId: string,
    courseName: string,
    courseId: string,
    userEmail?: string,
    userName?: string,
  ): Promise<NotificationEntity> {
    const notification = await this.create({
      userId,
      tenantId,
      type: NotificationType.COURSE_COMPLETED,
      title: 'Course Completed',
      message: `Congratulations! You have completed "${courseName}"`,
      data: { courseId, courseName },
      link: `/dashboard/courses/${courseId}`,
    });

    if (userEmail) {
      await this.sendEmailNotification(tenantId, userEmail, userName, userId, NotificationType.COURSE_COMPLETED, {
        userName: userName || 'Student',
        courseName,
        courseId,
        completionDate: new Date().toLocaleDateString(),
      });
    }

    return notification;
  }

  async notifyQuizResult(
    userId: string,
    tenantId: string,
    quizTitle: string,
    quizId: string,
    courseId: string,
    passed: boolean,
    score: number,
    userEmail?: string,
    userName?: string,
  ): Promise<NotificationEntity> {
    const notificationType = passed ? NotificationType.QUIZ_PASSED : NotificationType.QUIZ_FAILED;
    
    const notification = await this.create({
      userId,
      tenantId,
      type: notificationType,
      title: passed ? 'Quiz Passed' : 'Quiz Failed',
      message: passed
        ? `You passed "${quizTitle}" with a score of ${score}%`
        : `You did not pass "${quizTitle}". Score: ${score}%`,
      data: { quizId, quizTitle, courseId, passed, score },
      link: `/dashboard/courses/${courseId}/quizzes/${quizId}`,
    });

    if (userEmail) {
      await this.sendEmailNotification(tenantId, userEmail, userName, userId, notificationType, {
        userName: userName || 'Student',
        quizTitle,
        score,
        passed,
        result: passed ? 'Passed' : 'Failed',
        courseId,
      });
    }

    return notification;
  }

  async notifyCertificateIssued(
    userId: string,
    tenantId: string,
    courseName: string,
    certificateId: string,
    userEmail?: string,
    userName?: string,
  ): Promise<NotificationEntity> {
    const notification = await this.create({
      userId,
      tenantId,
      type: NotificationType.CERTIFICATE_ISSUED,
      title: 'Certificate Issued',
      message: `Your certificate for "${courseName}" has been issued`,
      data: { certificateId, courseName },
      link: `/dashboard/certificates`,
    });

    if (userEmail) {
      await this.sendEmailNotification(tenantId, userEmail, userName, userId, NotificationType.CERTIFICATE_ISSUED, {
        userName: userName || 'Student',
        courseName,
        certificateId,
        certificateUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/certificates`,
        issueDate: new Date().toLocaleDateString(),
      });
    }

    return notification;
  }

  async notifyLicenseAssigned(
    userId: string,
    tenantId: string,
    courseName: string,
    courseId: string,
    userEmail?: string,
    userName?: string,
  ): Promise<NotificationEntity> {
    const notification = await this.create({
      userId,
      tenantId,
      type: NotificationType.LICENSE_ASSIGNED,
      title: 'Course Access Granted',
      message: `You have been granted access to "${courseName}"`,
      data: { courseId, courseName },
      link: `/dashboard/courses/my-courses`,
    });

    if (userEmail) {
      await this.sendEmailNotification(tenantId, userEmail, userName, userId, NotificationType.LICENSE_ASSIGNED, {
        userName: userName || 'Student',
        courseName,
        courseId,
        courseUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/courses/my-courses`,
      });
    }

    return notification;
  }
}
