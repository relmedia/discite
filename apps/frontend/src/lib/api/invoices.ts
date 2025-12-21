import { apiClient } from './client';

export interface InvoiceSummary {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  subscriptionCount: number;
}

export interface RevenueByStatus {
  active: number;
  pending: number;
  cancelled: number;
  expired: number;
}

export interface TenantRevenue {
  tenantId: string;
  tenantName: string;
  revenue: number;
  count: number;
}

export interface CourseRevenue {
  courseId: string;
  courseName: string;
  revenue: number;
  count: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
}

export interface Transaction {
  id: string;
  tenantId: string;
  tenantName: string;
  courseName: string;
  courseId: string;
  amount: number;
  currency: string;
  status: string;
  licenseType: string;
  purchasedBy: string;
  purchasedByEmail: string;
  purchasedAt: string;
  isSubscription: boolean;
}

export interface InvoiceInsights {
  summary: InvoiceSummary;
  revenueByStatus: RevenueByStatus;
  revenueByTenant: TenantRevenue[];
  revenueByCourse: CourseRevenue[];
  dailyRevenue: DailyRevenue[];
  recentTransactions: Transaction[];
}

export interface Invoice {
  id: string;
  tenantId: string;
  tenantName: string;
  courseName: string;
  courseId: string;
  amount: number;
  currency: string;
  status: string;
  licenseType: string;
  seatCount?: number;
  seatsUsed?: number;
  purchasedBy: string;
  purchasedByEmail: string;
  purchasedAt: string;
  validFrom: string;
  validUntil?: string;
  isSubscription: boolean;
  stripePaymentIntentId?: string;
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TenantOption {
  id: string;
  name: string;
}

export const invoicesApi = {
  async getInsights(days: number = 30): Promise<InvoiceInsights> {
    const response = await apiClient.get<InvoiceInsights>(`/api/payments/admin/insights?days=${days}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch invoice insights');
    }
    return response.data;
  },

  async getInvoices(params: {
    page?: number;
    limit?: number;
    status?: string;
    tenantId?: string;
  } = {}): Promise<InvoiceListResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.status) queryParams.set('status', params.status);
    if (params.tenantId) queryParams.set('tenantId', params.tenantId);

    const response = await apiClient.get<InvoiceListResponse>(`/api/payments/admin/invoices?${queryParams.toString()}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch invoices');
    }
    return response.data;
  },

  async getTenants(): Promise<TenantOption[]> {
    const response = await apiClient.get<TenantOption[]>('/api/payments/admin/tenants');
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch tenants');
    }
    return response.data;
  },
};
