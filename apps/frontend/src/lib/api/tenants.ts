import { apiClient } from './client';
import { DomainVerificationInstructions } from '@repo/shared';

// Re-export Tenant type for backward compatibility
export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  type?: string;
  isActive: boolean;
  settings?: {
    maxUsers: number;
    features: string[];
    customization: {
      theme: string;
      logo?: string;
    };
  };
  customDomain?: string | null;
  customDomainVerified?: boolean;
  customDomainVerificationToken?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantDto {
  name: string;
  subdomain: string;
  settings?: Partial<Tenant['settings']>;
}

export interface UpdateTenantDto {
  name?: string;
  isActive?: boolean;
  settings?: Partial<Tenant['settings']>;
  customDomain?: string;
}

export interface SetCustomDomainResponse {
  tenant: Tenant;
  verificationInstructions: DomainVerificationInstructions;
}

export interface VerifyDomainResponse {
  verified: boolean;
  message: string;
}

export const tenantsApi = {
  /**
   * Get all tenants (SUPERADMIN only)
   */
  async getAllTenants(): Promise<Tenant[]> {
    const response = await apiClient.get<Tenant[]>('/api/tenants');
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch tenants');
    }
    return response.data;
  },

  /**
   * Get tenant by ID
   */
  async getTenantById(id: string): Promise<Tenant> {
    const response = await apiClient.get<Tenant>(`/api/tenants/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch tenant');
    }
    return response.data;
  },

  /**
   * Create a new tenant
   */
  async createTenant(data: CreateTenantDto): Promise<Tenant> {
    const response = await apiClient.post<Tenant>('/api/tenants', data);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create tenant');
    }
    return response.data;
  },

  /**
   * Update tenant
   */
  async updateTenant(id: string, data: UpdateTenantDto): Promise<Tenant> {
    const response = await apiClient.put<Tenant>(`/api/tenants/${id}`, data);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update tenant');
    }
    return response.data;
  },

  /**
   * Delete tenant
   */
  async deleteTenant(id: string): Promise<void> {
    const response = await apiClient.delete<void>(`/api/tenants/${id}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete tenant');
    }
  },

  /**
   * Set custom domain for a tenant
   */
  async setCustomDomain(tenantId: string, customDomain: string): Promise<SetCustomDomainResponse> {
    const response = await apiClient.put<SetCustomDomainResponse>(
      `/api/tenants/${tenantId}/custom-domain`,
      { customDomain }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to set custom domain');
    }
    return response.data;
  },

  /**
   * Remove custom domain from a tenant
   */
  async removeCustomDomain(tenantId: string): Promise<Tenant> {
    const response = await apiClient.delete<Tenant>(`/api/tenants/${tenantId}/custom-domain`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to remove custom domain');
    }
    return response.data;
  },

  /**
   * Verify custom domain ownership via DNS
   */
  async verifyCustomDomain(tenantId: string): Promise<VerifyDomainResponse> {
    const response = await apiClient.post<VerifyDomainResponse>(
      `/api/tenants/${tenantId}/custom-domain/verify`,
      {}
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to verify domain');
    }
    return response.data;
  },

  /**
   * Get verification instructions for a tenant's custom domain
   */
  async getVerificationInstructions(tenantId: string): Promise<DomainVerificationInstructions | null> {
    const response = await apiClient.get<DomainVerificationInstructions | null>(
      `/api/tenants/${tenantId}/custom-domain/instructions`
    );
    if (!response.success) {
      throw new Error(response.error || 'Failed to get verification instructions');
    }
    return response.data || null;
  },

  /**
   * Get tenant by custom domain (public endpoint)
   */
  async getTenantByDomain(domain: string): Promise<Tenant | null> {
    const response = await apiClient.get<Tenant>(
      `/api/tenants/by-domain/${encodeURIComponent(domain)}`
    );
    if (!response.success) {
      return null;
    }
    return response.data || null;
  },
};
