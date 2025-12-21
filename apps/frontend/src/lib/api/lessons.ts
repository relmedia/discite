import { apiClient } from './client';
import { Lesson, LessonType, LessonWithAccess } from '@repo/shared';

export interface CreateLessonData {
  title: string;
  content?: string;
  courseId: string;
  type: LessonType;
  videoUrl?: string;
  documentUrl?: string;
  durationMinutes?: number;
}

export interface UpdateLessonData {
  title?: string;
  content?: string;
  type?: LessonType;
  videoUrl?: string;
  documentUrl?: string;
  durationMinutes?: number;
}

export interface ReorderLessonsData {
  lessons: Array<{ id: string; orderIndex: number }>;
}

export const lessonsApi = {
  async createLesson(data: CreateLessonData): Promise<Lesson> {
    const response = await apiClient.post<Lesson>('/api/lessons', data);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create lesson');
    }
    return response.data!;
  },

  async getLessonsByCourse(courseId: string): Promise<LessonWithAccess[]> {
    const response = await apiClient.get<LessonWithAccess[]>(
      `/api/lessons?courseId=${courseId}`
    );
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch lessons');
    }
    return response.data!;
  },

  async getLessonById(id: string): Promise<Lesson> {
    const response = await apiClient.get<Lesson>(`/api/lessons/${id}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch lesson');
    }
    return response.data!;
  },

  async updateLesson(id: string, data: UpdateLessonData): Promise<Lesson> {
    const response = await apiClient.put<Lesson>(`/api/lessons/${id}`, data);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update lesson');
    }
    return response.data!;
  },

  async publishLesson(id: string): Promise<Lesson> {
    const response = await apiClient.post<Lesson>(`/api/lessons/${id}/publish`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to publish lesson');
    }
    return response.data!;
  },

  async unpublishLesson(id: string): Promise<Lesson> {
    const response = await apiClient.post<Lesson>(`/api/lessons/${id}/unpublish`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to unpublish lesson');
    }
    return response.data!;
  },

  async deleteLesson(id: string): Promise<void> {
    const response = await apiClient.delete<void>(`/api/lessons/${id}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete lesson');
    }
  },

  async reorderLessons(courseId: string, data: ReorderLessonsData): Promise<void> {
    const response = await apiClient.post<void>(`/api/lessons/courses/${courseId}/reorder`, data);
    if (!response.success) {
      throw new Error(response.error || 'Failed to reorder lessons');
    }
  },

  // File uploads (to be implemented in Sprint 3)
  async uploadVideo(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ url: string }>(
      '/api/upload/video',
      formData,
      { 'Content-Type': 'multipart/form-data' }
    );
    if (!response.success) {
      throw new Error(response.error || 'Failed to upload video');
    }
    return response.data!;
  },

  async uploadDocument(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ url: string }>(
      '/api/upload/document',
      formData,
      { 'Content-Type': 'multipart/form-data' }
    );
    if (!response.success) {
      throw new Error(response.error || 'Failed to upload document');
    }
    return response.data!;
  },
};
