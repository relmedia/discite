import { apiClient } from './client';

export interface VisitorDataPoint {
  date: string;
  visitors: number;
}

export interface GrowthDataPoint {
  date: string;
  count: number;
}

export interface TenantMetrics {
  tenantId: string;
  tenantName: string;
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  activeUsers: number;
  completionRate: number;
}

export interface CoursePerformance {
  courseId: string;
  courseTitle: string;
  enrollments: number;
  completions: number;
  averageProgress: number;
  completionRate: number;
}

export interface DashboardMetrics {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  activeUsers: number;
  averageCompletionRate: number;
  averageProgress: number;
  userGrowth: GrowthDataPoint[];
  enrollmentTrends: GrowthDataPoint[];
  courseCompletionRates: GrowthDataPoint[];
  topCourses: CoursePerformance[];
  userDistributionByRole: { role: string; count: number }[];
}

export interface SuperadminDashboardMetrics extends DashboardMetrics {
  totalTenants: number;
  activeTenants: number;
  tenantGrowth: GrowthDataPoint[];
  topTenants: TenantMetrics[];
}

export async function getVisitorStats(days: number = 90): Promise<VisitorDataPoint[]> {
  const response = await apiClient.get<VisitorDataPoint[]>(`/api/analytics/visitors?days=${days}`);
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch visitor stats');
  }
  return response.data;
}

export async function getDashboardMetrics(days: number = 30): Promise<DashboardMetrics | SuperadminDashboardMetrics> {
  const response = await apiClient.get<DashboardMetrics | SuperadminDashboardMetrics>(`/api/analytics/dashboard?days=${days}`);
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch dashboard metrics');
  }
  return response.data;
}
