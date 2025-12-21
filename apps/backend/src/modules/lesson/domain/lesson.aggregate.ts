import { LessonType } from '@repo/shared';
import { LessonEntity } from '@/infrastructure/database/entities/lesson.entity';

export class LessonAggregate {
  static create(data: {
    title: string;
    content?: string;
    courseId: string;
    tenantId: string;
    type: LessonType;
    videoUrl?: string;
    documentUrl?: string;
    durationMinutes?: number;
  }) {
    return {
      title: data.title.trim(),
      content: data.content?.trim(),
      courseId: data.courseId,
      tenantId: data.tenantId,
      type: data.type,
      videoUrl: data.videoUrl?.trim(),
      documentUrl: data.documentUrl?.trim(),
      orderIndex: 0, // Will be set by service
      durationMinutes: data.durationMinutes || 0,
      isPublished: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  static publish(lesson: LessonEntity): void {
    lesson.isPublished = true;
    lesson.updatedAt = new Date();
  }

  static unpublish(lesson: LessonEntity): void {
    lesson.isPublished = false;
    lesson.updatedAt = new Date();
  }
}
