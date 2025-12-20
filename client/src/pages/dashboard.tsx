import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  Briefcase,
  ArrowUpRight,
  MoreHorizontal,
  CheckCircle2,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Types for dashboard data
interface DashboardData {
  activeCandidates: number;
  openRoles: number;
  timeToHire: number;
  offerAcceptance: number;
  applicationVolume: { name: string; apps: number }[];
  recentActivity: {
    user: string;
    action: string;
    target: string;
    time: string;
    avatar: string;
  }[];
  priorityRoles: {
    _id: string;
    title: string;
    department: string;
    location: string;
    type: string;
    totalApplicants: number;
    needsReview: number;
  }[];
}

// Custom hook for fetching dashboard data from existing APIs
function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch from multiple existing endpoints
      const [analyticsRes, jobsRes, applicationsRes] = await Promise.all([
        fetch("/api/analytics/dashboard").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/jobs").then(r => r.ok ? r.json() : []).catch(() => []),
        fetch("/api/applications").then(r => r.ok ? r.json() : []).catch(() => [])
      ]);

      // Also try the new dashboard stats endpoint (will work after server restart)
      let newStats = null;
      try {
        const statsRes = await fetch("/api/dashboard/stats");
        const contentType = statsRes.headers.get("content-type");
        if (contentType && !contentType.includes("text/html") && statsRes.ok) {
          newStats = await statsRes.json();
        }
      } catch (e) {
        // New endpoint not available yet
      }

      // If new stats endpoint works, use it
      if (newStats?.success) {
        setData({
          activeCandidates: newStats.metrics.activeCandidates.value,
          openRoles: newStats.metrics.openRoles.value,
          timeToHire: newStats.metrics.timeToHire.value,
          offerAcceptance: newStats.metrics.offerAcceptance.value,
          applicationVolume: newStats.applicationVolume,
          recentActivity: newStats.recentActivity,
          priorityRoles: newStats.priorityRoles
        });
        return;
      }

      // Otherwise, build data from existing endpoints
      const jobs = Array.isArray(jobsRes) ? jobsRes : (jobsRes.jobs || []);
      const applications = Array.isArray(applicationsRes) ? applicationsRes : [];
      const activeJobs = jobs.filter((j: any) => j.status === "active");

      // Calculate application volume for last 7 days
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const now = new Date();
      const applicationVolume: { name: string; apps: number }[] = [];

      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(now);
        dayStart.setDate(now.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const count = applications.filter((app: any) => {
          const appliedAt = new Date(app.appliedAt);
          return appliedAt >= dayStart && appliedAt <= dayEnd;
        }).length;

        applicationVolume.push({
          name: dayNames[dayStart.getDay()],
          apps: count
        });
      }

      // Build recent activity from applications
      const recentApps = applications
        .sort((a: any, b: any) => new Date(b.updatedAt || b.appliedAt).getTime() - new Date(a.updatedAt || a.appliedAt).getTime())
        .slice(0, 5);

      const recentActivity = recentApps.map((app: any) => {
        const action = app.status === "hired" ? "was hired for" :
          app.status === "interview" ? "moved to Interview for" :
            app.status === "shortlisted" ? "was shortlisted for" :
              "applied for";
        return {
          user: app.candidateName || "Candidate",
          action,
          target: app.jobTitle || "a position",
          time: getTimeAgo(new Date(app.updatedAt || app.appliedAt)),
          avatar: getInitials(app.candidateName || "C")
        };
      });

      // Build priority roles
      const priorityRoles = activeJobs.slice(0, 3).map((job: any) => {
        const jobApps = applications.filter((app: any) =>
          String(app.jobId) === String(job._id)
        );
        return {
          _id: job._id,
          title: job.title,
          department: job.department || "Engineering",
          location: job.location || "Remote",
          type: job.type || "Full-time",
          totalApplicants: jobApps.length,
          needsReview: jobApps.filter((app: any) => app.status === "applied").length
        };
      });

      // Calculate metrics
      const activeCandidates = applications.filter((a: any) =>
        !["rejected", "hired"].includes(a.status)
      ).length;

      const acceptedOffers = analyticsRes?.offers?.accepted || 0;
      const totalOffers = analyticsRes?.offers?.total || 0;
      const offerAcceptance = totalOffers > 0 ? Math.round((acceptedOffers / totalOffers) * 100) : 0;

      // Calculate average time to hire
      const hiredApps = applications.filter((a: any) => a.status === "hired");
      let timeToHire = 18; // default
      if (hiredApps.length > 0) {
        const totalDays = hiredApps.reduce((sum: number, app: any) => {
          const applied = new Date(app.appliedAt).getTime();
          const hired = new Date(app.updatedAt || app.appliedAt).getTime();
          return sum + Math.max(1, Math.floor((hired - applied) / (1000 * 60 * 60 * 24)));
        }, 0);
        timeToHire = Math.round(totalDays / hiredApps.length);
      }

      setData({
        activeCandidates,
        openRoles: activeJobs.length,
        timeToHire,
        offerAcceptance,
        applicationVolume,
        recentActivity,
        priorityRoles
      });

    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error, refetch: fetchData };
}

