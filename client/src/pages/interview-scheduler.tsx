import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import {
    Calendar,
    Clock,
    Video,
    Users,
    Plus,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    Globe,
    Loader2,
    Send,
    CheckCircle2,
    RefreshCw,
    Trash2,
    Edit,
    FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Types
interface Candidate {
    _id: string;
    candidateName: string;
    candidateEmail: string;
    jobId: string;
    jobTitle?: string;
    status: string;
}

interface Interviewer {
    _id: string;
    email: string;
    profile?: {
        firstName?: string;
        lastName?: string;
    };
    role: string;
}

interface UpcomingInterview {
    _id: string;
    candidateName: string;
    candidateEmail: string;
    jobTitle: string;
    scheduledAt: string;
    duration: number;
    type: string;
    status: string;
    meetingLink?: string;
    interviewers: Array<{ name: string; email: string; role: string }>;
}

interface InterviewKitQuestion {
    question: string;
    category?: string;
    expectedAnswer?: string;
    timeAllocation?: number;
    scoringCriteria?: string;
}

interface InterviewKit {
    _id?: string;
    name: string;
    description?: string;
    type: string;
    targetRole?: string;
    questions: InterviewKitQuestion[] | string[];
    rubric?: {
        criteria: Array<{ name: string; description: string; weight: number }>;
    };
    duration?: number;
    isActive?: boolean;
    usageCount?: number;
}

const timeSlots = [
    "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
    "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM"
];

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Get current week dates with unique date strings (7 days)
const getCurrentWeek = (weekOffset: number = 0) => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    // Get Monday of current week
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + weekOffset * 7);

    return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        return {
            day: date.getDate().toString(),
            dayName: weekDays[i],
            dateKey: date.toISOString().split('T')[0], // YYYY-MM-DD for unique comparison
            fullDate: new Date(date), // Fresh copy
            month: date.toLocaleString('default', { month: 'short' }),
            year: date.getFullYear(),
            isPast: date < new Date(new Date().setHours(0, 0, 0, 0)),
            isToday: date.toDateString() === new Date().toDateString(),
            isWeekend: i >= 5 // Saturday and Sunday
        };
    });
};

