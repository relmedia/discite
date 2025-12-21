import { apiClient } from './client';
import { UserRole } from '@repo/shared';

export interface Invitation {
  id: string;
  email: string;
  tenantId: string;
  role: UserRole;
  groupId: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';
  token: string;
  expiresAt: string;
  invitedById: string | null;
  invitedBy?: {
    id: string;
    name: string;
    email: string;
  };
  group?: {
    id: string;
    name: string;
  };
  message: string | null;
  createdAt: string;
  acceptedAt: string | null;
}

export interface CreateInvitationDto {
  email: string;
  role?: UserRole;
  groupId?: string;
  message?: string;
}

export interface BulkInviteDto {
  emails: string[];
  role?: UserRole;
  groupId?: string;
  message?: string;
}

export interface BulkInviteResult {
  sent: string[];
  skipped: string[];
  errors: string[];
}

export interface InvitationValidation {
  email: string;
  tenantName: string;
  role: UserRole;
  groupName?: string;
  message?: string;
}

export const invitationsApi = {
  async createInvitation(data: CreateInvitationDto): Promise<Invitation> {
    const response = await apiClient.post<Invitation>('/api/invitations', data);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create invitation');
    }
    return response.data;
  },

  async bulkInvite(data: BulkInviteDto): Promise<BulkInviteResult> {
    const response = await apiClient.post<BulkInviteResult>('/api/invitations/bulk', data);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to send invitations');
    }
    return response.data;
  },

  async getInvitations(): Promise<Invitation[]> {
    const response = await apiClient.get<Invitation[]>('/api/invitations');
    if (!response.success) {
      throw new Error(response.error || 'Failed to load invitations');
    }
    return response.data || [];
  },

  async getPendingInvitations(): Promise<Invitation[]> {
    const response = await apiClient.get<Invitation[]>('/api/invitations/pending');
    if (!response.success) {
      throw new Error(response.error || 'Failed to load invitations');
    }
    return response.data || [];
  },

  async validateInvitation(token: string): Promise<{ success: boolean; data?: InvitationValidation; message?: string }> {
    try {
      const response = await apiClient.get<InvitationValidation | { message: string }>(`/api/invitations/validate/${token}`);
      
      // Check if response indicates failure
      if (!response.success) {
        return { success: false, message: response.error || 'Invalid invitation' };
      }
      
      // Check if data has a message property (error response from backend)
      const data = response.data as any;
      if (data && 'message' in data && !('email' in data)) {
        return { success: false, message: data.message };
      }
      
      return { success: true, data: response.data as InvitationValidation };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to validate invitation' };
    }
  },

  async resendInvitation(invitationId: string): Promise<Invitation> {
    const response = await apiClient.post<Invitation>(`/api/invitations/${invitationId}/resend`, {});
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to resend invitation');
    }
    return response.data;
  },

  async cancelInvitation(invitationId: string): Promise<void> {
    const response = await apiClient.post<void>(`/api/invitations/${invitationId}/cancel`, {});
    if (!response.success) {
      throw new Error(response.error || 'Failed to cancel invitation');
    }
  },

  async deleteInvitation(invitationId: string): Promise<void> {
    const response = await apiClient.delete(`/api/invitations/${invitationId}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete invitation');
    }
  },
};

