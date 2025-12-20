/**
 * Learning Readiness Page - FULLY FUNCTIONAL
 * LMS integration for new hire training and skill development tracking
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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Brain,
    BookOpen,
    Award,
    Clock,
    CheckCircle2,
    Play,
    Users,
    GraduationCap,
    Plus,
    Search,
    RefreshCw,
    Trash2,
    Edit,
    ExternalLink,
    Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Interfaces
interface TrainingModule {
    _id: string;
    title: string;
    description: string;
    contentUrl: string;
    contentType: "video" | "document" | "quiz" | "interactive";
    duration: number;
    required: boolean;
    department: string;
    role: string;
    isActive: boolean;
}

interface NewHireTraining {
    _id: string;
    candidateId: string;
    candidateName: string;
    candidateEmail: string;
    role: string;
    department: string;
    startDate: string;
    progress: number;
    completedModules: string[];
    assignedModules: TrainingModule[];
    certifications: { name: string; earnedAt: string }[];
    status: "not-started" | "in-progress" | "completed" | "at-risk";
    lastActivityAt: string;
}

interface LMSIntegration {
    _id: string;
    name: string;
    provider: string;
    status: "connected" | "pending" | "disconnected" | "error";
    icon: string;
    config?: {
        apiKey?: string;
        clientId?: string;
        baseUrl?: string;
    };
    connectedAt?: string;
    lastSyncAt?: string;
    syncStatus?: "idle" | "syncing" | "error";
    coursesImported?: number;
}

export default function LearningReadiness() {
    const [searchQuery, setSearchQuery] = useState("");
    const [modules, setModules] = useState<TrainingModule[]>([]);
    const [trainingRecords, setTrainingRecords] = useState<NewHireTraining[]>([]);
    const [lmsIntegrations, setLmsIntegrations] = useState<LMSIntegration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dialog states
    const [addCourseOpen, setAddCourseOpen] = useState(false);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<NewHireTraining | null>(null);
    const [lmsConfigOpen, setLmsConfigOpen] = useState(false);
    const [selectedLms, setSelectedLms] = useState<LMSIntegration | null>(null);
    const [lmsConfig, setLmsConfig] = useState({ apiKey: "", clientId: "", baseUrl: "" });

    // New course form
    const [newCourse, setNewCourse] = useState({
        title: "",
        description: "",
        contentUrl: "",
        contentType: "video" as "video" | "document" | "quiz" | "interactive",
        duration: 30,
        required: false,
        department: "",
        role: ""
    });

    const { toast } = useToast();
    const token = localStorage.getItem("token");
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Fetch data on mount
    useEffect(() => {
        fetchModules();
        fetchTrainingRecords();
        fetchLmsIntegrations();
    }, []);

    const fetchAll = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([fetchModules(), fetchTrainingRecords(), fetchLmsIntegrations()]);
            toast({ title: "✅ Refreshed", description: "Data reloaded" });
        } catch (e) {
            toast({ title: "Error", description: "Failed to refresh", variant: "destructive" });
        } finally {
            setIsRefreshing(false);
        }
    };

    const fetchModules = async () => {
        try {
            const res = await fetch("/api/training/modules", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setModules(data);
            }
        } catch (error) {
            console.error("Failed to fetch modules:", error);
        }
    };

    const fetchTrainingRecords = async () => {
        try {
            const res = await fetch("/api/training/all/records", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTrainingRecords(data);
            }
        } catch (error) {
            console.error("Failed to fetch training records:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLmsIntegrations = async () => {
        try {
            const res = await fetch("/api/lms/integrations", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLmsIntegrations(data);
            }
        } catch (error) {
            console.error("Failed to fetch LMS integrations:", error);
        }
    };

    const handleLmsConnect = async () => {
        if (!selectedLms) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/lms/integrations/${selectedLms._id}/connect`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ config: lmsConfig })
            });
            if (res.ok) {
                const { integration } = await res.json();
                setLmsIntegrations(prev => prev.map(l => l._id === integration._id ? integration : l));
                setLmsConfigOpen(false);
                toast({ title: "✅ Connected", description: `${integration.name} is now connected` });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to connect", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLmsDisconnect = async (lms: LMSIntegration) => {
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/lms/integrations/${lms._id}/disconnect`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const { integration } = await res.json();
                setLmsIntegrations(prev => prev.map(l => l._id === integration._id ? integration : l));
                toast({ title: "Disconnected", description: `${lms.name} has been disconnected` });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to disconnect", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLmsSync = async (lms: LMSIntegration) => {
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/lms/integrations/${lms._id}/sync`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const result = await res.json();
                toast({ title: "🔄 Synced", description: result.message });
                fetchModules(); // Refresh courses
                fetchLmsIntegrations(); // Refresh LMS data
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to sync", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const openLmsConfig = (lms: LMSIntegration) => {
        setSelectedLms(lms);
        setLmsConfig({
            apiKey: lms.config?.apiKey || "",
            clientId: lms.config?.clientId || "",
            baseUrl: lms.config?.baseUrl || ""
        });
        setLmsConfigOpen(true);
    };

    const handleCreateCourse = async () => {
        if (!newCourse.title) {
            toast({ title: "Error", description: "Course title is required", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/training/modules", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(newCourse)
            });

            if (res.ok) {
                const created = await res.json();
                setModules(prev => [...prev, created]);
                setAddCourseOpen(false);
                setNewCourse({
                    title: "",
                    description: "",
                    contentUrl: "",
                    contentType: "video",
                    duration: 30,
                    required: false,
                    department: "",
                    role: ""
                });
                toast({ title: "✅ Course Created", description: `${created.title} has been added` });
            } else {
                throw new Error("Failed to create course");
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to create course", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAssignCourse = async (moduleId: string) => {
        if (!selectedEmployee) return;

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/training/update", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: selectedEmployee.candidateId,
                    moduleId,
                    completed: true
                })
            });

            if (res.ok) {
                const result = await res.json();
                // Optimistic UI update
                setTrainingRecords(prev => prev.map(r =>
                    r._id === selectedEmployee._id
                        ? { ...r, progress: result.progress, status: result.status, completedModules: [...r.completedModules, moduleId] }
                        : r
                ));
                toast({ title: "✅ Progress Updated", description: `Module marked as complete` });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to update progress", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenAssignDialog = (employee: NewHireTraining) => {
        setSelectedEmployee(employee);
        setAssignDialogOpen(true);
    };

    const handlePreview = (url: string) => {
        if (url) {
            window.open(url, "_blank");
        } else {
            toast({ title: "No Preview", description: "This course doesn't have a content URL yet", variant: "destructive" });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "bg-green-100 text-green-700";
            case "in-progress": return "bg-blue-100 text-blue-700";
            case "at-risk": return "bg-red-100 text-red-700";
            case "not-started": return "bg-gray-100 text-gray-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    const getInitials = (name: string) => {
        return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    };

    // Calculate stats
    const totalNewHires = trainingRecords.length;
    const avgCompletion = trainingRecords.length > 0
        ? Math.round(trainingRecords.reduce((acc, r) => acc + r.progress, 0) / trainingRecords.length)
        : 0;
    const totalCertifications = trainingRecords.reduce((acc, r) => acc + (r.certifications?.length || 0), 0);
    const totalCourses = modules.length;

    // Filter records based on search
    const filteredRecords = trainingRecords.filter(r =>
        r.candidateName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.department?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredModules = modules.filter(m =>
        m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Layout title="Learning Readiness">
            <Tabs defaultValue="overview" className="space-y-6">
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="employees">New Hires</TabsTrigger>
                        <TabsTrigger value="courses">Courses</TabsTrigger>
                        <TabsTrigger value="integrations">LMS Integrations</TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search employees or courses..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 w-64"
                            />
                        </div>
                        <Button onClick={fetchAll} variant="outline" disabled={isRefreshing}>
                            {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                            Refresh
                        </Button>
                        <Button onClick={() => setAddCourseOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Course
                        </Button>
                    </div>
                </div>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-100 rounded-lg">
                                        <Users className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{totalNewHires}</p>
                                        <p className="text-sm text-muted-foreground">Active New Hires</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-100 rounded-lg">
                                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{avgCompletion}%</p>
                                        <p className="text-sm text-muted-foreground">Avg. Completion</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-purple-100 rounded-lg">
                                        <Award className="h-6 w-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{totalCertifications}</p>
                                        <p className="text-sm text-muted-foreground">Certifications Earned</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-orange-100 rounded-lg">
                                        <BookOpen className="h-6 w-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{totalCourses}</p>
                                        <p className="text-sm text-muted-foreground">Total Courses</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* New Hires Learning Progress */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Brain className="h-5 w-5 text-primary" />
                                New Hire Learning Progress
                            </CardTitle>
                            <CardDescription>Track onboarding learning status for recent hires</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : filteredRecords.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No training records found</p>
                                    <p className="text-sm">New hires will appear here when they start training</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredRecords.map(employee => (
                                        <div key={employee._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                        {getInitials(employee.candidateName || "NH")}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{employee.candidateName}</p>
                                                    <p className="text-sm text-muted-foreground">{employee.role} • {employee.department}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-center">
                                                    <p className="text-sm font-medium">
                                                        {employee.completedModules?.length || 0}/{employee.assignedModules?.length || 0}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">Courses</p>
                                                </div>
                                                <div className="w-32">
                                                    <Progress value={employee.progress} className="h-2" />
                                                    <p className="text-xs text-muted-foreground mt-1">{employee.progress}% Complete</p>
                                                </div>
                                                <Badge className={getStatusColor(employee.status)}>
                                                    {employee.status?.replace("-", " ") || "not started"}
                                                </Badge>
                                                <Button variant="outline" size="sm" onClick={() => handleOpenAssignDialog(employee)}>
                                                    <BookOpen className="h-4 w-4 mr-1" />
                                                    Manage
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Employees Tab */}
                <TabsContent value="employees" className="space-y-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {filteredRecords.map(employee => (
                                <Card key={employee._id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Avatar className="h-12 w-12">
                                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                    {getInitials(employee.candidateName || "NH")}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold">{employee.candidateName}</p>
                                                <p className="text-sm text-muted-foreground">{employee.role}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Start Date</span>
                                                <span className="font-medium">
                                                    {employee.startDate ? new Date(employee.startDate).toLocaleDateString() : "N/A"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Courses</span>
                                                <span className="font-medium">
                                                    {employee.completedModules?.length || 0}/{employee.assignedModules?.length || 0} completed
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Certifications</span>
                                                <span className="font-medium">{employee.certifications?.length || 0}</span>
                                            </div>
                                            <Progress value={employee.progress} className="h-2" />
                                            <div className="flex justify-between items-center">
                                                <Badge className={getStatusColor(employee.status)}>
                                                    {employee.status?.replace("-", " ") || "not started"}
                                                </Badge>
                                                <Button size="sm" variant="outline" onClick={() => handleOpenAssignDialog(employee)}>
                                                    View Details
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Courses Tab */}
                <TabsContent value="courses" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <BookOpen className="h-5 w-5" />
                                        Training Courses ({modules.length})
                                    </CardTitle>
                                    <CardDescription>Manage onboarding and training content</CardDescription>
                                </div>
                                <Button onClick={() => setAddCourseOpen(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Course
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {modules.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No courses created yet</p>
                                    <Button className="mt-4" onClick={() => setAddCourseOpen(true)}>
                                        Create First Course
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredModules.map(course => (
                                        <div key={course._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-primary/10 rounded-lg">
                                                    <GraduationCap className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{course.title}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {course.duration} mins • {course.contentType} • {course.department || "All Depts"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge variant={course.required ? "destructive" : "secondary"}>
                                                    {course.required ? "Required" : "Optional"}
                                                </Badge>
                                                <Badge variant="outline">{course.contentType}</Badge>
                                                <Button variant="outline" size="sm" onClick={() => handlePreview(course.contentUrl)}>
                                                    <ExternalLink className="h-4 w-4 mr-1" />
                                                    Open
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Integrations Tab */}
                <TabsContent value="integrations" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ExternalLink className="h-5 w-5" />
                                LMS Integrations
                            </CardTitle>
                            <CardDescription>Connect external learning management systems to import courses and sync progress</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {lmsIntegrations.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                                    <p>Loading integrations...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {lmsIntegrations.map((lms) => (
                                        <div key={lms._id} className={`p-4 border rounded-lg ${lms.status === "connected" ? "border-green-200 bg-green-50/50" : ""}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-3xl">{lms.icon}</span>
                                                    <div>
                                                        <p className="font-semibold">{lms.name}</p>
                                                        <div className="flex items-center gap-2">
                                                            <Badge className={
                                                                lms.status === "connected" ? "bg-green-100 text-green-700" :
                                                                    lms.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                                                                        "bg-gray-100 text-gray-600"
                                                            }>
                                                                {lms.status}
                                                            </Badge>
                                                            {lms.coursesImported && lms.coursesImported > 0 && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    {lms.coursesImported} courses imported
                                                                </span>
                                                            )}
                                                        </div>
                                                        {lms.lastSyncAt && (
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                Last synced: {new Date(lms.lastSyncAt).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {lms.status === "connected" ? (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleLmsSync(lms)}
                                                                disabled={isSubmitting || lms.syncStatus === "syncing"}
                                                            >
                                                                {lms.syncStatus === "syncing" ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <RefreshCw className="h-4 w-4 mr-1" />
                                                                )}
                                                                Sync
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openLmsConfig(lms)}
                                                            >
                                                                Configure
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-600 hover:text-red-700"
                                                                onClick={() => handleLmsDisconnect(lms)}
                                                                disabled={isSubmitting}
                                                            >
                                                                Disconnect
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button onClick={() => openLmsConfig(lms)}>
                                                            Connect
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Add Course Dialog */}
            <Dialog open={addCourseOpen} onOpenChange={setAddCourseOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Training Course</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Course Title *</Label>
                            <Input
                                value={newCourse.title}
                                onChange={(e) => setNewCourse(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="e.g., Company Onboarding"
                            />
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea
                                value={newCourse.description}
                                onChange={(e) => setNewCourse(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Course description..."
                            />
                        </div>
                        <div>
                            <Label>Content URL</Label>
                            <Input
                                value={newCourse.contentUrl}
                                onChange={(e) => setNewCourse(prev => ({ ...prev, contentUrl: e.target.value }))}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Content Type</Label>
                                <Select
                                    value={newCourse.contentType}
                                    onValueChange={(v) => setNewCourse(prev => ({ ...prev, contentType: v as any }))}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="video">Video</SelectItem>
                                        <SelectItem value="document">Document</SelectItem>
                                        <SelectItem value="quiz">Quiz</SelectItem>
                                        <SelectItem value="interactive">Interactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Duration (mins)</Label>
                                <Input
                                    type="number"
                                    value={newCourse.duration}
                                    onChange={(e) => setNewCourse(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Department</Label>
                                <Input
                                    value={newCourse.department}
                                    onChange={(e) => setNewCourse(prev => ({ ...prev, department: e.target.value }))}
                                    placeholder="e.g., Engineering"
                                />
                            </div>
                            <div>
                                <Label>Role</Label>
                                <Input
                                    value={newCourse.role}
                                    onChange={(e) => setNewCourse(prev => ({ ...prev, role: e.target.value }))}
                                    placeholder="e.g., Developer"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={newCourse.required}
                                onCheckedChange={(checked) => setNewCourse(prev => ({ ...prev, required: !!checked }))}
                            />
                            <Label>Required for all new hires</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddCourseOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateCourse} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Create Course
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign/Manage Dialog */}
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Manage Training - {selectedEmployee?.candidateName}</DialogTitle>
                    </DialogHeader>
                    {selectedEmployee && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-lg">
                                <div className="flex justify-between mb-2">
                                    <span>Overall Progress</span>
                                    <span className="font-bold">{selectedEmployee.progress}%</span>
                                </div>
                                <Progress value={selectedEmployee.progress} className="h-3" />
                            </div>

                            <div>
                                <Label className="block mb-2">Mark Courses Complete</Label>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {modules.map(module => {
                                        const isCompleted = selectedEmployee.completedModules?.includes(module._id);
                                        return (
                                            <div key={module._id} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    {isCompleted ? (
                                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                    ) : (
                                                        <Clock className="h-5 w-5 text-muted-foreground" />
                                                    )}
                                                    <div>
                                                        <p className="font-medium">{module.title}</p>
                                                        <p className="text-xs text-muted-foreground">{module.duration} mins</p>
                                                    </div>
                                                </div>
                                                {!isCompleted && (
                                                    <Button size="sm" onClick={() => handleAssignCourse(module._id)} disabled={isSubmitting}>
                                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete"}
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* LMS Configuration Dialog */}
            <Dialog open={lmsConfigOpen} onOpenChange={setLmsConfigOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {selectedLms?.status === "connected" ? "Configure" : "Connect"} {selectedLms?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>API Key</Label>
                            <Input
                                type="password"
                                value={lmsConfig.apiKey}
                                onChange={(e) => setLmsConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                                placeholder="Enter API key..."
                            />
                        </div>
                        <div>
                            <Label>Client ID</Label>
                            <Input
                                value={lmsConfig.clientId}
                                onChange={(e) => setLmsConfig(prev => ({ ...prev, clientId: e.target.value }))}
                                placeholder="Enter client ID..."
                            />
                        </div>
                        <div>
                            <Label>Base URL (optional)</Label>
                            <Input
                                value={lmsConfig.baseUrl}
                                onChange={(e) => setLmsConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                                placeholder="https://api.example.com"
                            />
                        </div>
                        {selectedLms?.provider && (
                            <div className="p-3 bg-muted rounded-lg text-sm">
                                <p className="font-medium mb-1">Provider: {selectedLms.provider}</p>
                                <p className="text-muted-foreground text-xs">
                                    Enter your {selectedLms.name} credentials to enable course synchronization.
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setLmsConfigOpen(false)}>Cancel</Button>
                        <Button onClick={handleLmsConnect} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {selectedLms?.status === "connected" ? "Update" : "Connect"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
