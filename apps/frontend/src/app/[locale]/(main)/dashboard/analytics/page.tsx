'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useTranslations } from '@/components/intl-provider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  BookOpen,
  Award,
  Building2,
  Download,
} from 'lucide-react';
import {
  getDashboardMetrics,
  DashboardMetrics,
  SuperadminDashboardMetrics,
} from '@/lib/api/analytics';
import { Line, LineChart, Bar, BarChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { format } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations();
  
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isAdmin = user?.role === 'ADMIN' || isSuperAdmin;

  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [metrics, setMetrics] = useState<DashboardMetrics | SuperadminDashboardMetrics | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchMetrics();
  }, [timeRange, isAdmin]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const data = await getDashboardMetrics(parseInt(timeRange, 10));
      setMetrics(data);
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="h-full p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="h-full p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No analytics data available</p>
          <Button onClick={fetchMetrics}>Retry</Button>
        </div>
      </div>
    );
  }

  const superadminMetrics = isSuperAdmin ? metrics as SuperadminDashboardMetrics : null;

  return (
    <div className="h-full p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            {isSuperAdmin ? 'Platform-wide insights and metrics' : 'Your organization\'s performance metrics'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isSuperAdmin && superadminMetrics && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{superadminMetrics.totalTenants}</div>
                <p className="text-xs text-muted-foreground">
                  {superadminMetrics.activeTenants} active
                </p>
              </CardContent>
            </Card>
          </>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeUsers} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCourses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalEnrollments.toLocaleString()} enrollments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageCompletionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Avg progress: {metrics.averageProgress.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>Total users over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                users: {
                  label: 'Users',
                  color: 'hsl(var(--chart-1))',
                },
              }}
              className="h-[300px]"
            >
              <LineChart data={metrics.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), 'MMM d')}
                />
                <YAxis />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid gap-2">
                            <div className="font-medium">{format(new Date(label), 'MMM d, yyyy')}</div>
                            <div className="text-sm text-muted-foreground">
                              {payload[0].value} users
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Enrollment Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Enrollment Trends</CardTitle>
            <CardDescription>New enrollments per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                enrollments: {
                  label: 'Enrollments',
                  color: 'hsl(var(--chart-2))',
                },
              }}
              className="h-[300px]"
            >
              <BarChart data={metrics.enrollmentTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), 'MMM d')}
                />
                <YAxis />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid gap-2">
                            <div className="font-medium">{format(new Date(label), 'MMM d, yyyy')}</div>
                            <div className="text-sm text-muted-foreground">
                              {payload[0].value} enrollments
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="var(--color-enrollments)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Course Completion Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Course Completions</CardTitle>
            <CardDescription>Completed courses per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                completions: {
                  label: 'Completions',
                  color: 'hsl(var(--chart-3))',
                },
              }}
              className="h-[300px]"
            >
              <LineChart data={metrics.courseCompletionRates}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), 'MMM d')}
                />
                <YAxis />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid gap-2">
                            <div className="font-medium">{format(new Date(label), 'MMM d, yyyy')}</div>
                            <div className="text-sm text-muted-foreground">
                              {payload[0].value} completions
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* User Distribution by Role */}
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
            <CardDescription>Users by role</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                users: {
                  label: 'Users',
                },
              }}
              className="h-[300px]"
            >
              <PieChart>
                <Pie
                  data={metrics.userDistributionByRole}
                  dataKey="count"
                  nameKey="role"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ role, count }) => `${role}: ${count}`}
                >
                  {metrics.userDistributionByRole.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Superadmin: Tenant Growth */}
        {isSuperAdmin && superadminMetrics && (
          <Card>
            <CardHeader>
              <CardTitle>Tenant Growth</CardTitle>
              <CardDescription>Total tenants over time</CardDescription>
            </CardHeader>
            <CardContent>
            <ChartContainer
              config={{
                tenants: {
                  label: 'Tenants',
                  color: 'hsl(var(--chart-4))',
                },
              }}
              className="h-[300px]"
            >
              <LineChart data={superadminMetrics.tenantGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), 'MMM d')}
                />
                <YAxis />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid gap-2">
                            <div className="font-medium">{format(new Date(label), 'MMM d, yyyy')}</div>
                            <div className="text-sm text-muted-foreground">
                              {payload[0].value} tenants
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-tenants)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tables Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Courses */}
        <Card>
          <CardHeader>
            <CardTitle>Top Courses</CardTitle>
            <CardDescription>Most popular courses by enrollments</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Enrollments</TableHead>
                  <TableHead className="text-right">Completion</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.topCourses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No courses yet
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics.topCourses.map((course) => (
                    <TableRow key={course.courseId}>
                      <TableCell className="font-medium">{course.courseTitle}</TableCell>
                      <TableCell className="text-right">{course.enrollments}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">
                          {course.completionRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {course.averageProgress.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Superadmin: Top Tenants */}
        {isSuperAdmin && superadminMetrics && (
          <Card>
            <CardHeader>
              <CardTitle>Top Tenants</CardTitle>
              <CardDescription>Most active tenants</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead className="text-right">Courses</TableHead>
                    <TableHead className="text-right">Enrollments</TableHead>
                    <TableHead className="text-right">Completion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {superadminMetrics.topTenants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No tenants yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    superadminMetrics.topTenants.map((tenant) => (
                      <TableRow key={tenant.tenantId}>
                        <TableCell className="font-medium">{tenant.tenantName}</TableCell>
                        <TableCell className="text-right">{tenant.totalUsers}</TableCell>
                        <TableCell className="text-right">{tenant.totalCourses}</TableCell>
                        <TableCell className="text-right">{tenant.totalEnrollments}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">
                            {tenant.completionRate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
