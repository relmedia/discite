import { apiClient } from "./client";
import {
  MarketplaceCourse,
  TenantCourseLicense,
  UserCourseAccess,
  LicenseType,
  LicenseStatus,
  AccessStatus,
  LicenseOption,
  CourseLevel,
} from "@repo/shared";

// ===== PUBLIC MARKETPLACE API =====

export interface MarketplaceCatalogResponse {
  courses: MarketplaceCourse[];
  total: number;
  page: number;
  limit: number;
}

export const marketplaceApi = {
  // Get published courses (public catalog)
  async getPublishedCourses(options?: {
    category?: string;
    level?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<MarketplaceCatalogResponse> {
    const params = new URLSearchParams();
    if (options?.category) params.append("category", options.category);
    if (options?.level) params.append("level", options.level);
    if (options?.search) params.append("search", options.search);
    if (options?.page) params.append("page", options.page.toString());
    if (options?.limit) params.append("limit", options.limit.toString());

    const queryString = params.toString();
    const endpoint = `/api/marketplace/courses${queryString ? `?${queryString}` : ""}`;
    
    const response = await apiClient.get<MarketplaceCatalogResponse>(endpoint);
    if (!response.success) {
      throw new Error(response.error || "Failed to fetch courses");
    }
    return response.data!;
  },

  // Get course by slug (public)
  async getCourseBySlug(slug: string): Promise<MarketplaceCourse> {
    const response = await apiClient.get<MarketplaceCourse>(
      `/api/marketplace/courses/slug/${slug}`
    );
    if (!response.success) {
      throw new Error(response.error || "Failed to fetch course");
    }
    return response.data!;
  },

  // Get categories (public)
  async getCategories(): Promise<string[]> {
    const response = await apiClient.get<string[]>("/api/marketplace/categories");
    if (!response.success) {
      throw new Error(response.error || "Failed to fetch categories");
    }
    return response.data!;
  },
};

// ===== ADMIN MARKETPLACE API =====

export const marketplaceAdminApi = {
  // Get all courses (admin)
  async getAllCourses(options?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<MarketplaceCatalogResponse> {
    const params = new URLSearchParams();
    if (options?.status) params.append("status", options.status);
    if (options?.page) params.append("page", options.page.toString());
    if (options?.limit) params.append("limit", options.limit.toString());

    const queryString = params.toString();
    const endpoint = `/api/marketplace/admin/courses${queryString ? `?${queryString}` : ""}`;
    
    const response = await apiClient.get<MarketplaceCatalogResponse>(endpoint);
    if (!response.success) {
      throw new Error(response.error || "Failed to fetch courses");
    }
    return response.data!;
  },

  // Get course by ID (admin)
  async getCourseById(id: string): Promise<MarketplaceCourse> {
    const response = await apiClient.get<MarketplaceCourse>(
      `/api/marketplace/admin/courses/${id}`
    );
    if (!response.success) {
      throw new Error(response.error || "Failed to fetch course");
    }
    return response.data!;
  },

  // Get marketplace course by source course ID (admin)
  async getCourseBySourceId(sourceCourseId: string): Promise<MarketplaceCourse | null> {
    const response = await apiClient.get<MarketplaceCourse | null>(
      `/api/marketplace/admin/courses/source/${sourceCourseId}`
    );
    if (!response.success) {
      // Return null if not found (404)
      if (response.error?.includes('not found') || response.error?.includes('404')) {
        return null;
      }
      throw new Error(response.error || "Failed to fetch course");
    }
    return response.data || null;
  },

  // Create marketplace course
  async createCourse(data: {
    title: string;
    description: string;
    thumbnailUrl?: string;
    durationHours: number;
    level: CourseLevel;
    tags?: string[];
    category?: string;
    basePrice: number;
    currency?: string;
    isFree?: boolean;
    licenseOptions: LicenseOption[];
    includesCertificate?: boolean;
    sourceCourseId?: string;
  }): Promise<MarketplaceCourse> {
    const response = await apiClient.post<MarketplaceCourse>(
      "/api/marketplace/admin/courses",
      data
    );
    if (!response.success) {
      throw new Error(response.error || "Failed to create course");
    }
    return response.data!;
  },

  // Update marketplace course
  async updateCourse(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      thumbnailUrl: string;
      durationHours: number;
      level: CourseLevel;
      tags: string[];
      category: string;
      basePrice: number;
      currency: string;
      isFree: boolean;
      licenseOptions: LicenseOption[];
      includesCertificate: boolean;
    }>
  ): Promise<MarketplaceCourse> {
    const response = await apiClient.put<MarketplaceCourse>(
      `/api/marketplace/admin/courses/${id}`,
      data
    );
    if (!response.success) {
      throw new Error(response.error || "Failed to update course");
    }
    return response.data!;
  },

  // Publish course
  async publishCourse(id: string): Promise<MarketplaceCourse> {
    const response = await apiClient.post<MarketplaceCourse>(
      `/api/marketplace/admin/courses/${id}/publish`
    );
    if (!response.success) {
      throw new Error(response.error || "Failed to publish course");
    }
    return response.data!;
  },

  // Unpublish course
  async unpublishCourse(id: string): Promise<MarketplaceCourse> {
    const response = await apiClient.post<MarketplaceCourse>(
      `/api/marketplace/admin/courses/${id}/unpublish`
    );
    if (!response.success) {
      throw new Error(response.error || "Failed to unpublish course");
    }
    return response.data!;
  },

  // Archive course
  async archiveCourse(id: string): Promise<MarketplaceCourse> {
    const response = await apiClient.post<MarketplaceCourse>(
      `/api/marketplace/admin/courses/${id}/archive`
    );
    if (!response.success) {
      throw new Error(response.error || "Failed to archive course");
    }
    return response.data!;
  },

  // Delete course
  async deleteCourse(id: string): Promise<void> {
    const response = await apiClient.delete(`/api/marketplace/admin/courses/${id}`);
    if (!response.success) {
      throw new Error(response.error || "Failed to delete course");
    }
  },
};

// ===== LICENSE API =====

export const licenseApi = {
  // Get tenant's licenses
  async getTenantLicenses(status?: LicenseStatus): Promise<TenantCourseLicense[]> {
    const params = status ? `?status=${status}` : "";
    const response = await apiClient.get<TenantCourseLicense[]>(`/api/licenses${params}`);
    if (!response.success) {
      throw new Error(response.error || "Failed to fetch licenses");
    }
    return response.data!;
  },

  // Get active licenses
  async getActiveLicenses(): Promise<TenantCourseLicense[]> {
    const response = await apiClient.get<TenantCourseLicense[]>("/api/licenses/active");
    if (!response.success) {
      throw new Error(response.error || "Failed to fetch active licenses");
    }
    return response.data!;
  },

  // Get license by ID
  async getLicenseById(id: string): Promise<TenantCourseLicense> {
    const response = await apiClient.get<TenantCourseLicense>(`/api/licenses/${id}`);
    if (!response.success) {
      throw new Error(response.error || "Failed to fetch license");
    }
    return response.data!;
  },

  // Get users assigned to a license
  async getLicenseUsers(
    licenseId: string,
    status?: AccessStatus
  ): Promise<UserCourseAccess[]> {
    const params = status ? `?status=${status}` : "";
    const response = await apiClient.get<UserCourseAccess[]>(
      `/api/licenses/${licenseId}/users${params}`
    );
    if (!response.success) {
      throw new Error(response.error || "Failed to fetch license users");
    }
    return response.data!;
  },

  // Assign users to a license
  async assignUsers(licenseId: string, userIds: string[]): Promise<UserCourseAccess[]> {
    const response = await apiClient.post<UserCourseAccess[]>(
      `/api/licenses/${licenseId}/assign`,
      { userIds }
    );
    if (!response.success) {
      throw new Error(response.error || "Failed to assign users");
    }
    return response.data!;
  },

  // Revoke user access
  async revokeAccess(accessId: string, reason?: string): Promise<UserCourseAccess> {
    const response = await apiClient.put<UserCourseAccess>(
      `/api/licenses/access/${accessId}/revoke`,
      { reason }
    );
    if (!response.success) {
      throw new Error(response.error || "Failed to revoke access");
    }
    return response.data!;
  },

  // Get current user's course access
  async getMyCoursesAccess(): Promise<UserCourseAccess[]> {
    const response = await apiClient.get<UserCourseAccess[]>("/api/licenses/user/my-courses");
    if (!response.success) {
      throw new Error(response.error || "Failed to fetch course access");
    }
    return response.data!;
  },

  // Check access to a specific course
  async checkAccess(courseId: string): Promise<boolean> {
    const response = await apiClient.get<boolean>(
      `/api/licenses/user/check-access/${courseId}`
    );
    if (!response.success) {
      throw new Error(response.error || "Failed to check access");
    }
    return response.data!;
  },

  // Cancel a license
  async cancelLicense(id: string, reason?: string): Promise<TenantCourseLicense> {
    const response = await apiClient.put<TenantCourseLicense>(
      `/api/licenses/${id}/cancel`,
      { reason }
    );
    if (!response.success) {
      throw new Error(response.error || "Failed to cancel license");
    }
    return response.data!;
  },
};

// ===== PAYMENT API =====

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
  isFree?: boolean;
  licenseId?: string;
}

export const paymentApi = {
  // Create checkout session
  async createCheckoutSession(data: {
    marketplaceCourseId: string;
    licenseType: LicenseType;
    seatCount?: number;
  }): Promise<CheckoutSessionResponse> {
    const response = await apiClient.post<CheckoutSessionResponse>(
      "/api/payments/create-checkout-session",
      data
    );
    if (!response.success) {
      throw new Error(response.error || "Failed to create checkout session");
    }
    return response.data!;
  },

  // Verify checkout session
  async verifySession(sessionId: string): Promise<{
    licenseId?: string;
    courseName?: string;
    courseId?: string;
  }> {
    const response = await apiClient.get<{
      licenseId?: string;
      courseName?: string;
      courseId?: string;
    }>(`/api/payments/verify-session/${sessionId}`);
    if (!response.success) {
      throw new Error(response.error || "Failed to verify session");
    }
    return response.data || {};
  },

  // Check if Stripe is configured
  async getPaymentStatus(): Promise<{ stripeConfigured: boolean }> {
    const response = await apiClient.get<{ stripeConfigured: boolean }>(
      "/api/payments/status"
    );
    if (!response.success) {
      throw new Error(response.error || "Failed to get payment status");
    }
    return response.data!;
  },

  // Get payment history for the current user
  async getMyPayments(): Promise<{
    id: string;
    paymentIntentId?: string;
    courseName: string;
    courseId?: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
    invoiceUrl?: string;
    receiptUrl?: string;
    refundable: boolean;
    refundDeadline?: string;
  }[]> {
    const response = await apiClient.get<{
      id: string;
      paymentIntentId?: string;
      courseName: string;
      courseId?: string;
      amount: number;
      currency: string;
      status: string;
      createdAt: string;
      invoiceUrl?: string;
      receiptUrl?: string;
      refundable: boolean;
      refundDeadline?: string;
    }[]>("/api/payments/my-payments");
    if (!response.success) {
      throw new Error(response.error || "Failed to get payment history");
    }
    return response.data || [];
  },

  // Get payment details
  async getPaymentDetails(sessionId: string): Promise<{
    id: string;
    paymentIntentId?: string;
    courseName: string;
    courseId?: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
    invoiceUrl?: string;
    receiptUrl?: string;
    billingDetails?: {
      name?: string;
      email?: string;
      address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
    };
    paymentMethod?: string;
    last4?: string;
    brand?: string;
  } | null> {
    const response = await apiClient.get<any>(`/api/payments/details/${sessionId}`);
    if (!response.success) {
      return null;
    }
    return response.data;
  },

  // Request a refund
  async requestRefund(paymentIntentId: string, reason?: string): Promise<{
    refundId?: string;
  }> {
    const response = await apiClient.post<{ refundId: string }>(
      `/api/payments/refund/${paymentIntentId}`,
      { reason }
    );
    if (!response.success) {
      throw new Error(response.error || "Failed to process refund");
    }
    return response.data || {};
  },

  // Delete/hide a payment from user's view
  async deletePayment(paymentId: string): Promise<void> {
    const response = await apiClient.delete(`/api/payments/${paymentId}`);
    if (!response.success) {
      throw new Error(response.error || "Failed to delete payment");
    }
  },
};

