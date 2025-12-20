import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Briefcase,
    MapPin,
    Clock,
    DollarSign,
    Search,
    FileText,
    Send,
    Loader2,
    CheckCircle,
    XCircle,
    LogOut,
    User,
    Building2,
    ClipboardCheck,
    Play,
    Calendar,
    KeyRound,
    Upload,
    FileUp,
    Sparkles,
    GraduationCap,
    Award,
    ExternalLink,
    BookOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AccessCodeEntry from "@/components/access-code-entry";
import { LeavePresenceForm } from "@/components/leave-presence-form";

interface Job {
    _id: string;
    title: string;
    department: string;
    location: string;
    type: string;
    description: string;
    requirements: string[];
    salary: { min: number; max: number };
    status: string;
    createdAt: string;
}

interface Application {
    _id: string;
    jobId: string;
    jobTitle: string;
    status: string;
    appliedAt: string;
    job?: { title: string; department: string; location: string };
}

interface UserData {
    id: string;
    email: string;
    role: string;
    profile: { firstName?: string; lastName?: string };
}

interface AssignedTest {
    _id: string;
    assessmentId: {
        _id: string;
        title: string;
        description?: string;
        timeLimit: number;
        questions: any[];
    };
    status: string;
    deadline?: string;
    testUrl: string;
    createdAt: string;
}

