import { apiClient, ApiResponse } from './client';

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenantId?: string;
  tenantSubdomain?: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
  tenantSubdomain?: string;
  invitationToken?: string;
}

export interface AuthResponse {
  user: User;
  tenant: Tenant;
  token?: string;
}

export interface ImpersonationInfo {
  isImpersonating: boolean;
  originalUserId: string;
  originalUserEmail: string;
}

export interface ImpersonationResponse extends AuthResponse {
  impersonation?: ImpersonationInfo;
}

export const authApi = {
  /**
   * Get all tenants (SUPERADMIN only)
   */
  async getTenants(): Promise<ApiResponse<Tenant[]>> {
    return apiClient.get<Tenant[]>('/api/tenants');
  },

  /**
   * Get tenant by subdomain
   */
  async getTenantBySubdomain(subdomain: string): Promise<ApiResponse<Tenant>> {
    // Get all tenants and find by subdomain
    const response = await this.getTenants();

    if (!response.success || !response.data) {
      return {
        success: false,
        error: 'Failed to fetch tenants',
      };
    }

    const tenant = response.data.find((t) => t.subdomain === subdomain);

    if (!tenant) {
      return {
        success: false,
        error: 'Tenant not found',
      };
    }

    return {
      success: true,
      data: tenant,
    };
  },

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await apiClient.post<{ access_token: string; user: User; tenant: Tenant }>(
        '/api/auth/login',
        {
          email: credentials.email,
          password: credentials.password,
          tenantSubdomain: credentials.tenantSubdomain,
        }
      );

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Login failed',
        };
      }

      return {
        success: true,
        data: {
          user: response.data.user,
          tenant: response.data.tenant,
          token: response.data.access_token,
        },
        message: 'Login successful',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  },

  /**
   * Register new user
   */
  async register(credentials: RegisterCredentials): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await apiClient.post<{ access_token: string; user: User; tenant: Tenant }>(
        '/api/auth/register',
        {
          email: credentials.email,
          password: credentials.password,
          name: credentials.name,
          tenantSubdomain: credentials.tenantSubdomain,
          invitationToken: credentials.invitationToken,
        }
      );

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Registration failed',
        };
      }

      return {
        success: true,
        data: {
          user: response.data.user,
          tenant: response.data.tenant,
          token: response.data.access_token,
        },
        message: 'Registration successful',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    // Clear local storage, cookies, etc.
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('tenant-id');
      localStorage.removeItem('user');
    }
  },

  /**
   * Switch to another user (impersonate)
   */
  async impersonateUser(userId: string): Promise<ApiResponse<ImpersonationResponse>> {
    try {
      const response = await apiClient.post<{
        access_token: string;
        user: User;
        tenant: Tenant;
        impersonation: ImpersonationInfo;
      }>(`/api/auth/impersonate/${userId}`, {});

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to switch user',
        };
      }

      return {
        success: true,
        data: {
          user: response.data.user,
          tenant: response.data.tenant,
          token: response.data.access_token,
          impersonation: response.data.impersonation,
        },
        message: 'Switched to user successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to switch user',
      };
    }
  },

  /**
   * Stop impersonation and return to original user
   */
  async stopImpersonation(originalUserId: string): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await apiClient.post<{
        access_token: string;
        user: User;
        tenant: Tenant;
      }>('/api/auth/stop-impersonation', { originalUserId });

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to return to original user',
        };
      }

      return {
        success: true,
        data: {
          user: response.data.user,
          tenant: response.data.tenant,
          token: response.data.access_token,
        },
        message: 'Returned to original user successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to return to original user',
      };
    }
  },
};
