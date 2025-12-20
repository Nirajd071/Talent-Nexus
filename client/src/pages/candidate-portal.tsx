import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
    CheckCircle2,
    Circle,
    Upload,
    FileText,
    User,
    Building,
    Calendar,
    Clock,
    AlertTriangle,
    RefreshCcw,
    Laptop,
    Users,
    Shield,
    Loader2,
    PartyPopper
} from "lucide-react";

interface Task {
    _id: string;
    title: string;
    category: string;
    status: string;
    dueDate: string;
    priority: string;
}

interface Document {
    _id: string;
    documentType: string;
    fileName: string;
    status: string;
}

export default function CandidatePortal() {
    const [loading, setLoading] = useState(true);
    const [portalData, setPortalData] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();

    // Get email from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const candidateEmail = urlParams.get("email") || localStorage.getItem("candidateEmail") || "";

    useEffect(() => {
        if (candidateEmail) {
            fetchPortalData();
            logEngagement("login");
        }
    }, [candidateEmail]);

    const fetchPortalData = async () => {
        try {
            const res = await fetch(`/api/onboarding/portal/${candidateEmail}`);
            if (res.ok) {
                setPortalData(await res.json());
            }
        } catch (error) {
            console.error("Failed to fetch portal data");
        } finally {
            setLoading(false);
        }
    };

    const logEngagement = async (eventType: string, page?: string) => {
        try {
            await fetch("/api/onboarding/engagement", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ candidateEmail, eventType, page: page || window.location.pathname })
            });
        } catch (error) {
            // Silent fail for engagement logging
        }
    };

    const handleTaskComplete = async (taskId: string) => {
        try {
            await fetch(`/api/onboarding/tasks/${taskId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "completed" })
            });
            logEngagement("task_completed");
            toast({ title: "Task Completed! 🎉" });
            fetchPortalData();
        } catch (error) {
            toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "document": return <FileText className="h-4 w-4" />;
            case "it_setup": return <Laptop className="h-4 w-4" />;
            case "team": return <Users className="h-4 w-4" />;
            case "compliance": return <Shield className="h-4 w-4" />;
            case "training": return <Building className="h-4 w-4" />;
            default: return <Circle className="h-4 w-4" />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "high": return "bg-red-100 text-red-700";
            case "medium": return "bg-yellow-100 text-yellow-700";
            default: return "bg-blue-100 text-blue-700";
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!candidateEmail) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                <Card className="max-w-md w-full mx-4">
                    <CardHeader className="text-center">
                        <CardTitle>Welcome to Your Onboarding Portal</CardTitle>
                        <CardDescription>Enter your email to access your portal</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Input
                            placeholder="your.email@example.com"
                            type="email"
                            className="mb-4"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    const email = (e.target as HTMLInputElement).value;
                                    localStorage.setItem("candidateEmail", email);
                                    window.location.reload();
                                }
                            }}
                        />
                        <Button className="w-full">Access Portal</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const tasks = portalData?.tasks || [];
    const documents = portalData?.documents || [];
    const progress = portalData?.progress || 0;
    const stats = portalData?.stats || {};

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-8 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-3 mb-2">
                        <PartyPopper className="h-8 w-8" />
                        <h1 className="text-2xl font-bold">Welcome to the Team!</h1>
                    </div>
                    <p className="opacity-90">Complete your onboarding tasks to get ready for your first day</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto py-8 px-6 space-y-6">
                {/* Progress Card */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold">Your Progress</h2>
                                <p className="text-sm text-muted-foreground">
                                    {stats.completedTasks || 0} of {stats.totalTasks || 0} tasks completed
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold text-primary">{progress}%</p>
                                <p className="text-xs text-muted-foreground">Complete</p>
                            </div>
                        </div>
                        <Progress value={progress} className="h-3" />

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            <div className="text-center p-3 bg-muted rounded-lg">
                                <p className="text-2xl font-bold text-green-600">{stats.completedTasks || 0}</p>
                                <p className="text-xs text-muted-foreground">Completed</p>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                                <p className="text-2xl font-bold text-orange-600">{(stats.totalTasks || 0) - (stats.completedTasks || 0)}</p>
                                <p className="text-xs text-muted-foreground">Pending</p>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                                <p className="text-2xl font-bold text-blue-600">{stats.verifiedDocs || 0}</p>
                                <p className="text-xs text-muted-foreground">Docs Verified</p>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                                <p className="text-2xl font-bold text-purple-600">{stats.pendingDocs || 0}</p>
                                <p className="text-xs text-muted-foreground">Docs Pending</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tasks */}
                <Card>
                    <CardHeader>
                        <CardTitle>📋 Your Tasks</CardTitle>
                        <CardDescription>Complete these before your start date</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {tasks.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No tasks yet! Your HR team will add tasks soon.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {tasks.map((task: Task) => (
                                    <div
                                        key={task._id}
                                        className={`flex items-center justify-between p-4 rounded-lg border ${task.status === "completed" ? "bg-green-50 border-green-200" : "bg-white"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${task.status === "completed" ? "bg-green-100" : "bg-muted"
                                                }`}>
                                                {getCategoryIcon(task.category)}
                                            </div>
                                            <div>
                                                <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""
                                                    }`}>
                                                    {task.title}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className={getPriorityColor(task.priority)}>
                                                        {task.priority}
                                                    </Badge>
                                                    {task.dueDate && (
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            Due: {new Date(task.dueDate).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {task.status !== "completed" && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleTaskComplete(task._id)}
                                            >
                                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                                Complete
                                            </Button>
                                        )}
                                        {task.status === "completed" && (
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Documents */}
                <Card>
                    <CardHeader>
                        <CardTitle>📄 Documents</CardTitle>
                        <CardDescription>Upload and track your required documents</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {documents.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No documents uploaded yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {documents.map((doc: Document) => (
                                    <div key={doc._id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <FileText className="h-5 w-5 text-blue-600" />
                                            <div>
                                                <p className="font-medium">{doc.fileName || doc.documentType}</p>
                                                <p className="text-xs text-muted-foreground">{doc.documentType}</p>
                                            </div>
                                        </div>
                                        <Badge variant={doc.status === "verified" ? "default" : "outline"}>
                                            {doc.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Help */}
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white rounded-lg shadow-sm">
                                <User className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Need Help?</h3>
                                <p className="text-sm text-muted-foreground">
                                    Contact your HR representative or email onboarding@company.com
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