export default function CandidatePortal() {
    const [user, setUser] = useState<UserData | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [assessments, setAssessments] = useState<AssignedTest[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("jobs");
    const { toast } = useToast();

    // Apply dialog
    const [applyDialogOpen, setApplyDialogOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [coverLetter, setCoverLetter] = useState("");
    const [isApplying, setIsApplying] = useState(false);

    // Resume upload
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [parsedResume, setParsedResume] = useState<any>(null);
    const [resumeUrl, setResumeUrl] = useState<string | null>(null);

    // Leave Your Presence dialog
    const [leavePresenceOpen, setLeavePresenceOpen] = useState(false);

    // Training state
    const [trainingData, setTrainingData] = useState<any>(null);
    const [isLoadingTraining, setIsLoadingTraining] = useState(false);

    const token = localStorage.getItem("token");

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            const parsed = JSON.parse(userData);
            setUser(parsed);
            fetchAssessments(parsed.email);
        } else if (!token) {
            window.location.href = "/auth";
            return;
        }

        fetchJobs();
        fetchApplications();
    }, []);

    // Auto-polling: Refresh data every 10 seconds based on active tab
    useEffect(() => {
        if (!user?.email) return;

        const fetchTraining = async () => {
            if (!token) return;
            try {
                const res = await fetch("/api/candidate/training", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setTrainingData(data);
                }
            } catch (e) {
                console.error("Failed to fetch training:", e);
            }
        };

        // Immediate fetch on tab change
        if (activeTab === "assessments") {
            fetchAssessments(user.email);
        } else if (activeTab === "applications") {
            fetchApplications();
        } else if (activeTab === "training") {
            fetchTraining();
        }

        // Set up polling interval
        const pollInterval = setInterval(() => {
            if (activeTab === "assessments") {
                fetchAssessments(user.email);
            } else if (activeTab === "applications") {
                fetchApplications();
            } else if (activeTab === "training") {
                fetchTraining();
            }
        }, 10000); // Poll every 10 seconds

        return () => clearInterval(pollInterval);
    }, [activeTab, user?.email]);

    const fetchJobs = async () => {
        try {
            const response = await fetch("/api/candidate/jobs");
            if (response.ok) {
                const data = await response.json();
                setJobs(data);
            }
        } catch {
            toast({ title: "Error", description: "Failed to load jobs", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchApplications = async () => {
        if (!token) return;
        try {
            const response = await fetch("/api/candidate/applications", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setApplications(data);
            }
        } catch {
            console.error("Failed to fetch applications");
        }
    };

    const fetchAssessments = async (email: string) => {
        try {
            // Fetch both pending and completed assessments
            const [pendingRes, completedRes] = await Promise.all([
                fetch(`/api/assessments/candidate/assigned?email=${encodeURIComponent(email)}`),
                fetch(`/api/assessments/candidate/completed?email=${encodeURIComponent(email)}`)
            ]);

            const pending = pendingRes.ok ? await pendingRes.json() : [];
            const completed = completedRes.ok ? await completedRes.json() : [];

            // Combine and set assessments
            setAssessments([...pending, ...completed]);
        } catch (error) {
            console.error("Failed to fetch assessments", error);
        }
    };

    const handleResumeUpload = async (file: File) => {
        setResumeFile(file);
        setIsParsing(true);
        setParsedResume(null);

        try {
            // Upload file to server for Python pypdf parsing
            const formData = new FormData();
            formData.append("resume", file);

            const response = await fetch("/api/upload/parse-resume", {
                method: "POST",
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.success && result.data) {
                setParsedResume(result.data);
                // Store the resume URL returned from server (hashed filename)
                if (result.fileUrl) {
                    setResumeUrl(result.fileUrl);
                }
                const skillCount = result.data.skills?.length || 0;
                toast({
                    title: "Resume Parsed!",
                    description: `Extracted ${skillCount} skills: ${result.data.skills?.slice(0, 5).join(", ")}${skillCount > 5 ? "..." : ""}`
                });
            } else {
                // Even if parsing fails, keep the file uploaded
                toast({ title: "Note", description: result.error || "Resume uploaded (parsing optional)", variant: "default" });
            }
        } catch (err) {
            console.error("Resume parse error:", err);
            // Keep file even if parsing fails
            toast({ title: "Resume Uploaded", description: "File attached (AI parsing unavailable)", variant: "default" });
        } finally {
            setIsParsing(false);
        }
    };

    const handleRemoveResume = () => {
        setResumeFile(null);
        setParsedResume(null);
        setResumeUrl(null);
        // Reset the file input
        const input = document.getElementById('resume-input') as HTMLInputElement;
        if (input) input.value = '';
    };

    const handleApply = async () => {
        if (!selectedJob || !token) return;

        // Optimistic update - add to applications list immediately
        const optimisticApplication: Application = {
            _id: `temp-${Date.now()}`,
            jobId: selectedJob._id,
            jobTitle: selectedJob.title,
            status: "applied",
            appliedAt: new Date().toISOString(),
            job: { title: selectedJob.title, department: selectedJob.department, location: selectedJob.location }
        };
        setApplications(prev => [optimisticApplication, ...prev]);

        setIsApplying(true);
        try {
            const response = await fetch("/api/candidate/apply", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    jobId: selectedJob._id,
                    coverLetter,
                    resumeData: parsedResume,
                    resumeFilename: resumeFile?.name,
                    resume: resumeUrl  // The actual file URL from upload
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // Revert optimistic update on error
                setApplications(prev => prev.filter(a => a._id !== optimisticApplication._id));
                throw new Error(data.error);
            }

            toast({ title: "Application Submitted!", description: `Applied to ${selectedJob.title}` });
            setApplyDialogOpen(false);
            setCoverLetter("");
            setResumeFile(null);
            setParsedResume(null);
            setResumeUrl(null);
            // Refetch to get real application data (replace optimistic with actual)
            fetchApplications();
            setActiveTab("applications");
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsApplying(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/auth";
    };

    const filteredJobs = jobs.filter(job =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case "applied": return "bg-blue-500";
            case "shortlisted": return "bg-yellow-500";
            case "assessment": return "bg-purple-500";
            case "interview": return "bg-orange-500";
            case "hired": return "bg-green-500";
            case "rejected": return "bg-red-500";
            default: return "bg-gray-500";
        }
    };

    const appliedJobIds = new Set(applications.map(a => a.jobId));

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden">
                            <img src="/logo.png" alt="HireSphere" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg"><span className="text-foreground">Hire</span><span className="text-primary">Sphere</span></h1>
                            <p className="text-xs text-slate-500">Candidate Portal</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors"
                            onClick={() => setLeavePresenceOpen(true)}
                        >
                            <Sparkles className="w-4 h-4" />
                            Leave Your Presence
                        </Button>
                        <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-slate-500" />
                            <span>{user?.profile?.firstName || user?.email}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleLogout}>
                            <LogOut className="w-4 h-4 mr-2" /> Logout
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-6">
                        <TabsTrigger value="jobs" className="gap-2">
                            <Briefcase className="w-4 h-4" /> Browse Jobs
                        </TabsTrigger>
                        <TabsTrigger value="applications" className="gap-2">
                            <FileText className="w-4 h-4" /> My Applications
                            {applications.length > 0 && (
                                <Badge variant="secondary" className="ml-1">{applications.length}</Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="assessments" className="gap-2">
                            <ClipboardCheck className="w-4 h-4" /> Assessments
                            {assessments.filter(a => a.status === "assigned").length > 0 && (
                                <Badge variant="destructive" className="ml-1">
                                    {assessments.filter(a => a.status === "assigned").length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        {/* Only show Secure Assessment tab if candidate has pending assessments */}
                        {assessments.filter(a => a.status === "assigned").length > 0 && (
                            <TabsTrigger value="secure-assessment" className="gap-2">
                                <KeyRound className="w-4 h-4" /> Secure Assessment
                            </TabsTrigger>
                        )}
                        {/* Only show My Training tab if candidate is hired */}
                        {applications.some(a => a.status === "hired") && (
                            <TabsTrigger value="training" className="gap-2">
                                <GraduationCap className="w-4 h-4" /> My Training
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {/* Jobs Tab */}
                    <TabsContent value="jobs" className="space-y-6">
                        {/* Search */}
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search jobs by title, department, or location..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Job Listings */}
                        <div className="grid gap-4">
                            {filteredJobs.length === 0 ? (
                                <Card className="p-8 text-center text-slate-500">
                                    <Briefcase className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                    <p>No jobs found</p>
                                </Card>
                            ) : (
                                filteredJobs.map((job) => (
                                    <Card key={job._id} className="hover:shadow-md transition-shadow">
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-2">
                                                    <h3 className="text-lg font-semibold">{job.title}</h3>
                                                    <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                                                        <span className="flex items-center gap-1">
                                                            <Building2 className="w-4 h-4" /> {job.department || "Engineering"}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-4 h-4" /> {job.location || "Remote"}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-4 h-4" /> {job.type || "Full-time"}
                                                        </span>
                                                        {job.salary && (
                                                            <span className="flex items-center gap-1">
                                                                <DollarSign className="w-4 h-4" />
                                                                ${job.salary.min?.toLocaleString()} - ${job.salary.max?.toLocaleString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {job.description && (
                                                        <p className="text-sm text-slate-600 line-clamp-2">{job.description}</p>
                                                    )}
                                                </div>

                                                <div>
                                                    {appliedJobIds.has(job._id) ? (
                                                        <Badge className="bg-green-100 text-green-700">
                                                            <CheckCircle className="w-3 h-3 mr-1" /> Applied
                                                        </Badge>
                                                    ) : (
                                                        <Button
                                                            onClick={() => {
                                                                setSelectedJob(job);
                                                                setApplyDialogOpen(true);
                                                            }}
                                                        >
                                                            <Send className="w-4 h-4 mr-2" /> Apply
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    {/* Applications Tab */}
                    <TabsContent value="applications" className="space-y-4">
                        {applications.length === 0 ? (
                            <Card className="p-8 text-center text-slate-500">
                                <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                <p>No applications yet</p>
                                <Button className="mt-4" onClick={() => setActiveTab("jobs")}>
                                    Browse Jobs
                                </Button>
                            </Card>
                        ) : (
                            applications.map((app) => (
                                <Card key={app._id}>
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="font-semibold">{app.jobTitle || app.job?.title}</h3>
                                                <p className="text-sm text-slate-500">
                                                    Applied {new Date(app.appliedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <Badge className={`${getStatusColor(app.status)} text-white capitalize`}>
                                                {app.status}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </TabsContent>

                    {/* Assessments Tab */}
                    <TabsContent value="assessments" className="space-y-6">
                        {/* Pending Tests */}
                        <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 bg-amber-500 rounded-full" />
                                Pending Assessments
                            </h3>
                            {assessments.filter(a => a.status === "assigned").length === 0 ? (
                                <Card className="p-6 text-center text-slate-500">
                                    <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                                    <p>No pending assessments</p>
                                </Card>
                            ) : (
                                <div className="grid gap-4">
                                    {assessments.filter(a => a.status === "assigned").map((test) => (
                                        <Card key={test._id} className="border-l-4 border-l-amber-500">
                                            <CardContent className="p-5">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold text-lg">{test.assessmentId?.title}</h4>
                                                        {test.assessmentId?.description && (
                                                            <p className="text-sm text-slate-500 mt-1">{test.assessmentId.description}</p>
                                                        )}
                                                        <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-4 h-4" />
                                                                {test.assessmentId?.timeLimit} min
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <FileText className="w-4 h-4" />
                                                                {test.assessmentId?.questions?.length || 0} questions
                                                            </span>
                                                            {test.deadline && (
                                                                <span className="flex items-center gap-1 text-amber-600">
                                                                    <Calendar className="w-4 h-4" />
                                                                    Due: {new Date(test.deadline).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        onClick={() => {
                                                            // Navigate to secure assessment tab
                                                            setActiveTab("secure-assessment");
                                                            toast({
                                                                title: "Enter Your Access Code",
                                                                description: "Use the access code from your email to start the test."
                                                            });
                                                        }}
                                                        className="bg-amber-500 hover:bg-amber-600"
                                                    >
                                                        <Play className="w-4 h-4 mr-2" />
                                                        Start Test
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Completed Tests */}
                        <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full" />
                                Completed Assessments
                            </h3>
                            {assessments.filter(a => a.status === "completed").length === 0 ? (
                                <Card className="p-6 text-center text-slate-500">
                                    <CheckCircle className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                                    <p>No completed assessments yet</p>
                                </Card>
                            ) : (
                                <div className="grid gap-4">
                                    {assessments.filter(a => a.status === "completed").map((test) => (
                                        <Card key={test._id} className="border-l-4 border-l-green-500">
                                            <CardContent className="p-5">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <h4 className="font-semibold">{test.assessmentId?.title}</h4>
                                                        <p className="text-sm text-slate-500 mt-1">
                                                            Completed on {new Date(test.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <Badge className="bg-green-100 text-green-700">
                                                        <CheckCircle className="w-3 h-3 mr-1" /> Submitted
                                                    </Badge>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* My Training Tab */}
                    <TabsContent value="training" className="space-y-6">
                        {!trainingData?.assigned?.length ? (
                            <Card className="p-8 text-center text-slate-500">
                                <GraduationCap className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                <p className="font-medium">No training assigned yet</p>
                                <p className="text-sm mt-2">Training modules will appear here once you're onboarded</p>
                            </Card>
                        ) : (
                            <>
                                {/* Progress Summary */}
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="font-semibold text-lg">Your Training Progress</h3>
                                                <p className="text-sm text-slate-500">
                                                    {trainingData.completedModules} of {trainingData.totalModules} modules completed
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl font-bold text-primary">{trainingData.progress}%</span>
                                                <Badge variant={trainingData.status === "completed" ? "default" : "secondary"}>
                                                    {trainingData.status === "completed" ? "Complete" : "In Progress"}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all duration-500"
                                                style={{ width: `${trainingData.progress}%` }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Certifications */}
                                {trainingData.certifications?.length > 0 && (
                                    <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                                        <CardContent className="p-6">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Award className="w-5 h-5 text-amber-600" />
                                                <h3 className="font-semibold">Your Certifications</h3>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {trainingData.certifications.map((cert: any, i: number) => (
                                                    <Badge key={i} className="bg-amber-100 text-amber-800 border-amber-300">
                                                        {cert.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Training Modules */}
                                <div className="grid gap-4">
                                    {trainingData.assigned.map((module: any) => {
                                        const isCompleted = trainingData.completed?.includes(module._id);
                                        return (
                                            <Card key={module._id} className={isCompleted ? "border-green-200 bg-green-50/30" : ""}>
                                                <CardContent className="p-5">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex gap-4">
                                                            <div className={`p-3 rounded-lg ${isCompleted ? "bg-green-100" : "bg-slate-100"}`}>
                                                                <BookOpen className={`w-5 h-5 ${isCompleted ? "text-green-600" : "text-slate-600"}`} />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold">{module.title}</h4>
                                                                <p className="text-sm text-slate-500 mt-1">{module.description}</p>
                                                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" /> {module.duration} min
                                                                    </span>
                                                                    <Badge variant="outline" className="text-xs">{module.contentType}</Badge>
                                                                    {module.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {module.contentUrl && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => window.open(module.contentUrl, "_blank")}
                                                                >
                                                                    <ExternalLink className="w-4 h-4 mr-1" /> Open
                                                                </Button>
                                                            )}
                                                            {isCompleted ? (
                                                                <Badge className="bg-green-100 text-green-700">
                                                                    <CheckCircle className="w-3 h-3 mr-1" /> Completed
                                                                </Badge>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={async () => {
                                                                        try {
                                                                            const res = await fetch(`/api/candidate/training/complete/${module._id}`, {
                                                                                method: "POST",
                                                                                headers: { Authorization: `Bearer ${token}` }
                                                                            });
                                                                            if (res.ok) {
                                                                                const data = await res.json();
                                                                                setTrainingData((prev: any) => ({
                                                                                    ...prev,
                                                                                    completed: [...(prev.completed || []), module._id],
                                                                                    completedModules: (prev.completedModules || 0) + 1,
                                                                                    progress: data.progress,
                                                                                    status: data.status
                                                                                }));
                                                                                toast({ title: "✅ Module Completed!", description: module.title });
                                                                            }
                                                                        } catch {
                                                                            toast({ title: "Error", description: "Failed to mark complete", variant: "destructive" });
                                                                        }
                                                                    }}
                                                                >
                                                                    Mark Complete
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </TabsContent>

                    {/* Secure Assessment Tab */}
                    <TabsContent value="secure-assessment" className="space-y-6">
                        <div className="max-w-2xl mx-auto py-8">
                            <AccessCodeEntry
                                candidateEmail={user?.email}
                                onVerified={(sessionToken, testDetails) => {
                                    // Redirect to secure assessment with token
                                    window.location.href = `/assessment/${sessionToken}`;
                                }}
                            />
                        </div>
                    </TabsContent>
                </Tabs>
            </main>

            {/* Apply Dialog */}
            <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Apply for {selectedJob?.title}</DialogTitle>
                        <DialogDescription>
                            Submit your application for this position
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="p-3 bg-slate-50 rounded-lg text-sm">
                            <div className="font-medium">{selectedJob?.title}</div>
                            <div className="text-slate-500">
                                {selectedJob?.department} • {selectedJob?.location}
                            </div>
                        </div>

                        {/* Resume Upload */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <FileUp className="w-4 h-4" />
                                Resume Upload
                            </Label>
                            <div
                                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer hover:border-primary hover:bg-slate-50 ${resumeFile ? 'border-green-500 bg-green-50' : 'border-slate-300'
                                    }`}
                                onClick={() => document.getElementById('resume-input')?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const file = e.dataTransfer.files[0];
                                    if (file) handleResumeUpload(file);
                                }}
                            >
                                <input
                                    id="resume-input"
                                    type="file"
                                    accept=".pdf,.doc,.docx,.txt"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleResumeUpload(file);
                                    }}
                                />
                                {isParsing ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        <p className="text-sm text-slate-600">AI is parsing your resume...</p>
                                    </div>
                                ) : resumeFile ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <CheckCircle className="w-8 h-8 text-green-500" />
                                        <p className="text-sm font-medium text-green-700">{resumeFile.name}</p>
                                        {parsedResume && (
                                            <div className="flex items-center gap-1 text-xs text-green-600">
                                                <Sparkles className="w-3 h-3" />
                                                AI extracted: {parsedResume.skills?.length || 0} skills, {parsedResume.experience?.length || 0} experiences
                                            </div>
                                        )}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveResume();
                                            }}
                                        >
                                            <XCircle className="w-4 h-4 mr-1" />
                                            Remove
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <Upload className="w-8 h-8 text-slate-400" />
                                        <p className="text-sm text-slate-600">Drag & drop or click to upload</p>
                                        <p className="text-xs text-slate-400">PDF, DOC, DOCX, TXT (AI will parse automatically)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Parsed Resume Preview */}
                        {parsedResume && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                                <div className="flex items-center gap-2 font-medium text-blue-700 mb-2">
                                    <Sparkles className="w-4 h-4" />
                                    AI Parsed Information
                                </div>
                                <div className="space-y-1 text-blue-600">
                                    {parsedResume.name && <div><strong>Name:</strong> {parsedResume.name}</div>}
                                    {parsedResume.email && <div><strong>Email:</strong> {parsedResume.email}</div>}
                                    {parsedResume.skills?.length > 0 && (
                                        <div><strong>Skills:</strong> {parsedResume.skills.slice(0, 5).join(", ")}...</div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Cover Letter (optional)</Label>
                            <Textarea
                                placeholder="Tell us why you're a great fit for this role..."
                                value={coverLetter}
                                onChange={(e) => setCoverLetter(e.target.value)}
                                rows={4}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleApply} disabled={isApplying}>
                            {isApplying ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                            ) : (
                                <><Send className="w-4 h-4 mr-2" /> Submit Application</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Leave Your Presence Dialog */}
            <LeavePresenceForm
                open={leavePresenceOpen}
                onClose={() => setLeavePresenceOpen(false)}
            />
        </div>
    );
}
