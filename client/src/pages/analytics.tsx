import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Calendar, Loader2, Users, Briefcase, Target, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

// Fallback mock data
const defaultFunnelData = [
  { name: "Applied", value: 0, percentage: 100 },
  { name: "Screening", value: 0, percentage: 0 },
  { name: "Interviewed", value: 0, percentage: 0 },
  { name: "Offered", value: 0, percentage: 0 },
  { name: "Hired", value: 0, percentage: 0 },
];

const defaultSourceData = [
  { name: "LinkedIn", value: 45, color: "#0A66C2" },
  { name: "Careers Page", value: 25, color: "#057642" },
  { name: "Referrals", value: 20, color: "#8B5CF6" },
  { name: "Direct", value: 10, color: "#F5A623" },
];

const defaultTeamData = [
  { name: "No recruiters yet", hires: 0, avgTime: "-", satisfaction: "-" },
];

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [funnelData, setFunnelData] = useState(defaultFunnelData);
  const [sourceData, setSourceData] = useState<any[]>(defaultSourceData);
  const [timeToHireData, setTimeToHireData] = useState<any[]>([]);
  const [teamData, setTeamData] = useState<any[]>(defaultTeamData);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch dashboard summary
      const dashRes = await fetch("/api/analytics/dashboard", { headers });
      if (dashRes.ok) setDashboard(await dashRes.json());

      // Fetch funnel data
      const funnelRes = await fetch("/api/analytics/funnel", { headers });
      if (funnelRes.ok) {
        const funnel = await funnelRes.json();
        setFunnelData(funnel.stages || defaultFunnelData);
      }

      // Fetch time-to-hire
      const tthRes = await fetch("/api/analytics/time-to-hire", { headers });
      if (tthRes.ok) {
        const tth = await tthRes.json();
        setTimeToHireData(tth.trend || []);
      }

      // Fetch sources
      const srcRes = await fetch("/api/analytics/sources", { headers });
      if (srcRes.ok) {
        const src = await srcRes.json();
        if (src.sources?.length > 0) {
          const colors = ["#0A66C2", "#057642", "#8B5CF6", "#F5A623", "#EC4899"];
          setSourceData(src.sources.map((s: any, i: number) => ({
            name: s.name,
            value: s.count,
            color: colors[i % colors.length],
            conversionRate: s.conversionRate || 0
          })));
        }
      }

      // Fetch team performance
      const teamRes = await fetch("/api/analytics/team", { headers });
      if (teamRes.ok) {
        const team = await teamRes.json();
        if (team.team?.length > 0) {
          setTeamData(team.team);
        }
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Layout title="Analytics & Insights">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Select defaultValue="this-quarter">
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="this-quarter">This Quarter</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="last-year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all-depts">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-depts">All Departments</SelectItem>
              <SelectItem value="engineering">Engineering</SelectItem>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Export Report
        </Button>
      </div>

      <Tabs defaultValue="hiring" className="space-y-6">
        <TabsList>
          <TabsTrigger value="hiring">Hiring Funnel</TabsTrigger>
          <TabsTrigger value="sources">Sourcing</TabsTrigger>
          <TabsTrigger value="team">Team Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="hiring" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Conversion</CardTitle>
                <CardDescription>Candidate drop-off rates across stages</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Time to Hire Trend</CardTitle>
                <CardDescription>Average days to fill open roles</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeToHireData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="days" stroke="hsl(var(--secondary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sources" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Source Breakdown</CardTitle>
                <CardDescription>Where are candidates coming from?</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Source Quality</CardTitle>
                <CardDescription>Conversion rate by channel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sourceData.map((source: any) => (
                    <div key={source.name} className="flex items-center gap-4">
                      <div className="w-32 font-medium text-sm">{source.name}</div>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${source.conversionRate || 30}%`, backgroundColor: source.color }}
                        />
                      </div>
                      <div className="w-12 text-right text-sm text-muted-foreground">
                        {source.conversionRate || 0}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recruiter Performance</CardTitle>
              <CardDescription>Key metrics per team member</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-medium">
                    <tr>
                      <th className="p-4">Recruiter</th>
                      <th className="p-4">Hires Made</th>
                      <th className="p-4">Avg Time to Hire</th>
                      <th className="p-4">Hiring Manager CSAT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {teamData.map((person: any) => (
                      <tr key={person.name} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-medium">{person.name}</td>
                        <td className="p-4">{person.hires}</td>
                        <td className="p-4">{person.avgTime}</td>
                        <td className="p-4 flex items-center gap-1">
                          {person.satisfaction}
                          <span className="text-yellow-500">★</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