export default function InterviewScheduler() {
    const [isScheduling, setIsScheduling] = useState(false);
    const [isAutoScheduling, setIsAutoScheduling] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState("");
    const [selectedInterviewers, setSelectedInterviewers] = useState<string[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<{ dateKey: string, time: string, fullDate: Date } | null>(null);
    const [interviewType, setInterviewType] = useState("technical");
    const [duration, setDuration] = useState("60");
    const [timezone, setTimezone] = useState("ist");
    const [weekOffset, setWeekOffset] = useState(0);

    // Real data states
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
    const [upcomingInterviews, setUpcomingInterviews] = useState<UpcomingInterview[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Interview Kits state
    const [interviewKits, setInterviewKits] = useState<InterviewKit[]>([]);
    const [isLoadingKits, setIsLoadingKits] = useState(false);
    const [isGeneratingKit, setIsGeneratingKit] = useState(false);
    const [selectedKitId, setSelectedKitId] = useState<string>(""); // For linking to interview
    const [newKitName, setNewKitName] = useState("");
    const [newKitType, setNewKitType] = useState("");
    const [newKitQuestions, setNewKitQuestions] = useState("");
    const [newKitDuration, setNewKitDuration] = useState("60");
    const [isCreatingKit, setIsCreatingKit] = useState(false);
    const [selectedKit, setSelectedKit] = useState<InterviewKit | null>(null);
    const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
    const [rescheduleInterview, setRescheduleInterview] = useState<UpcomingInterview | null>(null);
    const [aiKitDialogOpen, setAiKitDialogOpen] = useState(false);
    const [aiKitJobTitle, setAiKitJobTitle] = useState("");
    const [aiKitType, setAiKitType] = useState("technical");

    // Google Calendar integration
    const [isCalendarConnected, setIsCalendarConnected] = useState(false);

    const { toast } = useToast();
    const token = localStorage.getItem("token");

    // Get current week dates
    const currentWeek = getCurrentWeek(weekOffset);
    const currentMonth = currentWeek[2]?.month || "December";
    const currentYear = currentWeek[2]?.year || 2025;

    // Check for calendar connection status on URL params
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('calendar_connected') === 'true') {
            setIsCalendarConnected(true);
            toast({
                title: "Google Calendar Connected! 🎉",
                description: "You can now create interviews with Google Meet links.",
            });
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    // Fetch real data
    useEffect(() => {
        fetchCandidates();
        fetchInterviewers();
        fetchUpcomingInterviews();
        fetchInterviewKits();
        checkCalendarStatus();
    }, []);

    const checkCalendarStatus = async () => {
        try {
            const response = await fetch("/api/calendar/status", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setIsCalendarConnected(data.connected);
            }
        } catch (error) {
            console.log("Calendar status check failed");
        }
    };

    const connectGoogleCalendar = async () => {
        try {
            const response = await fetch("/api/auth/google/calendar", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                window.location.href = data.authUrl;
            }
        } catch (error) {
            toast({
                title: "Connection Failed",
                description: "Could not connect to Google Calendar.",
                variant: "destructive"
            });
        }
    };

    const fetchInterviewKits = async () => {
        setIsLoadingKits(true);
        try {
            const response = await fetch("/api/interview-kits", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setInterviewKits(data);
            }
        } catch (error) {
            console.error("Failed to fetch interview kits:", error);
        } finally {
            setIsLoadingKits(false);
        }
    };

    const fetchCandidates = async () => {
        try {
            const response = await fetch("/api/applications", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const interviewReady = data.filter((app: Candidate) =>
                    ["shortlisted", "assessment", "interview"].includes(app.status)
                );
                setCandidates(interviewReady);
            }
        } catch (error) {
            console.error("Failed to fetch candidates:", error);
        }
    };

    const fetchInterviewers = async () => {
        try {
            const response = await fetch("/api/users?role=recruiter", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setInterviewers(data);
            }
        } catch (error) {
            console.error("Failed to fetch interviewers:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUpcomingInterviews = async () => {
        try {
            const response = await fetch("/api/interviews?upcoming=true", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUpcomingInterviews(data);
            }
        } catch (error) {
            console.error("Failed to fetch interviews:", error);
        }
    };

    const handleAutoSchedule = async () => {
        if (selectedInterviewers.length === 0) {
            toast({
                title: "Select Interviewers",
                description: "Please select at least one interviewer first.",
                variant: "destructive"
            });
            return;
        }

        setIsAutoScheduling(true);
        toast({
            title: "AI Calendar Orchestrator",
            description: "Finding optimal slots across all calendars...",
        });

        setTimeout(() => {
            setIsAutoScheduling(false);

            // Find next available slot (skip past dates, optionally skip weekends)
            const nextSlot = currentWeek.find(d => !d.isPast && !d.isWeekend);

            // If no slot this week, try any day that's not past
            const fallbackSlot = currentWeek.find(d => !d.isPast);

            const selectedDay = nextSlot || fallbackSlot;

            if (selectedDay) {
                // Pick a good time slot (10 AM or 2 PM)
                const now = new Date();
                const isToday = selectedDay.isToday;
                const currentHour = now.getHours();

                // If today, find next available time slot
                let selectedTime = "10:00 AM";
                if (isToday) {
                    if (currentHour >= 16) {
                        // Too late today, use first slot tomorrow
                        const tomorrow = currentWeek.find(d => !d.isPast && d !== selectedDay);
                        if (tomorrow) {
                            setSelectedSlot({
                                dateKey: tomorrow.dateKey,
                                time: "10:00 AM",
                                fullDate: new Date(tomorrow.fullDate)
                            });
                            toast({
                                title: "Optimal Slot Found!",
                                description: `${tomorrow.month} ${tomorrow.day} at 10:00 AM works for all interviewers.`,
                            });
                            return;
                        }
                    } else if (currentHour >= 14) {
                        selectedTime = "4:00 PM";
                    } else if (currentHour >= 10) {
                        selectedTime = "2:00 PM";
                    }
                }

                setSelectedSlot({
                    dateKey: selectedDay.dateKey,
                    time: selectedTime,
                    fullDate: new Date(selectedDay.fullDate)
                });
                toast({
                    title: "Optimal Slot Found!",
                    description: `${selectedDay.month} ${selectedDay.day} at ${selectedTime} works for all interviewers.`,
                });
            } else {
                // Navigate to next week
                setWeekOffset(prev => prev + 1);
                toast({
                    title: "Checking Next Week...",
                    description: "All slots this week are in the past. Moved to next week.",
                });
            }
        }, 1500);
    };

    const handleScheduleInterview = async () => {
        if (!selectedCandidate || !selectedSlot || selectedInterviewers.length === 0) {
            toast({
                title: "Missing Information",
                description: "Please select a candidate, time slot, and at least one interviewer.",
                variant: "destructive"
            });
            return;
        }

        // Check if Google Calendar is connected FIRST
        if (!isCalendarConnected) {
            toast({
                title: "Google Calendar Required",
                description: "Please connect your Google Calendar to schedule interviews with Google Meet.",
                variant: "destructive"
            });
            // Redirect to connect
            connectGoogleCalendar();
            return;
        }

        setIsScheduling(true);

        try {
            const candidate = candidates.find(c => c._id === selectedCandidate);
            if (!candidate) throw new Error("Candidate not found");

            // Build scheduled date
            const [timePart, ampm] = selectedSlot.time.split(' ');
            const [hours, minutes] = timePart.split(':').map(Number);
            const scheduledDate = new Date(selectedSlot.fullDate);
            let hour24 = hours;
            if (ampm === 'PM' && hours !== 12) hour24 += 12;
            if (ampm === 'AM' && hours === 12) hour24 = 0;
            scheduledDate.setHours(hour24, minutes, 0, 0);

            const endDate = new Date(scheduledDate);
            endDate.setMinutes(endDate.getMinutes() + parseInt(duration));

            const interviewerDetails = selectedInterviewers.map(id => {
                const interviewer = interviewers.find(i => i._id === id);
                return {
                    userId: id,
                    name: interviewer?.profile?.firstName
                        ? `${interviewer.profile.firstName} ${interviewer.profile.lastName || ''}`
                        : interviewer?.email?.split('@')[0] || 'Unknown',
                    email: interviewer?.email || '',
                    role: interviewer?.role || 'Recruiter'
                };
            });

            // Create Google Calendar event with Meet link
            const attendees = [
                { email: candidate.candidateEmail, displayName: candidate.candidateName },
                ...interviewerDetails.map(i => ({ email: i.email, displayName: i.name }))
            ];

            const meetResponse = await fetch("/api/calendar/create-meeting", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    summary: `Interview: ${candidate.candidateName} - ${candidate.jobTitle || 'Position'}`,
                    description: `${interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} interview for ${candidate.jobTitle || 'Position'}\n\nCandidate: ${candidate.candidateName}\nInterviewers: ${interviewerDetails.map(i => i.name).join(', ')}`,
                    startTime: scheduledDate.toISOString(),
                    endTime: endDate.toISOString(),
                    attendees,
                    timezone: timezone === 'ist' ? 'Asia/Kolkata' : 'UTC'
                })
            });

            if (!meetResponse.ok) {
                const errorData = await meetResponse.json();
                if (errorData.authUrl) {
                    // Session expired, need to reconnect
                    setIsCalendarConnected(false);
                    toast({
                        title: "Session Expired",
                        description: "Please reconnect your Google Calendar.",
                        variant: "destructive"
                    });
                    window.location.href = errorData.authUrl;
                    return;
                }
                throw new Error(errorData.error || "Failed to create meeting");
            }

            const meetData = await meetResponse.json();

            if (!meetData.meetLink) {
                throw new Error("Failed to generate Google Meet link");
            }

            // Save interview to database
            const response = await fetch("/api/interviews", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    candidateEmail: candidate.candidateEmail,
                    candidateName: candidate.candidateName,
                    jobId: candidate.jobId,
                    jobTitle: candidate.jobTitle || "Position",
                    type: interviewType,
                    scheduledAt: scheduledDate.toISOString(),
                    duration: parseInt(duration),
                    timezone: timezone === 'ist' ? 'Asia/Kolkata' : timezone.toUpperCase(),
                    meetingLink: meetData.meetLink,
                    calendarEventId: meetData.eventId,
                    interviewers: interviewerDetails,
                    status: "scheduled"
                })
            });

            if (!response.ok) {
                throw new Error("Failed to save interview");
            }

            toast({
                title: "Interview Scheduled! ✅",
                description: `Google Meet link created. Calendar invites sent to all participants.`,
            });

            fetchUpcomingInterviews();
            setSelectedCandidate("");
            setSelectedSlot(null);
            setSelectedInterviewers([]);

        } catch (error: any) {
            console.error("Failed to schedule interview:", error);
            toast({
                title: "Scheduling Failed",
                description: error.message || "Could not schedule interview. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsScheduling(false);
        }
    };

    const handleCancelInterview = async (interviewId: string) => {
        try {
            const response = await fetch(`/api/interviews/${interviewId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                toast({ title: "Interview Cancelled", description: "The interview has been cancelled." });
                fetchUpcomingInterviews();
            } else {
                toast({ title: "Cancel Failed", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Cancel Failed", variant: "destructive" });
        }
    };

    const handleCreateKit = async () => {
        if (!newKitName || !newKitType) {
            toast({ title: "Missing Information", description: "Please enter kit name and type.", variant: "destructive" });
            return;
        }

        setIsCreatingKit(true);

        try {
            const questions = newKitQuestions.split('\n').filter(q => q.trim()).map(q => ({
                question: q,
                category: newKitType,
                timeAllocation: 5,
                scoringCriteria: "1-5 scale"
            }));

            const response = await fetch("/api/interview-kits", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newKitName,
                    type: newKitType,
                    questions,
                    duration: parseInt(newKitDuration)
                })
            });

            if (response.ok) {
                const newKit = await response.json();
                setInterviewKits(prev => [...prev, newKit]);
                setNewKitName("");
                setNewKitType("");
                setNewKitQuestions("");
                setNewKitDuration("60");
                toast({ title: "Kit Created!", description: `"${newKit.name}" saved to database.` });
            } else {
                throw new Error("Failed to create kit");
            }
        } catch (error) {
            toast({ title: "Creation Failed", description: "Could not save kit.", variant: "destructive" });
        } finally {
            setIsCreatingKit(false);
        }
    };

    const handleDeleteKit = async (kitId: string) => {
        try {
            const response = await fetch(`/api/interview-kits/${kitId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                setInterviewKits(prev => prev.filter(k => k._id !== kitId));
                toast({ title: "Kit Deleted", description: "Interview kit removed." });
            }
        } catch (error) {
            toast({ title: "Delete Failed", variant: "destructive" });
        }
    };

    const handleAIGenerateKit = async () => {
        // Get job title from dialog input or from selected candidate
        let jobTitle = aiKitJobTitle.trim();

        if (!jobTitle && selectedCandidate) {
            const candidate = candidates.find(c => c._id === selectedCandidate);
            jobTitle = candidate?.jobTitle || "";
        }

        if (!jobTitle) {
            toast({ title: "Job Title Required", description: "Please enter a job title to generate a kit.", variant: "destructive" });
            return;
        }

        // Check for duplicate kit locally first
        const existingKit = interviewKits.find(k =>
            k.targetRole?.toLowerCase() === jobTitle.toLowerCase() ||
            k.name.toLowerCase().includes(jobTitle.toLowerCase())
        );

        if (existingKit) {
            toast({
                title: "Kit Already Exists",
                description: `A kit for "${jobTitle}" already exists: "${existingKit.name}"`,
                variant: "destructive"
            });
            return;
        }

        setAiKitDialogOpen(false);

        setIsGeneratingKit(true);
        toast({ title: "AI Generating Kit", description: `Creating kit for ${jobTitle}... (using fast AI model)` });

        try {
            // Call AI endpoint (now uses fast nemotron-nano model)
            const response = await fetch("/api/ai/generate-interview-kit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    jobTitle: jobTitle,
                    type: interviewType,
                    duration: parseInt(duration)
                })
            });

            if (response.status === 409) {
                const data = await response.json();
                toast({ title: "Kit Already Exists", description: data.existingKit || "A kit for this role exists", variant: "destructive" });
                return;
            }

            if (!response.ok) {
                throw new Error("AI generation failed");
            }

            const generatedKit = await response.json();

            // Save the generated kit to database
            const saveResponse = await fetch("/api/interview-kits", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(generatedKit)
            });

            if (saveResponse.ok) {
                const savedKit = await saveResponse.json();
                setInterviewKits(prev => [...prev, savedKit]);
                toast({ title: "Kit Generated! ✨", description: `"${savedKit.name}" created with ${savedKit.questions?.length || 0} AI-powered questions.` });
            } else {
                throw new Error("Failed to save kit");
            }
        } catch (error) {
            toast({ title: "Generation Failed", description: "Could not generate kit. Please try again.", variant: "destructive" });
        } finally {
            setIsGeneratingKit(false);
        }
    };

    const toggleInterviewer = (id: string) => {
        setSelectedInterviewers(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const getInterviewerName = (interviewer: Interviewer) => {
        if (interviewer.profile?.firstName) {
            return `${interviewer.profile.firstName} ${interviewer.profile.lastName || ''}`;
        }
        return interviewer.email?.split('@')[0] || 'Unknown';
    };

    const getInterviewerInitials = (interviewer: Interviewer) => {
        if (interviewer.profile?.firstName) {
            return `${interviewer.profile.firstName[0]}${interviewer.profile.lastName?.[0] || ''}`;
        }
        return interviewer.email?.[0]?.toUpperCase() || '?';
    };

    const formatInterviewTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    // Find the selected day info from currentWeek
    const getSelectedDayInfo = () => {
        if (!selectedSlot) return null;
        return currentWeek.find(w => w.dateKey === selectedSlot.dateKey);
    };

    const selectedDayInfo = getSelectedDayInfo();

    return (
        <Layout title="Interview Scheduler">
            <Tabs defaultValue="schedule" className="space-y-6">
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="schedule">Schedule Interview</TabsTrigger>
                        <TabsTrigger value="upcoming">Upcoming Interviews</TabsTrigger>
                        <TabsTrigger value="kits">Interview Kits</TabsTrigger>
                    </TabsList>
                </div>

                {/* Schedule New Interview Tab */}
                <TabsContent value="schedule" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Panel */}
                        <div className="space-y-6">
                            {/* Candidate Selection */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Candidate</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a candidate" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {candidates.length === 0 ? (
                                                <div className="p-2 text-sm text-muted-foreground text-center">
                                                    No candidates ready for interview
                                                </div>
                                            ) : (
                                                candidates.map(c => (
                                                    <SelectItem key={c._id} value={c._id}>
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-6 w-6">
                                                                <AvatarFallback className="text-xs">
                                                                    {c.candidateName?.split(' ').map(n => n[0]).join('') || '?'}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <span className="font-medium">{c.candidateName}</span>
                                                                <span className="text-muted-foreground ml-2 text-xs">
                                                                    {c.jobTitle || c.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </CardContent>
                            </Card>

                            {/* Interview Type */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Interview Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Type</Label>
                                        <Select value={interviewType} onValueChange={setInterviewType}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="phone">Phone Screen</SelectItem>
                                                <SelectItem value="technical">Technical Interview</SelectItem>
                                                <SelectItem value="hr">HR Interview</SelectItem>
                                                <SelectItem value="panel">Panel Interview</SelectItem>
                                                <SelectItem value="final">Final Round</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Duration</Label>
                                        <Select value={duration} onValueChange={setDuration}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="30">30 minutes</SelectItem>
                                                <SelectItem value="45">45 minutes</SelectItem>
                                                <SelectItem value="60">60 minutes</SelectItem>
                                                <SelectItem value="90">90 minutes</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Timezone</Label>
                                        <Select value={timezone} onValueChange={setTimezone}>
                                            <SelectTrigger>
                                                <Globe className="h-4 w-4 mr-2" />
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ist">IST (UTC+5:30)</SelectItem>
                                                <SelectItem value="pst">PST (UTC-8)</SelectItem>
                                                <SelectItem value="est">EST (UTC-5)</SelectItem>
                                                <SelectItem value="utc">UTC</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Interview Panel */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Interview Panel</CardTitle>
                                    <CardDescription>Select interviewers</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : interviewers.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">No interviewers available</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {interviewers.map(interviewer => (
                                                <div
                                                    key={interviewer._id}
                                                    onClick={() => toggleInterviewer(interviewer._id)}
                                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedInterviewers.includes(interviewer._id)
                                                        ? 'border-primary bg-primary/5'
                                                        : 'hover:bg-muted/50'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                                                {getInterviewerInitials(interviewer)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="text-sm font-medium">{getInterviewerName(interviewer)}</p>
                                                            <p className="text-xs text-muted-foreground">{interviewer.role}</p>
                                                        </div>
                                                    </div>
                                                    {selectedInterviewers.includes(interviewer._id) && (
                                                        <CheckCircle2 className="h-5 w-5 text-primary" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Center Panel - Calendar */}
                        <div className="lg:col-span-2">
                            <Card className="h-full">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <Button variant="ghost" size="icon" onClick={() => setWeekOffset(prev => prev - 1)}>
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <CardTitle>{currentMonth} {currentYear}</CardTitle>
                                            <Button variant="ghost" size="icon" onClick={() => setWeekOffset(prev => prev + 1)}>
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <Button
                                            onClick={handleAutoSchedule}
                                            disabled={isAutoScheduling || selectedInterviewers.length === 0}
                                            className="gap-2"
                                        >
                                            {isAutoScheduling ? (
                                                <><Loader2 className="h-4 w-4 animate-spin" /> Finding Slots...</>
                                            ) : (
                                                <><Sparkles className="h-4 w-4" /> AI Auto-Schedule</>
                                            )}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="border rounded-lg overflow-hidden">
                                        <div className="grid grid-cols-8 bg-muted/50">
                                            <div className="p-3 border-r" />
                                            {currentWeek.map((weekDay, i) => (
                                                <div
                                                    key={weekDay.dateKey}
                                                    className={`p-3 text-center border-r last:border-r-0 ${weekDay.isToday ? 'bg-primary/10' : ''} ${weekDay.isWeekend ? 'bg-orange-50' : ''} ${weekDay.isPast ? 'opacity-50' : ''}`}
                                                >
                                                    <p className={`text-sm font-medium ${weekDay.isWeekend ? 'text-orange-600' : ''}`}>{weekDay.dayName}</p>
                                                    <p className={`text-lg font-bold ${weekDay.isToday ? 'text-primary' : 'text-muted-foreground'}`}>{weekDay.day}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <ScrollArea className="h-[400px]">
                                            {timeSlots.map(time => (
                                                <div key={time} className="grid grid-cols-8 border-t">
                                                    <div className="p-3 border-r text-xs text-muted-foreground">{time}</div>
                                                    {currentWeek.map((weekDay) => {
                                                        const isSelected = selectedSlot?.dateKey === weekDay.dateKey && selectedSlot?.time === time;

                                                        return (
                                                            <div
                                                                key={`${weekDay.dateKey}-${time}`}
                                                                onClick={() => !weekDay.isPast && setSelectedSlot({
                                                                    dateKey: weekDay.dateKey,
                                                                    time,
                                                                    fullDate: new Date(weekDay.fullDate)
                                                                })}
                                                                className={`p-2 border-r last:border-r-0 min-h-[48px] transition-colors ${isSelected
                                                                    ? 'bg-primary text-primary-foreground cursor-pointer'
                                                                    : weekDay.isPast
                                                                        ? 'bg-muted/30 cursor-not-allowed opacity-50'
                                                                        : weekDay.isWeekend
                                                                            ? 'bg-orange-50/50 hover:bg-orange-100 cursor-pointer'
                                                                            : 'hover:bg-muted/50 cursor-pointer'
                                                                    }`}
                                                            >
                                                                {isSelected && (
                                                                    <div className="text-xs p-1 rounded text-center font-medium">
                                                                        ✓ Selected
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </ScrollArea>
                                    </div>

                                    <div className="mt-6 flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                                        <div>
                                            {selectedSlot && selectedDayInfo ? (
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-primary" />
                                                        <span className="font-medium">
                                                            {selectedDayInfo.month} {selectedDayInfo.day}, {selectedDayInfo.year}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-4 w-4 text-primary" />
                                                        <span className="font-medium">{selectedSlot.time}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-4 w-4 text-primary" />
                                                        <span className="text-sm text-muted-foreground">
                                                            {selectedInterviewers.length} interviewer(s)
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-muted-foreground">Select a time slot to schedule</p>
                                            )}
                                        </div>
                                        <Button
                                            onClick={handleScheduleInterview}
                                            disabled={!selectedSlot || !selectedCandidate || selectedInterviewers.length === 0 || isScheduling}
                                            className="gap-2"
                                        >
                                            {isScheduling ? (
                                                <><Loader2 className="h-4 w-4 animate-spin" /> Scheduling...</>
                                            ) : (
                                                <><Send className="h-4 w-4" /> Schedule & Send Invites</>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* Upcoming Interviews Tab */}
                <TabsContent value="upcoming" className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Upcoming Interviews ({upcomingInterviews.length})</h2>
                        <Button variant="outline" size="sm" onClick={fetchUpcomingInterviews} className="gap-2">
                            <RefreshCw className="h-4 w-4" /> Refresh
                        </Button>
                    </div>

                    {upcomingInterviews.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Upcoming Interviews</h3>
                                <p className="text-muted-foreground">Schedule an interview to see it here.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {upcomingInterviews.map(interview => (
                                <Card key={interview._id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex gap-4">
                                                <div className="w-16 text-center">
                                                    <p className="text-2xl font-bold text-primary">
                                                        {new Date(interview.scheduledAt).getDate()}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(interview.scheduledAt).toLocaleString('default', { month: 'short' })}
                                                    </p>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-lg">{interview.candidateName}</h3>
                                                        <Badge variant={interview.status === "confirmed" ? "default" : "secondary"}>
                                                            {interview.status}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-muted-foreground">{interview.jobTitle}</p>
                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            {formatInterviewTime(interview.scheduledAt)} ({interview.duration} min)
                                                        </span>
                                                        <Badge variant="outline">{interview.type}</Badge>
                                                    </div>
                                                    {interview.interviewers?.length > 0 && (
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Users className="h-4 w-4 text-muted-foreground" />
                                                            <div className="flex -space-x-2">
                                                                {interview.interviewers.map((interviewer, i) => (
                                                                    <Avatar key={i} className="h-6 w-6 border-2 border-background">
                                                                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                                                            {interviewer.name?.split(" ").map(n => n[0]).join("") || '?'}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                ))}
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">
                                                                {interview.interviewers.map(i => i.name).join(", ")}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {interview.meetingLink && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-2"
                                                        onClick={() => window.open(interview.meetingLink, '_blank')}
                                                    >
                                                        <Video className="h-4 w-4" /> Join
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => handleCancelInterview(interview._id)}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Interview Kits Tab */}
                <TabsContent value="kits" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-semibold">Question Banks & Interview Kits</h2>
                            <p className="text-sm text-muted-foreground">Pre-built kits for consistent interviews</p>
                        </div>
                        <div className="flex gap-2">
                            <Dialog open={aiKitDialogOpen} onOpenChange={setAiKitDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="gap-2"
                                        disabled={isGeneratingKit}
                                    >
                                        {isGeneratingKit ? (
                                            <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                                        ) : (
                                            <><Sparkles className="h-4 w-4" /> AI Generate Kit</>
                                        )}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>AI Generate Interview Kit</DialogTitle>
                                        <DialogDescription>Enter a job title to generate AI-powered interview questions.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Job Title *</Label>
                                            <Input
                                                placeholder="e.g., Senior Python Developer"
                                                value={aiKitJobTitle}
                                                onChange={(e) => setAiKitJobTitle(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Interview Type</Label>
                                            <Select value={aiKitType} onValueChange={setAiKitType}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="technical">Technical</SelectItem>
                                                    <SelectItem value="behavioral">Behavioral</SelectItem>
                                                    <SelectItem value="hr">HR</SelectItem>
                                                    <SelectItem value="panel">Panel</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" onClick={() => setAiKitDialogOpen(false)}>Cancel</Button>
                                        <Button onClick={handleAIGenerateKit} disabled={!aiKitJobTitle.trim() || isGeneratingKit}>
                                            {isGeneratingKit ? (
                                                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</>
                                            ) : (
                                                <><Sparkles className="h-4 w-4 mr-2" /> Generate</>
                                            )}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button className="gap-2">
                                        <Plus className="h-4 w-4" /> Create Kit
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle>Create Interview Kit</DialogTitle>
                                        <DialogDescription>Build a structured question bank for your interviews.</DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Kit Name *</Label>
                                            <Input
                                                placeholder="e.g., Senior Frontend Technical"
                                                value={newKitName}
                                                onChange={(e) => setNewKitName(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Type *</Label>
                                                <Select value={newKitType} onValueChange={setNewKitType}>
                                                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="technical">Technical</SelectItem>
                                                        <SelectItem value="behavioral">Behavioral</SelectItem>
                                                        <SelectItem value="case_study">Case Study</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Duration (min)</Label>
                                                <Select value={newKitDuration} onValueChange={setNewKitDuration}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="30">30 min</SelectItem>
                                                        <SelectItem value="45">45 min</SelectItem>
                                                        <SelectItem value="60">60 min</SelectItem>
                                                        <SelectItem value="90">90 min</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Questions (one per line)</Label>
                                            <Textarea
                                                placeholder="What is your experience with React?&#10;Explain state management...&#10;How do you handle performance?"
                                                className="min-h-[120px]"
                                                value={newKitQuestions}
                                                onChange={(e) => setNewKitQuestions(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button variant="outline">Cancel</Button>
                                        </DialogClose>
                                        <DialogClose asChild>
                                            <Button onClick={handleCreateKit} disabled={isCreatingKit}>
                                                {isCreatingKit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                                Create Kit
                                            </Button>
                                        </DialogClose>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {interviewKits.map((kit, i) => (
                            <Card key={kit._id || i} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <Badge variant="outline">{kit.type}</Badge>
                                        <span className="text-xs text-muted-foreground">{kit.duration} min</span>
                                    </div>
                                    <h3 className="font-semibold mb-2">{kit.name}</h3>
                                    <p className="text-sm text-muted-foreground">{kit.questions.length} questions</p>
                                    <div className="flex gap-2 mt-4">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => setSelectedKit(kit)}
                                                >
                                                    <FileText className="h-4 w-4 mr-1" /> View
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>{kit.name}</DialogTitle>
                                                    <DialogDescription>
                                                        {kit.type} interview • {kit.duration} minutes
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="py-4">
                                                    <h4 className="font-medium mb-3">Questions ({kit.questions.length})</h4>
                                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                                        {kit.questions.map((q, idx) => {
                                                            const questionText = typeof q === 'string' ? q : q.question;
                                                            const category = typeof q === 'object' ? q.category : null;
                                                            return (
                                                                <div key={idx} className="p-3 bg-muted/50 rounded-lg text-sm">
                                                                    <p><strong>{idx + 1}.</strong> {questionText}</p>
                                                                    {category && <p className="text-xs text-muted-foreground mt-1">Category: {category}</p>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <DialogClose asChild>
                                                        <Button variant="outline">Close</Button>
                                                    </DialogClose>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => kit._id && handleDeleteKit(kit._id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </Layout >
    );
}
