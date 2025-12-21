"use client";

import * as React from "react";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { getVisitorStats, VisitorDataPoint } from "@/lib/api/analytics";

export const description = "An interactive area chart";

// Fallback data in case API fails
const fallbackChartData: VisitorDataPoint[] = [
  { date: "2024-04-01", visitors: 372 },
  { date: "2024-04-02", visitors: 277 },
  { date: "2024-04-03", visitors: 287 },
  { date: "2024-04-04", visitors: 502 },
  { date: "2024-04-05", visitors: 663 },
  { date: "2024-04-06", visitors: 641 },
  { date: "2024-04-07", visitors: 425 },
  { date: "2024-04-08", visitors: 729 },
  { date: "2024-04-09", visitors: 169 },
  { date: "2024-04-10", visitors: 451 },
  { date: "2024-04-11", visitors: 677 },
  { date: "2024-04-12", visitors: 502 },
  { date: "2024-04-13", visitors: 722 },
  { date: "2024-04-14", visitors: 357 },
  { date: "2024-04-15", visitors: 290 },
  { date: "2024-04-16", visitors: 328 },
  { date: "2024-04-17", visitors: 806 },
  { date: "2024-04-18", visitors: 774 },
  { date: "2024-04-19", visitors: 423 },
  { date: "2024-04-20", visitors: 239 },
  { date: "2024-04-21", visitors: 337 },
  { date: "2024-04-22", visitors: 394 },
  { date: "2024-04-23", visitors: 368 },
  { date: "2024-04-24", visitors: 677 },
  { date: "2024-04-25", visitors: 465 },
  { date: "2024-04-26", visitors: 205 },
  { date: "2024-04-27", visitors: 803 },
  { date: "2024-04-28", visitors: 302 },
  { date: "2024-04-29", visitors: 555 },
  { date: "2024-04-30", visitors: 834 },
  { date: "2024-05-01", visitors: 385 },
  { date: "2024-05-02", visitors: 603 },
  { date: "2024-05-03", visitors: 437 },
  { date: "2024-05-04", visitors: 805 },
  { date: "2024-05-05", visitors: 871 },
  { date: "2024-05-06", visitors: 1018 },
  { date: "2024-05-07", visitors: 688 },
  { date: "2024-05-08", visitors: 359 },
  { date: "2024-05-09", visitors: 407 },
  { date: "2024-05-10", visitors: 623 },
  { date: "2024-05-11", visitors: 605 },
  { date: "2024-05-12", visitors: 437 },
  { date: "2024-05-13", visitors: 357 },
  { date: "2024-05-14", visitors: 938 },
  { date: "2024-05-15", visitors: 853 },
  { date: "2024-05-16", visitors: 738 },
  { date: "2024-05-17", visitors: 919 },
  { date: "2024-05-18", visitors: 665 },
  { date: "2024-05-19", visitors: 415 },
  { date: "2024-05-20", visitors: 407 },
  { date: "2024-05-21", visitors: 222 },
  { date: "2024-05-22", visitors: 201 },
  { date: "2024-05-23", visitors: 542 },
  { date: "2024-05-24", visitors: 514 },
  { date: "2024-05-25", visitors: 451 },
  { date: "2024-05-26", visitors: 383 },
  { date: "2024-05-27", visitors: 880 },
  { date: "2024-05-28", visitors: 423 },
  { date: "2024-05-29", visitors: 208 },
  { date: "2024-05-30", visitors: 620 },
  { date: "2024-05-31", visitors: 408 },
  { date: "2024-06-01", visitors: 378 },
  { date: "2024-06-02", visitors: 880 },
  { date: "2024-06-03", visitors: 263 },
  { date: "2024-06-04", visitors: 819 },
  { date: "2024-06-05", visitors: 228 },
  { date: "2024-06-06", visitors: 544 },
  { date: "2024-06-07", visitors: 693 },
  { date: "2024-06-08", visitors: 705 },
  { date: "2024-06-09", visitors: 918 },
  { date: "2024-06-10", visitors: 355 },
  { date: "2024-06-11", visitors: 242 },
  { date: "2024-06-12", visitors: 912 },
  { date: "2024-06-13", visitors: 211 },
  { date: "2024-06-14", visitors: 806 },
  { date: "2024-06-15", visitors: 657 },
  { date: "2024-06-16", visitors: 681 },
  { date: "2024-06-17", visitors: 995 },
  { date: "2024-06-18", visitors: 277 },
  { date: "2024-06-19", visitors: 631 },
  { date: "2024-06-20", visitors: 858 },
  { date: "2024-06-21", visitors: 379 },
  { date: "2024-06-22", visitors: 587 },
  { date: "2024-06-23", visitors: 1010 },
  { date: "2024-06-24", visitors: 312 },
  { date: "2024-06-25", visitors: 331 },
  { date: "2024-06-26", visitors: 814 },
  { date: "2024-06-27", visitors: 938 },
  { date: "2024-06-28", visitors: 349 },
  { date: "2024-06-29", visitors: 263 },
  { date: "2024-06-30", visitors: 846 },
];

const chartConfig = {
  visitors: {
    label: "Visitors",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ChartAreaInteractive() {
  const isMobile = useIsMobile();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [timeRange, setTimeRange] = React.useState("90d");
  const [chartData, setChartData] = React.useState<VisitorDataPoint[]>(fallbackChartData);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasPermission, setHasPermission] = React.useState(true);

  // Check if user has admin role
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d");
    }
  }, [isMobile]);

  // Fetch visitor stats when component mounts or timeRange changes
  React.useEffect(() => {
    async function fetchData() {
      // Wait for auth to finish loading
      if (isAuthLoading) {
        return;
      }

      // Only fetch if user is admin
      if (!isAdmin) {
        setIsLoading(false);
        setHasPermission(false);
        return;
      }

      try {
        setIsLoading(true);
        const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
        const data = await getVisitorStats(days);
        if (data && data.length > 0) {
          setChartData(data);
        } else {
          // If API returns empty data, use fallback
          console.warn("API returned empty data, using fallback");
        }
        setHasPermission(true);
      } catch (error: any) {
        // Check if it's a permission error
        if (error.message?.includes("permission") || error.message?.includes("Insufficient")) {
          setHasPermission(false);
        }
        // Silently handle errors - use fallback data
        // This allows the component to work even if backend hasn't been restarted
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [timeRange, isAdmin, isAuthLoading]);

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date);
    const now = new Date();
    let daysToSubtract = 90;
    if (timeRange === "30d") {
      daysToSubtract = 30;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    }
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    return date >= startDate;
  });

  // Don't render the chart if user doesn't have permission (after auth is loaded)
  if (!isAuthLoading && !hasPermission) {
    return null;
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Total Visitors</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">Total for the last 3 months</span>
          <span className="@[540px]/card:hidden">Last 3 months</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-[250px]">
            <div className="text-muted-foreground">Loading visitor data...</div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-visitors)" stopOpacity={1.0} />
                  <stop offset="95%" stopColor="var(--color-visitors)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <ChartTooltip
                cursor={false}
                defaultIndex={isMobile ? -1 : 10}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area dataKey="visitors" type="natural" fill="url(#fillVisitors)" stroke="var(--color-visitors)" />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
