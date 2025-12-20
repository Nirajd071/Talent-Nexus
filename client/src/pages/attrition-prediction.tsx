/**
 * Attrition Prediction Page - FULLY FUNCTIONAL
 * AI-powered employee attrition risk prediction using Gemini AI
 */
import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
    TrendingDown, TrendingUp, AlertTriangle, Users, Brain, Target, BarChart3, Activity,
    Calendar, DollarSign, Award, Clock, Search, RefreshCw, Plus, ArrowUpRight,
    ArrowDownRight, Heart, Loader2, CheckCircle2, UserPlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AttritionRisk {
    _id: string;
    employeeId?: string;
    employeeName: string;
    employeeEmail?: string;
    role: string;
    department: string;
    tenure: string;
    riskScore: number;
    riskLevel: "Low" | "Medium" | "High" | "Critical";
    riskFactors: string[];
    primaryFactor?: string;
    recommendation?: string;
    engagementScore?: number;
    lastRaiseDate?: string;
    interventions?: { type: string; date: string; notes?: string }[];
    analyzedAt?: string;
}

interface DepartmentStat {
    name: string;
    employees: number;
    atRisk: number;
    avgRisk: number;
    trend: "up" | "down" | "stable";
}

const retentionActions = [
    { action: "Salary Review", impact: "High", effort: "Medium", description: "Market compensation analysis", icon: DollarSign },
    { action: "Career Path Discussion", impact: "High", effort: "Low", description: "1:1 with manager about growth", icon: Target },
    { action: "Project Assignment", impact: "Medium", effort: "Low", description: "Assign to high-visibility project", icon: Award },
    { action: "Training Budget", impact: "Medium", effort: "Medium", description: "Allocate learning resources", icon: Brain },
    { action: "Team Change", impact: "Medium", effort: "High", description: "Consider team transfer", icon: Users }
];

