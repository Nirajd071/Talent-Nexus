import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, AlertCircle, Calendar, FileText, Laptop, Loader2, RefreshCw, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NewHire {
  _id: string;
  candidateName: string;
  candidateEmail: string;
  role: string;
  department?: string;
  startDate?: string;
  signedAt?: string;
  readinessScore: number;
  status: "On Track" | "In Progress" | "Needs Attention";
  tasks: {
    contractSigned: boolean;
    equipmentSetup: boolean;
    teamIntroduction: boolean;
    complianceTraining: boolean;
  };
}

interface Analytics {
  totalNewHires: number;
  avgReadiness: number;
  onTrack: number;
  needsAttention: number;
  engagementScore: number;
  attritionRisk: string;
}

const taskIcons = [
  { key: "contractSigned", title: "Contract Signed", icon: FileText },
  { key: "equipmentSetup", title: "IT Equipment Setup", icon: Laptop },
  { key: "teamIntroduction", title: "Team Introduction", icon: Calendar },
  { key: "complianceTraining", title: "Compliance Training", icon: CheckCircle2 },
];

export default function Onboarding() {
  const [newHires, setNewHires] = useState<NewHire[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { toast } = useToast();
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [hiresRes, analyticsRes] = await Promise.all([
        fetch("/api/onboarding/new-hires", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/onboarding/analytics", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (hiresRes.ok) setNewHires(await hiresRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
    } catch (error) {
      console.error("Failed to fetch onboarding data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchData();
    toast({ title: "Refreshed", description: "Onboarding data updated" });
    setIsRefreshing(false);
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "TBD";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (isLoading) {
    return (
      <Layout title="Onboarding & Readiness">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Onboarding & Readiness">
      <div className="flex justify-end mb-4">
        <Button variant="outline" onClick={refreshData} className="gap-2" disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main List */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Onboarding</CardTitle>
              <CardDescription>Track progress of new hires joining the team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {newHires.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No New Hires</h3>
                  <p className="text-muted-foreground">Accepted offers will appear here for onboarding tracking.</p>
                </div>
              ) : (
                newHires.map((hire) => (
                  <div key={hire._id} className="flex flex-col gap-4 p-4 border border-border rounded-lg bg-card/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">{getInitials(hire.candidateName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-foreground">{hire.candidateName}</h4>
                          <p className="text-sm text-muted-foreground">{hire.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">Starts {formatDate(hire.startDate)}</p>
                          <Badge variant={hire.status === "On Track" ? "outline" : hire.status === "In Progress" ? "secondary" : "destructive"} className="mt-1">
                            {hire.status}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="icon">
                          <AlertCircle className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Readiness Score</span>
                        <span>{hire.readinessScore}%</span>
                      </div>
                      <Progress value={hire.readinessScore} className="h-2" />
                    </div>

                    <div className="flex gap-2 mt-2">
                      {taskIcons.map((task) => {
                        const isComplete = hire.tasks[task.key as keyof typeof hire.tasks];
                        return (
                          <div
                            key={task.key}
                            className={`flex-1 flex items-center justify-center p-2 rounded border ${isComplete ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-muted border-border text-muted-foreground'}`}
                            title={task.title}
                          >
                            <task.icon className="w-4 h-4" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar/Analytics */}
        <div className="space-y-6">
          <Card className="bg-primary text-primary-foreground border-none">
            <CardHeader>
              <CardTitle className="text-primary-foreground">Early Attrition Risk</CardTitle>
              <CardDescription className="text-primary-foreground/80">AI Prediction Model</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-2">{analytics?.attritionRisk || "N/A"}</div>
              <p className="text-sm opacity-90 mb-4">
                Based on {analytics?.totalNewHires || 0} new hire(s) with {analytics?.avgReadiness || 0}% avg readiness.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Engagement Score</span>
                  <span className="font-bold">{analytics?.engagementScore || 0}/10</span>
                </div>
                <Progress value={(analytics?.engagementScore || 0) * 10} className="h-1.5 bg-primary-foreground/20 [&>div]:bg-primary-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Onboarding Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{analytics?.totalNewHires || 0}</p>
                  <p className="text-xs text-muted-foreground">Total New Hires</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{analytics?.onTrack || 0}</p>
                  <p className="text-xs text-muted-foreground">On Track</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{analytics?.avgReadiness || 0}%</p>
                  <p className="text-xs text-muted-foreground">Avg Readiness</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{analytics?.needsAttention || 0}</p>
                  <p className="text-xs text-muted-foreground">Needs Attention</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </Layout>
  );
}
