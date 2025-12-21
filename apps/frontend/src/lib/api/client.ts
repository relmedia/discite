const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Storage keys for Auth.js session data
const AUTH_TOKEN_KEY = 'backend-token';
const TENANT_ID_KEY = 'current-tenant-id';
const CUSTOM_DOMAIN_COOKIE = 'tenant-custom-domain';

// Helper to get auth token from session storage (set by Auth.js session sync)
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(AUTH_TOKEN_KEY);
}

// Helper to get tenant ID from session storage (set by Auth.js session sync)
function getTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TENANT_ID_KEY);
}

// Helper to get custom domain from cookie (set by middleware for custom domain access)
function getCustomDomain(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^| )${CUSTOM_DOMAIN_COOKIE}=([^;]+)`));
  return match ? match[2] : null;
}

// Function to sync Auth.js session data for API client use
export function syncAuthSession(backendToken: string | null, tenantId: string | null) {
  if (typeof window === 'undefined') return;
  
  if (backendToken) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, backendToken);
  } else {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
  }
  
  if (tenantId) {
    sessionStorage.setItem(TENANT_ID_KEY, tenantId);
  } else {
    sessionStorage.removeItem(TENANT_ID_KEY);
  }
}

// Function to clear auth session data (call on logout)
export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(TENANT_ID_KEY);
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    headers: Record<string, string> = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    // Get auth token, tenant ID, and custom domain, add to headers if available
    const token = getAuthToken();
    const tenantId = getTenantId();
    const customDomain = getCustomDomain();
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
      ...(customDomain ? { 'X-Tenant-Custom-Domain': customDomain } : {}),
      ...headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: defaultHeaders,
        credentials: 'include', // Required for CORS with credentials
      });

      // Parse JSON response (works for both success and error responses)
      let data: any;
      try {
        const text = await response.text();
        if (!text) {
          return {
            success: false,
            error: 'Empty response from server',
          };
        }
        data = JSON.parse(text);
      } catch (parseError) {
        // Response is not JSON
        if (!response.ok) {
          return {
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
          };
        }
        return {
          success: false,
          error: 'Invalid JSON response from server',
        };
      }

      // Check if response is ok
      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      // Backend already returns ApiResponse format, so return it directly
      return data as ApiResponse<T>;
    } catch (error) {
      // Handle network errors (CORS, connection refused, etc.)
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Network error - Unable to connect to server';
      
      // Provide more specific error messages
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('fetch')) {
        return {
          success: false,
          error: `Cannot connect to backend server at ${this.baseUrl}. Please ensure the backend is running and accessible.`,
        };
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' }, headers);
  }

  async post<T>(
    endpoint: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      },
      headers
    );
  }

  async put<T>(
    endpoint: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      },
      headers
    );
  }

  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' }, headers);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
