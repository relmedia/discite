import { apiClient } from './client';

export interface Group {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
  leaderId: string;
  trainerId?: string | null;
  leader?: {
    id: string;
    name: string;
    email: string;
  };
  trainer?: {
    id: string;
    name: string;
    email: string;
  } | null;
  members?: {
    id: string;
    name: string;
    email: string;
    role: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupDto {
  name: string;
  description?: string;
  leaderId: string;
}

export interface UpdateGroupDto {
  name?: string;
  description?: string;
  leaderId?: string;
  trainerId?: string | null;
}

export const groupsApi = {
  async getGroups(): Promise<Group[]> {
    const response = await apiClient.get<Group[]>('/api/groups');
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch groups');
    }
    return response.data || [];
  },

  async getGroupById(groupId: string): Promise<Group> {
    const response = await apiClient.get<Group>(`/api/groups/${groupId}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch group');
    }
    return response.data!;
  },

  async getGroupMembers(groupId: string): Promise<Group['members']> {
    const response = await apiClient.get<Group['members']>(`/api/groups/${groupId}/members`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch group members');
    }
    return response.data || [];
  },

  async createGroup(data: CreateGroupDto): Promise<Group> {
    const response = await apiClient.post<Group>('/api/groups', data);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create group');
    }
    return response.data!;
  },

  async updateGroup(groupId: string, data: UpdateGroupDto): Promise<Group> {
    const response = await apiClient.put<Group>(`/api/groups/${groupId}`, data);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update group');
    }
    return response.data!;
  },

  async assignTrainer(groupId: string, trainerId: string): Promise<Group> {
    const response = await apiClient.put<Group>(`/api/groups/${groupId}/assign-trainer`, { trainerId });
    if (!response.success) {
      throw new Error(response.error || 'Failed to assign trainer');
    }
    return response.data!;
  },

  async addStudent(groupId: string, studentId: string): Promise<void> {
    const response = await apiClient.post(`/api/groups/${groupId}/students`, { studentId });
    if (!response.success) {
      throw new Error(response.error || 'Failed to add student to group');
    }
  },

  async removeStudent(groupId: string, studentId: string): Promise<void> {
    const response = await apiClient.delete(`/api/groups/${groupId}/students/${studentId}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to remove student from group');
    }
  },

  async deleteGroup(groupId: string): Promise<void> {
    const response = await apiClient.delete(`/api/groups/${groupId}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete group');
    }
  },
};
