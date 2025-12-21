"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  CreditCard,
  Building2,
  GraduationCap,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import {
  invoicesApi,
  InvoiceInsights,
  Invoice,
  TenantOption,
} from "@/lib/api/invoices";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  EXPIRED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

const pieColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export default function InvoiceInsightsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<InvoiceInsights | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [timeRange, setTimeRange] = useState("30");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTenant, setFilterTenant] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const isSuperAdmin = user?.role === "SUPERADMIN";

  useEffect(() => {
    if (!isAuthLoading && !user) {
      return;
    }
    if (!isAuthLoading && !isSuperAdmin) {
      toast.error("This page is only accessible to superadmins");
      router.push("/dashboard");
    } else if (!isAuthLoading && isSuperAdmin) {
      fetchData();
    }
  }, [isAuthLoading, isSuperAdmin, user, router]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchInsights();
    }
  }, [timeRange, isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchInvoices();
    }
  }, [currentPage, filterStatus, filterTenant, isSuperAdmin]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [insightsData, tenantsData] = await Promise.all([
        invoicesApi.getInsights(parseInt(timeRange)),
        invoicesApi.getTenants(),
      ]);
      setInsights(insightsData);
      setTenants(tenantsData);
      await fetchInvoices();
    } catch (error: any) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      const data = await invoicesApi.getInsights(parseInt(timeRange));
      setInsights(data);
    } catch (error: any) {
      console.error("Failed to fetch insights:", error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const data = await invoicesApi.getInvoices({
        page: currentPage,
        limit: 20,
        status: filterStatus !== "all" ? filterStatus : undefined,
        tenantId: filterTenant !== "all" ? filterTenant : undefined,
      });
      setInvoices(data.invoices);
      setTotalPages(data.pagination.totalPages);
      setTotalInvoices(data.pagination.total);
    } catch (error: any) {
      console.error("Failed to fetch invoices:", error);
    }
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      invoice.tenantName.toLowerCase().includes(query) ||
      invoice.courseName.toLowerCase().includes(query) ||
      invoice.purchasedBy.toLowerCase().includes(query) ||
      invoice.purchasedByEmail.toLowerCase().includes(query)
    );
  });

  if (loading || isAuthLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoice Insights</h1>
          <p className="text-muted-foreground mt-1">
            Revenue and transaction analytics across all tenants
          </p>
        </div>
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
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(insights.summary.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Last {timeRange} days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {insights.summary.totalTransactions}
            </div>
            <p className="text-xs text-muted-foreground">
              Total purchases
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(insights.summary.averageOrderValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per transaction
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {insights.summary.subscriptionCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Active subscriptions
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tenants">By Tenant</TabsTrigger>
          <TabsTrigger value="courses">By Course</TabsTrigger>
          <TabsTrigger value="transactions">All Transactions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Daily revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                {insights.dailyRevenue.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <AreaChart data={insights.dailyRevenue}>
                      <defs>
                        <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        }}
                      />
                      <YAxis tickFormatter={(value) => `$${value}`} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(value) => formatDate(value)}
                            formatter={(value) => [formatCurrency(value as number), "Revenue"]}
                          />
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="var(--color-revenue)"
                        fill="url(#fillRevenue)"
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No revenue data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Revenue by Status */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Status</CardTitle>
                <CardDescription>Transaction status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Active", value: insights.revenueByStatus.active },
                        { name: "Pending", value: insights.revenueByStatus.pending },
                        { name: "Cancelled", value: insights.revenueByStatus.cancelled },
                        { name: "Expired", value: insights.revenueByStatus.expired },
                      ].filter((item) => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    >
                      {[0, 1, 2, 3].map((index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index]} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [formatCurrency(value as number), "Revenue"]}
                        />
                      }
                    />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest 20 transactions across all tenants</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Purchased By</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insights.recentTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No transactions yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    insights.recentTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">{tx.tenantName}</TableCell>
                        <TableCell>{tx.courseName}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{tx.purchasedBy}</div>
                            <div className="text-xs text-muted-foreground">{tx.purchasedByEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(tx.amount, tx.currency)}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[tx.status] || statusColors.ACTIVE}>
                            {tx.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(tx.purchasedAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Tenant Tab */}
        <TabsContent value="tenants" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Revenue by Tenant
              </CardTitle>
              <CardDescription>Top performing tenants by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              {insights.revenueByTenant.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[400px] w-full">
                  <BarChart
                    data={insights.revenueByTenant.slice(0, 10)}
                    layout="vertical"
                    margin={{ left: 120 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                    <YAxis dataKey="tenantName" type="category" width={100} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [formatCurrency(value as number), "Revenue"]}
                        />
                      }
                    />
                    <Bar dataKey="revenue" fill="var(--chart-1)" radius={4} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No tenant data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tenant Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Avg Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insights.revenueByTenant.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No tenant data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    insights.revenueByTenant.map((tenant) => (
                      <TableRow key={tenant.tenantId}>
                        <TableCell className="font-medium">{tenant.tenantName}</TableCell>
                        <TableCell className="text-right">{tenant.count}</TableCell>
                        <TableCell className="text-right">{formatCurrency(tenant.revenue)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(tenant.count > 0 ? tenant.revenue / tenant.count : 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Course Tab */}
        <TabsContent value="courses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Revenue by Course
              </CardTitle>
              <CardDescription>Top selling courses by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              {insights.revenueByCourse.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[400px] w-full">
                  <BarChart
                    data={insights.revenueByCourse.slice(0, 10)}
                    layout="vertical"
                    margin={{ left: 150 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                    <YAxis dataKey="courseName" type="category" width={140} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [formatCurrency(value as number), "Revenue"]}
                        />
                      }
                    />
                    <Bar dataKey="revenue" fill="var(--chart-2)" radius={4} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No course data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Avg Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insights.revenueByCourse.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No course data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    insights.revenueByCourse.map((course) => (
                      <TableRow key={course.courseId}>
                        <TableCell className="font-medium">{course.courseName}</TableCell>
                        <TableCell className="text-right">{course.count}</TableCell>
                        <TableCell className="text-right">{formatCurrency(course.revenue)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(course.count > 0 ? course.revenue / course.count : 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>All Transactions</CardTitle>
                  <CardDescription>
                    {totalInvoices} total transactions
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-full md:w-48"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
                    <SelectTrigger className="w-full md:w-36">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterTenant} onValueChange={(v) => { setFilterTenant(v); setCurrentPage(1); }}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tenants</SelectItem>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Purchased By</TableHead>
                    <TableHead>License Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.tenantName}</TableCell>
                        <TableCell>{invoice.courseName}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invoice.purchasedBy}</div>
                            <div className="text-xs text-muted-foreground">{invoice.purchasedByEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {invoice.licenseType}
                            {invoice.seatCount && ` (${invoice.seatsUsed || 0}/${invoice.seatCount})`}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(invoice.amount, invoice.currency)}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[invoice.status] || statusColors.ACTIVE}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(invoice.purchasedAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