// Helper function for time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// Helper function for initials
function getInitials(name: string): string {
  if (!name) return "?";
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Skeleton loader for metric cards
function MetricCardSkeleton() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data, loading, error, refetch } = useDashboardData();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
    toast({ title: "Dashboard refreshed", description: "Data updated successfully" });
  };

  if (error) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center h-[400px]">
          <Card className="p-8 text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Dashboard</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={refetch}>Try Again</Button>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">
      {/* Refresh Button */}
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* KPI Grid - 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            {/* Active Candidates Card */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Candidates
                </CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display">
                  {data?.activeCandidates?.toLocaleString() || "0"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">In pipeline</p>
              </CardContent>
            </Card>

            {/* Open Roles Card */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Open Roles
                </CardTitle>
                <Briefcase className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display">
                  {data?.openRoles || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Active job postings</p>
              </CardContent>
            </Card>

            {/* Time to Hire Card */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Time to Hire
                </CardTitle>
                <Clock className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display">
                  {data?.timeToHire || 0} days
                </div>
                <p className="text-xs text-muted-foreground mt-1">Average hiring time</p>
              </CardContent>
            </Card>

            {/* Offer Acceptance Card */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Offer Acceptance
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display">
                  {data?.offerAcceptance || 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Acceptance rate</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Chart + Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Application Volume Chart */}
        <Card className="col-span-1 lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Application Volume</CardTitle>
            <CardDescription>Incoming applications over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.applicationVolume || []}>
                  <defs>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="apps" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorApps)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from your team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {(data?.recentActivity || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
              ) : (
                data?.recentActivity.map((item, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${item.avatar === "AI" ? "bg-purple-100 text-purple-700" : "bg-secondary/10 text-secondary"
                      }`}>
                      {item.avatar}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm"><span className="font-medium">{item.user}</span> {item.action} <span className="font-medium">{item.target}</span></p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Button variant="outline" className="w-full mt-6" size="sm" onClick={() => navigate("/talent-discovery")}>
              View All Activity
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Priority Roles Table */}
      <Card className="shadow-sm mt-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Priority Roles</CardTitle>
            <CardDescription>High priority open positions needing attention</CardDescription>
          </div>
          <Button onClick={() => navigate("/jobs")}>View All Roles</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(data?.priorityRoles || []).length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No active job postings</p>
              </div>
            ) : (
              data?.priorityRoles.map((role) => (
                <div key={role._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate("/jobs")}>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-md">
                      <Briefcase className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{role.title}</h4>
                      <p className="text-sm text-muted-foreground">{role.department} • {role.location} • {role.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-lg font-bold">{role.totalApplicants}</p>
                      <p className="text-xs text-muted-foreground">Applicants</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-lg font-bold ${role.needsReview > 0 ? "text-warning" : "text-muted-foreground"}`}>{role.needsReview}</p>
                      <p className="text-xs text-muted-foreground">Needs Review</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}
