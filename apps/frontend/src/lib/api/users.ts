import { apiClient } from './client';
import { UserRole } from '@repo/shared';

export interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  role: UserRole;
  groupId?: string | null;
  group?: {
    id: string;
    name: string;
  };
  tenant?: {
    id: string;
    name: string;
    subdomain: string;
    type: 'PUBLIC' | 'ORGANIZATION';
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  role?: UserRole;
  tenantId?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  role?: UserRole;
  groupId?: string | null;
  tenantId?: string;
}

export interface UserEnrollment {
  id: string;
  courseId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DROPPED';
  progressPercentage: number;
  enrolledAt: string;
  completedAt?: string;
  lastAccessedAt?: string;
  course: {
    id: string;
    title: string;
    thumbnailUrl?: string;
  };
  lessonProgress: {
    lessonId: string;
    completed: boolean;
    completedAt?: string;
    timeSpentMinutes: number;
  }[];
}

export const usersApi = {
  async createUser(data: CreateUserDto): Promise<User> {
    const response = await apiClient.post<User>('/api/users', data);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create user');
    }
    return response.data!;
  },

  async getUsers(): Promise<User[]> {
    const response = await apiClient.get<User[]>('/api/users');
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch users');
    }
    return response.data || [];
  },

  async getUserById(userId: string): Promise<User> {
    const response = await apiClient.get<User>(`/api/users/${userId}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch user');
    }
    return response.data!;
  },

  async updateUser(userId: string, data: UpdateUserDto): Promise<User> {
    const response = await apiClient.put<User>(`/api/users/${userId}`, data);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update user');
    }
    return response.data!;
  },

  async deleteUser(userId: string): Promise<void> {
    const response = await apiClient.delete(`/api/users/${userId}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete user');
    }
  },

  async resetUserCourseData(
    userId: string, 
    courseIds: string[],
    deleteCertificates: boolean = false
  ): Promise<void> {
    const response = await apiClient.post(`/api/users/${userId}/reset-course-data`, {
      courseIds,
      deleteCertificates,
    });
    if (!response.success) {
      throw new Error(response.error || 'Failed to reset user course data');
    }
  },

  async getUserEnrollments(userId: string): Promise<UserEnrollment[]> {
    const response = await apiClient.get<UserEnrollment[]>(`/api/users/${userId}/enrollments`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch user enrollments');
    }
    return response.data || [];
  },
};

