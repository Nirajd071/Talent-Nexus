import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
    Calendar,
    Clock,
    Video,
    Phone,
    Users,
    MapPin,
    Plus,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    MoreVertical,
    CheckCircle,
    XCircle,
    RefreshCw,
    Loader2,
    UserPlus,
    FileText,
    Sparkles,
    CalendarDays,
    List
} from "lucide-react";

// Types
interface Interview {
    _id: string;
    candidateId: string;
    candidateEmail: string;
    candidateName: string;
    jobId?: string;
    jobTitle?: string;
    type: "phone" | "video" | "in_person" | "technical" | "hr" | "panel" | "final";
    round: number;
    status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show" | "rescheduled";
    scheduledAt: string;
    duration: number;
    meetingLink?: string;
    location?: string;
    interviewers: Array<{
        userId: string;
        name: string;
        email: string;
        role: string;
        isLead: boolean;
    }>;
    kitId?: string;
    notes?: string;
    createdAt: string;
}

interface InterviewKit {
    _id: string;
    name: string;
    description?: string;
    type: string;
    targetRole?: string;
    questions: Array<{
        question: string;
        category: string;
    }>;
}

export default function Interviews() {
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [kits, setKits] = useState<InterviewKit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<"calendar" | "list">("list");
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const { toast } = useToast();

    const token = localStorage.getItem("token");

    useEffect(() => {
        fetchInterviews();
        fetchKits();
    }, []);

    const fetchInterviews = async () => {
        try {
            const res = await fetch("/api/interviews", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setInterviews(data);
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to fetch interviews", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchKits = async () => {
        try {
            const res = await fetch("/api/interviews/kits", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                setKits(await res.json());
            }
        } catch (error) {
            console.error("Failed to fetch kits");
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            scheduled: "bg-blue-100 text-blue-700",
            confirmed: "bg-green-100 text-green-700",
            in_progress: "bg-yellow-100 text-yellow-700",
            completed: "bg-gray-100 text-gray-700",
            cancelled: "bg-red-100 text-red-700",
            no_show: "bg-orange-100 text-orange-700",
            rescheduled: "bg-purple-100 text-purple-700",
        };
        return <Badge className={styles[status] || "bg-gray-100"}>{status.replace("_", " ")}</Badge>;
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "video": return <Video className="h-4 w-4" />;
            case "phone": return <Phone className="h-4 w-4" />;
            case "in_person": return <MapPin className="h-4 w-4" />;
            case "panel": return <Users className="h-4 w-4" />;
            default: return <Calendar className="h-4 w-4" />;
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const filteredInterviews = interviews.filter(i =>
        filterStatus === "all" || i.status === filterStatus
    );

    // Group interviews by date for calendar view
    const groupedByDate = filteredInterviews.reduce((acc, interview) => {
        const date = new Date(interview.scheduledAt).toDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(interview);
        return acc;
    }, {} as Record<string, Interview[]>);

    const upcomingInterviews = interviews.filter(i =>
        new Date(i.scheduledAt) > new Date() &&
        ["scheduled", "confirmed", "rescheduled"].includes(i.status)
    ).slice(0, 5);

    const todayCount = interviews.filter(i =>
        new Date(i.scheduledAt).toDateString() === new Date().toDateString()
    ).length;

    return (
        <Layout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Interview Scheduling</h1>
                        <p className="text-muted-foreground">
                            Manage interviews, assign interviewers, and collect feedback
                        </p>
                    </div>
                    <Button onClick={() => setScheduleModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Schedule Interview
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <CalendarDays className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{todayCount}</p>
                                    <p className="text-sm text-muted-foreground">Today</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <Clock className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{upcomingInterviews.length}</p>
                                    <p className="text-sm text-muted-foreground">Upcoming</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <CheckCircle className="h-6 w-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">
                                        {interviews.filter(i => i.status === "completed").length}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Completed</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-100 rounded-lg">
                                    <FileText className="h-6 w-6 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{kits.length}</p>
                                    <p className="text-sm text-muted-foreground">Interview Kits</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* View Toggle & Filters */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Tabs value={view} onValueChange={(v) => setView(v as "calendar" | "list")}>
                            <TabsList>
                                <TabsTrigger value="list" className="gap-2">
                                    <List className="h-4 w-4" /> List
                                </TabsTrigger>
                                <TabsTrigger value="calendar" className="gap-2">
                                    <CalendarDays className="h-4 w-4" /> Calendar
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Filter" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Input placeholder="Search interviews..." className="w-64" />
                        <Button variant="outline" size="icon">
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* List View */}
                {view === "list" && (
                    <Card>
                        <CardHeader>
                            <CardTitle>All Interviews</CardTitle>
                            <CardDescription>
                                {filteredInterviews.length} interview(s) found
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : filteredInterviews.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No interviews scheduled yet</p>
                                    <Button
                                        variant="link"
                                        onClick={() => setScheduleModalOpen(true)}
                                    >
                                        Schedule your first interview
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredInterviews.map((interview) => (
                                        <div
                                            key={interview._id}
                                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-muted rounded-lg">
                                                    {getTypeIcon(interview.type)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium">{interview.candidateName}</p>
                                                        {getStatusBadge(interview.status)}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {interview.jobTitle || "Position"} • Round {interview.round}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="font-medium">{formatDate(interview.scheduledAt)}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {interview.duration} min • {interview.type}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    {interview.interviewers.slice(0, 3).map((i, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium -ml-2 first:ml-0 border-2 border-white"
                                                            title={i.name}
                                                        >
                                                            {i.name.charAt(0)}
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {interview.meetingLink && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => window.open(interview.meetingLink, "_blank")}
                                                        >
                                                            <Video className="h-4 w-4 mr-1" />
                                                            Join
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            window.open(`/api/interviews/${interview._id}/calendar.ics`, "_blank");
                                                        }}
                                                    >
                                                        <CalendarDays className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Calendar View */}
                {view === "calendar" && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>
                                    {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            const newDate = new Date(currentDate);
                                            newDate.setMonth(newDate.getMonth() - 1);
                                            setCurrentDate(newDate);
                                        }}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setCurrentDate(new Date())}
                                    >
                                        Today
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            const newDate = new Date(currentDate);
                                            newDate.setMonth(newDate.getMonth() + 1);
                                            setCurrentDate(newDate);
                                        }}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-7 gap-1">
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                                    <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                                        {day}
                                    </div>
                                ))}
                                {Array.from({ length: 35 }, (_, i) => {
                                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                                    date.setDate(date.getDate() - date.getDay() + i);
                                    const dateStr = date.toDateString();
                                    const dayInterviews = groupedByDate[dateStr] || [];
                                    const isToday = date.toDateString() === new Date().toDateString();
                                    const isCurrentMonth = date.getMonth() === currentDate.getMonth();

                                    return (
                                        <div
                                            key={i}
                                            className={`min-h-24 p-1 border rounded-lg ${isToday ? "border-blue-500 bg-blue-50" : ""
                                                } ${!isCurrentMonth ? "bg-muted/30" : ""}`}
                                        >
                                            <div className={`text-sm ${isToday ? "font-bold text-blue-600" : ""} ${!isCurrentMonth ? "text-muted-foreground" : ""}`}>
                                                {date.getDate()}
                                            </div>
                                            <div className="space-y-1 mt-1">
                                                {dayInterviews.slice(0, 2).map((interview, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="text-xs p-1 bg-blue-100 text-blue-700 rounded truncate cursor-pointer hover:bg-blue-200"
                                                        title={`${interview.candidateName} - ${interview.type}`}
                                                    >
                                                        {new Date(interview.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} {interview.candidateName.split(" ")[0]}
                                                    </div>
                                                ))}
                                                {dayInterviews.length > 2 && (
                                                    <div className="text-xs text-muted-foreground">
                                                        +{dayInterviews.length - 2} more
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Schedule Interview Modal */}
                <ScheduleInterviewModal
                    open={scheduleModalOpen}
                    onClose={() => setScheduleModalOpen(false)}
                    onScheduled={() => {
                        fetchInterviews();
                        setScheduleModalOpen(false);
                    }}
                    kits={kits}
                />
            </div>
        </Layout>
    );
}

// Schedule Interview Modal Component
function ScheduleInterviewModal({
    open,
    onClose,
    onScheduled,
    kits
}: {
    open: boolean;
    onClose: () => void;
    onScheduled: () => void;
    kits: InterviewKit[];
}) {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        candidateName: "",
        candidateEmail: "",
        jobTitle: "",
        type: "video",
        round: 1,
        scheduledAt: "",
        duration: 60,
        meetingLink: "",
        interviewerName: "",
        interviewerEmail: "",
        kitId: "",
        notes: ""
    });
    const { toast } = useToast();
    const token = localStorage.getItem("token");

    const handleSubmit = async () => {
        if (!formData.candidateName || !formData.scheduledAt) {
            toast({ title: "Error", description: "Please fill required fields", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/interviews", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...formData,
                    scheduledAt: new Date(formData.scheduledAt).toISOString(),
                    interviewers: formData.interviewerName ? [{
                        name: formData.interviewerName,
                        email: formData.interviewerEmail,
                        role: "Interviewer",
                        isLead: true
                    }] : []
                }),
            });

            if (res.ok) {
                toast({ title: "Interview Scheduled!", description: "Calendar invite will be sent" });
                onScheduled();
                setStep(1);
                setFormData({
                    candidateName: "",
                    candidateEmail: "",
                    jobTitle: "",
                    type: "video",
                    round: 1,
                    scheduledAt: "",
                    duration: 60,
                    meetingLink: "",
                    interviewerName: "",
                    interviewerEmail: "",
                    kitId: "",
                    notes: ""
                });
            } else {
                throw new Error("Failed to schedule");
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to schedule interview", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Schedule Interview</DialogTitle>
                    <DialogDescription>
                        Step {step} of 3: {step === 1 ? "Candidate Details" : step === 2 ? "Interview Details" : "Assign Interviewer"}
                    </DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <Label>Candidate Name *</Label>
                            <Input
                                value={formData.candidateName}
                                onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                                placeholder="John Doe"
                            />
                        </div>
                        <div>
                            <Label>Candidate Email</Label>
                            <Input
                                type="email"
                                value={formData.candidateEmail}
                                onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
                                placeholder="john@example.com"
                            />
                        </div>
                        <div>
                            <Label>Position</Label>
                            <Input
                                value={formData.jobTitle}
                                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                                placeholder="Frontend Developer"
                            />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Interview Type</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(v) => setFormData({ ...formData, type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="phone">📞 Phone</SelectItem>
                                        <SelectItem value="video">📹 Video</SelectItem>
                                        <SelectItem value="in_person">🏢 In Person</SelectItem>
                                        <SelectItem value="technical">💻 Technical</SelectItem>
                                        <SelectItem value="hr">👔 HR</SelectItem>
                                        <SelectItem value="panel">👥 Panel</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Round</Label>
                                <Select
                                    value={formData.round.toString()}
                                    onValueChange={(v) => setFormData({ ...formData, round: parseInt(v) })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Round 1</SelectItem>
                                        <SelectItem value="2">Round 2</SelectItem>
                                        <SelectItem value="3">Round 3</SelectItem>
                                        <SelectItem value="4">Final Round</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label>Date & Time *</Label>
                            <Input
                                type="datetime-local"
                                value={formData.scheduledAt}
                                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Duration (minutes)</Label>
                                <Select
                                    value={formData.duration.toString()}
                                    onValueChange={(v) => setFormData({ ...formData, duration: parseInt(v) })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="30">30 min</SelectItem>
                                        <SelectItem value="45">45 min</SelectItem>
                                        <SelectItem value="60">1 hour</SelectItem>
                                        <SelectItem value="90">1.5 hours</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Meeting Link</Label>
                                <Input
                                    value={formData.meetingLink}
                                    onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                                    placeholder="https://meet.jit.si/HireSphere-..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4">
                        <div>
                            <Label>Interviewer Name</Label>
                            <Input
                                value={formData.interviewerName}
                                onChange={(e) => setFormData({ ...formData, interviewerName: e.target.value })}
                                placeholder="Jane Smith"
                            />
                        </div>
                        <div>
                            <Label>Interviewer Email</Label>
                            <Input
                                type="email"
                                value={formData.interviewerEmail}
                                onChange={(e) => setFormData({ ...formData, interviewerEmail: e.target.value })}
                                placeholder="jane@company.com"
                            />
                        </div>
                        <div>
                            <Label>Interview Kit (Optional)</Label>
                            <Select
                                value={formData.kitId}
                                onValueChange={(v) => setFormData({ ...formData, kitId: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a kit..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {kits.map(kit => (
                                        <SelectItem key={kit._id} value={kit._id}>
                                            {kit.name} ({kit.questions.length} questions)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Notes</Label>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Any special instructions or notes..."
                            />
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {step > 1 && (
                        <Button variant="outline" onClick={() => setStep(step - 1)}>
                            Back
                        </Button>
                    )}
                    {step < 3 ? (
                        <Button onClick={() => setStep(step + 1)}>
                            Next
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scheduling...</>
                            ) : (
                                <><Calendar className="h-4 w-4 mr-2" /> Schedule Interview</>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