export default function AttritionPrediction() {
    const [searchQuery, setSearchQuery] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [risks, setRisks] = useState<AttritionRisk[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<AttritionRisk | null>(null);
    const [interventionOpen, setInterventionOpen] = useState(false);

    const [newEmployee, setNewEmployee] = useState({
        employeeName: "", employeeEmail: "", role: "", department: "",
        tenure: "1 year", engagementScore: 75, lastRaiseDate: "", lastPromotionDate: "",
        managerChanges: 0, workloadScore: 65
    });

    const { toast } = useToast();
    const token = localStorage.getItem("token");
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchRisks();
    }, []);

    const fetchRisks = async () => {
        setIsLoading(true);
        setIsRefreshing(true);
        try {
            const res = await fetch("/api/attrition/risks", { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setRisks(data);
                toast({ title: "✅ Refreshed", description: "Risk data reloaded" });
            }
        } catch (e) {
            console.error("Failed to fetch risks:", e);
            toast({ title: "Error", description: "Failed to fetch data", variant: "destructive" });
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleRunAnalysis = async () => {
        if (!newEmployee.employeeName) {
            toast({ title: "Error", description: "Employee name is required", variant: "destructive" });
            return;
        }

        setIsAnalyzing(true);
        try {
            const res = await fetch("/api/attrition/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(newEmployee)
            });

            if (res.ok) {
                const result = await res.json();
                setRisks(prev => [result, ...prev.filter(r => r.employeeName !== result.employeeName)]);
                setAddEmployeeOpen(false);
                setNewEmployee({ employeeName: "", employeeEmail: "", role: "", department: "", tenure: "1 year", engagementScore: 75, lastRaiseDate: "", lastPromotionDate: "", managerChanges: 0, workloadScore: 65 });
                toast({ title: "🧠 Analysis Complete", description: `${result.employeeName}: ${result.riskLevel} risk (${result.riskScore}%)` });
            } else {
                throw new Error("Analysis failed");
            }
        } catch (e) {
            toast({ title: "Error", description: "Failed to run analysis", variant: "destructive" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleIntervention = async (employee: AttritionRisk, interventionType: string) => {
        try {
            const res = await fetch(`/api/attrition/${employee._id}/intervention`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ type: interventionType, notes: `Scheduled for ${employee.employeeName}` })
            });

            if (res.ok) {
                const updated = await res.json();
                setRisks(prev => prev.map(r => r._id === updated._id ? updated : r));
                toast({ title: "✅ Intervention Scheduled", description: `${interventionType} for ${employee.employeeName}` });
            }
        } catch (e) {
            toast({ title: "Error", description: "Failed to schedule intervention", variant: "destructive" });
        }
    };

    const handleBulkAnalysis = async () => {
        setIsAnalyzing(true);
        toast({ title: "🧠 Running Bulk Analysis", description: "Analyzing all employees..." });
        try {
            await fetch("/api/attrition/analyze-all", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
            setTimeout(() => {
                fetchRisks();
                toast({ title: "✅ Bulk Analysis Complete" });
            }, 2000);
        } catch (e) {
            toast({ title: "Error", variant: "destructive" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getRiskColor = (level: string) => {
        switch (level?.toLowerCase()) {
            case "critical": case "high": return "bg-red-100 text-red-700 border-red-200";
            case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-200";
            case "low": return "bg-green-100 text-green-700 border-green-200";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    const getInitials = (name: string) => name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??";

    // Stats
    const highRisk = risks.filter(r => r.riskLevel === "High" || r.riskLevel === "Critical").length;
    const mediumRisk = risks.filter(r => r.riskLevel === "Medium").length;
    const avgScore = risks.length > 0 ? Math.round(risks.reduce((a, r) => a + (r.riskScore || 0), 0) / risks.length) : 0;

    // Compute department stats
    const departments = new Map<string, { total: number; atRisk: number; totalScore: number }>();
    risks.forEach(r => {
        const dept = r.department || "Unknown";
        const existing = departments.get(dept) || { total: 0, atRisk: 0, totalScore: 0 };
        departments.set(dept, {
            total: existing.total + 1,
            atRisk: existing.atRisk + (r.riskScore >= 50 ? 1 : 0),
            totalScore: existing.totalScore + (r.riskScore || 0)
        });
    });
    const departmentStats: DepartmentStat[] = Array.from(departments.entries()).map(([name, d]) => ({
        name,
        employees: d.total,
        atRisk: d.atRisk,
        avgRisk: Math.round(d.totalScore / d.total),
        trend: d.atRisk > d.total * 0.3 ? "up" : d.atRisk > d.total * 0.1 ? "stable" : "down"
    }));

    // Filter
    const filteredRisks = risks.filter(r => {
        const matchesSearch = r.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.role?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = departmentFilter === "all" || r.department?.toLowerCase() === departmentFilter;
        return matchesSearch && matchesDept;
    });

    return (
        <Layout title="Attrition Prediction">
            <Tabs defaultValue="overview" className="space-y-6">
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="overview">Risk Overview</TabsTrigger>
                        <TabsTrigger value="employees">At-Risk Employees</TabsTrigger>
                        <TabsTrigger value="departments">Department Analysis</TabsTrigger>
                        <TabsTrigger value="interventions">Interventions</TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-4">
                        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                            <SelectTrigger className="w-40"><SelectValue placeholder="Department" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Departments</SelectItem>
                                <SelectItem value="engineering">Engineering</SelectItem>
                                <SelectItem value="product">Product</SelectItem>
                                <SelectItem value="design">Design</SelectItem>
                                <SelectItem value="sales">Sales</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={fetchRisks} disabled={isRefreshing}>{isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}Refresh</Button>
                        <Button onClick={() => setAddEmployeeOpen(true)}><UserPlus className="h-4 w-4 mr-2" />Analyze Employee</Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-4">
                    <Card className="border-l-4 border-l-red-500">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div><p className="text-sm text-muted-foreground">High Risk</p><p className="text-3xl font-bold text-red-600">{highRisk}</p></div>
                                <AlertTriangle className="h-8 w-8 text-red-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-yellow-500">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div><p className="text-sm text-muted-foreground">Medium Risk</p><p className="text-3xl font-bold text-yellow-600">{mediumRisk}</p></div>
                                <Activity className="h-8 w-8 text-yellow-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-green-500">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div><p className="text-sm text-muted-foreground">Avg Risk Score</p><p className="text-3xl font-bold text-green-600">{avgScore}%</p></div>
                                <TrendingUp className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div><p className="text-sm text-muted-foreground">Total Analyzed</p><p className="text-3xl font-bold text-blue-600">{risks.length}</p></div>
                                <Users className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-3 gap-6">
                        <Card className="col-span-2">
                            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Risk Distribution</CardTitle></CardHeader>
                            <CardContent>
                                {departmentStats.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground"><p>No data. Add employees for analysis.</p></div>
                                ) : (
                                    <div className="space-y-4">
                                        {departmentStats.map(dept => (
                                            <div key={dept.name} className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium">{dept.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-muted-foreground">{dept.atRisk}/{dept.employees} at risk</span>
                                                        {dept.trend === "up" && <ArrowUpRight className="h-4 w-4 text-red-500" />}
                                                        {dept.trend === "down" && <ArrowDownRight className="h-4 w-4 text-green-500" />}
                                                    </div>
                                                </div>
                                                <Progress value={dept.avgRisk} className="h-2" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Top Risk Factors</CardTitle></CardHeader>
                            <CardContent>
                                {risks.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No analysis data yet</p>
                                ) : (
                                    <div className="space-y-3">
                                        {(() => {
                                            const factorCounts = new Map<string, number>();
                                            risks.forEach(r => r.riskFactors?.forEach(f => factorCounts.set(f, (factorCounts.get(f) || 0) + 1)));
                                            return Array.from(factorCounts.entries())
                                                .sort((a, b) => b[1] - a[1])
                                                .slice(0, 5)
                                                .map(([factor, count], i) => (
                                                    <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                                        <span className="text-sm">{factor}</span>
                                                        <Badge variant="outline">{count}</Badge>
                                                    </div>
                                                ));
                                        })()}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Employees Tab */}
                <TabsContent value="employees" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div><CardTitle>At-Risk Employees</CardTitle><CardDescription>Employees analyzed by AI for attrition risk</CardDescription></div>
                                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 w-64" /></div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                            ) : filteredRisks.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No employees analyzed yet</p>
                                    <Button className="mt-4" onClick={() => setAddEmployeeOpen(true)}>Analyze First Employee</Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredRisks.map(emp => (
                                        <div key={emp._id} className={`p-4 border rounded-lg ${getRiskColor(emp.riskLevel)}`}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-4">
                                                    <Avatar className="h-12 w-12"><AvatarFallback className="bg-white font-bold">{getInitials(emp.employeeName)}</AvatarFallback></Avatar>
                                                    <div>
                                                        <p className="font-semibold">{emp.employeeName}</p>
                                                        <p className="text-sm opacity-80">{emp.role} • {emp.department}</p>
                                                        <p className="text-xs opacity-60">Tenure: {emp.tenure}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-2xl font-bold">{emp.riskScore}%</span>
                                                        <Badge className={getRiskColor(emp.riskLevel)}>{emp.riskLevel}</Badge>
                                                    </div>
                                                    {emp.recommendation && <p className="text-xs max-w-48">{emp.recommendation}</p>}
                                                </div>
                                            </div>
                                            {emp.riskFactors && emp.riskFactors.length > 0 && (
                                                <div className="mt-4">
                                                    <p className="text-xs font-medium mb-2">Risk Factors:</p>
                                                    <div className="flex flex-wrap gap-2">{emp.riskFactors.map((f, i) => <Badge key={i} variant="outline" className="bg-white/50">{f}</Badge>)}</div>
                                                </div>
                                            )}
                                            <div className="mt-4 flex gap-2">
                                                <Button size="sm" variant="secondary" className="bg-white/80" onClick={() => handleIntervention(emp, "1:1 Meeting")}><Calendar className="h-4 w-4 mr-1" />Schedule 1:1</Button>
                                                <Button size="sm" variant="secondary" className="bg-white/80" onClick={() => handleIntervention(emp, "Salary Review")}><DollarSign className="h-4 w-4 mr-1" />Salary Review</Button>
                                                <Button size="sm" variant="secondary" className="bg-white/80" onClick={() => handleIntervention(emp, "Career Discussion")}><Award className="h-4 w-4 mr-1" />Career Path</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Departments Tab */}
                <TabsContent value="departments" className="space-y-6">
                    {departmentStats.length === 0 ? (
                        <Card><CardContent className="py-12 text-center text-muted-foreground"><p>No department data. Analyze employees first.</p></CardContent></Card>
                    ) : (
                        <div className="grid grid-cols-3 gap-4">
                            {departmentStats.map(dept => (
                                <Card key={dept.name}>
                                    <CardHeader><CardTitle className="text-lg">{dept.name}</CardTitle><CardDescription>{dept.employees} employees</CardDescription></CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex justify-between"><span className="text-sm text-muted-foreground">At Risk</span><span className="font-bold text-red-600">{dept.atRisk}</span></div>
                                            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Avg Score</span><span className="font-bold">{dept.avgRisk}%</span></div>
                                            <Progress value={dept.avgRisk} className="h-2" />
                                            <Badge className={dept.trend === "up" ? "bg-red-100 text-red-700" : dept.trend === "down" ? "bg-green-100 text-green-700" : "bg-gray-100"}>
                                                {dept.trend === "up" ? "↑ Increasing" : dept.trend === "down" ? "↓ Decreasing" : "→ Stable"}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Interventions Tab */}
                <TabsContent value="interventions" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5 text-red-500" />Retention Strategies</CardTitle>
                            <CardDescription>Apply interventions to at-risk employees</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {retentionActions.map((action, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-muted rounded-lg"><action.icon className="h-5 w-5" /></div>
                                            <div><p className="font-medium">{action.action}</p><p className="text-sm text-muted-foreground">{action.description}</p></div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-center"><p className={`text-sm font-medium ${action.impact === "High" ? "text-green-600" : "text-yellow-600"}`}>{action.impact}</p><p className="text-xs text-muted-foreground">Impact</p></div>
                                            <div className="text-center"><p className="text-sm font-medium">{action.effort}</p><p className="text-xs text-muted-foreground">Effort</p></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Add Employee Dialog */}
            <Dialog open={addEmployeeOpen} onOpenChange={setAddEmployeeOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Analyze Employee for Attrition Risk</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Name *</Label><Input value={newEmployee.employeeName} onChange={(e) => setNewEmployee(prev => ({ ...prev, employeeName: e.target.value }))} placeholder="John Doe" /></div>
                            <div><Label>Email</Label><Input value={newEmployee.employeeEmail} onChange={(e) => setNewEmployee(prev => ({ ...prev, employeeEmail: e.target.value }))} placeholder="john@company.com" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Role</Label><Input value={newEmployee.role} onChange={(e) => setNewEmployee(prev => ({ ...prev, role: e.target.value }))} placeholder="Software Engineer" /></div>
                            <div><Label>Department</Label><Select value={newEmployee.department} onValueChange={(v) => setNewEmployee(prev => ({ ...prev, department: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="Engineering">Engineering</SelectItem><SelectItem value="Product">Product</SelectItem><SelectItem value="Design">Design</SelectItem><SelectItem value="Sales">Sales</SelectItem><SelectItem value="Marketing">Marketing</SelectItem></SelectContent></Select></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Tenure</Label><Input value={newEmployee.tenure} onChange={(e) => setNewEmployee(prev => ({ ...prev, tenure: e.target.value }))} placeholder="2 years" /></div>
                            <div><Label>Engagement Score (0-100)</Label><Input type="number" value={newEmployee.engagementScore} onChange={(e) => setNewEmployee(prev => ({ ...prev, engagementScore: parseInt(e.target.value) || 0 }))} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Last Raise Date</Label><Input type="date" value={newEmployee.lastRaiseDate} onChange={(e) => setNewEmployee(prev => ({ ...prev, lastRaiseDate: e.target.value }))} /></div>
                            <div><Label>Last Promotion Date</Label><Input type="date" value={newEmployee.lastPromotionDate} onChange={(e) => setNewEmployee(prev => ({ ...prev, lastPromotionDate: e.target.value }))} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Manager Changes</Label><Input type="number" value={newEmployee.managerChanges} onChange={(e) => setNewEmployee(prev => ({ ...prev, managerChanges: parseInt(e.target.value) || 0 }))} /></div>
                            <div><Label>Workload Score (0-100)</Label><Input type="number" value={newEmployee.workloadScore} onChange={(e) => setNewEmployee(prev => ({ ...prev, workloadScore: parseInt(e.target.value) || 0 }))} /></div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddEmployeeOpen(false)}>Cancel</Button>
                        <Button onClick={handleRunAnalysis} disabled={isAnalyzing}>
                            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
                            Run AI Analysis
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
