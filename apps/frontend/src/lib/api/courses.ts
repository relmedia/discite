import { Course, Enrollment, ApiResponse, CourseLevel, Lesson, Quiz, LicenseType, LicenseOption } from '@repo/shared';
import { apiClient } from './client';

export interface CurriculumItem {
  id: string;
  type: 'lesson' | 'quiz';
  orderIndex: number;
}

export interface CurriculumData {
  lessons: Lesson[];
  quizzes: Quiz[];
}

export interface CreateCourseData {
  title: string;
  description: string;
  instructorId: string;
  level?: CourseLevel;
  durationHours?: number;
  thumbnailUrl?: string;
  tags?: string[];
  // Marketplace fields
  listOnMarketplace?: boolean;
  category?: string;
  basePrice?: number;
  currency?: string;
  isFree?: boolean;
  licenseOptions?: LicenseOption[];
  includesCertificate?: boolean;
}

export interface UpdateCourseData extends Partial<CreateCourseData> {
  // Certificate settings
  enableCertificate?: boolean;
  certificateTemplateId?: string;
  certificateExpiryMonths?: number;
  includeGradeOnCertificate?: boolean;
}

export const coursesApi = {
  async createCourse(data: CreateCourseData): Promise<Course> {
    const response = await apiClient.post<Course>('/api/courses', data);
    if (!response.success) {
      throw new Error(response.error || response.message || 'Failed to create course');
    }
    return response.data!;
  },

  async getCourses(filters?: {
    status?: string;
    level?: string;
  }): Promise<Course[]> {
    const params = new URLSearchParams(filters as any);
    const response = await apiClient.get<Course[]>(`/api/courses?${params}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch courses');
    }
    return response.data!;
  },

  async getCourseById(id: string): Promise<Course> {
    const response = await apiClient.get<Course>(`/api/courses/${id}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch course');
    }
    return response.data!;
  },

  async updateCourse(
    id: string,
    data: UpdateCourseData,
  ): Promise<Course> {
    const response = await apiClient.put<Course>(`/api/courses/${id}`, data);
    if (!response.success) {
      throw new Error(response.error || response.message || 'Failed to update course');
    }
    return response.data!;
  },

  async publishCourse(id: string): Promise<Course> {
    const response = await apiClient.post<Course>(`/api/courses/${id}/publish`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to publish course');
    }
    return response.data!;
  },

  async enrollInCourse(courseId: string): Promise<Enrollment> {
    const response = await apiClient.post<Enrollment>('/api/enrollments', { courseId });
    if (!response.success) {
      throw new Error(response.error || response.message || 'Failed to enroll');
    }
    return response.data!;
  },

  async getMyEnrollments(): Promise<Enrollment[]> {
    const response = await apiClient.get<Enrollment[]>('/api/enrollments/my-courses');
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch enrollments');
    }
    return response.data!;
  },

  async deleteCourse(id: string): Promise<void> {
    const response = await apiClient.delete<void>(`/api/courses/${id}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete course');
    }
  },

  async unpublishCourse(id: string): Promise<Course> {
    const response = await apiClient.post<Course>(`/api/courses/${id}/unpublish`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to unpublish course');
    }
    return response.data!;
  },

  async updateLessonProgress(
    enrollmentId: string,
    lessonId: string,
    completed: boolean,
  ): Promise<Enrollment> {
    const response = await apiClient.put<Enrollment>(
      `/api/enrollments/${enrollmentId}/progress`,
      { lessonId, completed }
    );
    if (!response.success) {
      throw new Error(response.error || 'Failed to update lesson progress');
    }
    return response.data!;
  },

  async getCurriculum(courseId: string): Promise<CurriculumData> {
    const response = await apiClient.get<CurriculumData>(`/api/courses/${courseId}/curriculum`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch curriculum');
    }
    return response.data!;
  },

  async reorderCurriculum(courseId: string, items: CurriculumItem[]): Promise<void> {
    const response = await apiClient.post<void>(`/api/courses/${courseId}/curriculum/reorder`, { items });
    if (!response.success) {
      throw new Error(response.error || 'Failed to reorder curriculum');
    }
  },
};
