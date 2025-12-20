/**
 * Candidate Match Dialog
 * Shows detailed candidate match breakdown for recruiters
 */

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Star,
    Users,
    Mail,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    MapPin,
    Clock,
    GraduationCap,
    Briefcase,
    ThumbsUp,
    ThumbsDown,
    Sparkles,
    Filter,
    ArrowUpDown,
    Loader2,
    Eye,
    FileText,
    Send,
    Calendar,
    X,
    ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Candidate {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    location?: string;
    experience?: string;
    skills?: string[];
    resume?: string;
    resumeUrl?: string;
    coverLetter?: string;
    matchScore: number;
    shortlisted: boolean;
    status: string;
    appliedAt?: string;
    jobRequirements?: string[];
    potentialConcerns?: string[];
    skillsAnalysis?: {
        score: number;
        requiredMatched: string[];
        requiredMissing: string[];
        preferredMatched: string[];
        additionalSkills: string[];
        totalRequired?: number;
        matchedCount?: number;
    };
    experienceAnalysis?: {
        score: number;
        totalYears: number;
        relevantYears: number;
        meetsRequirement: boolean;
        careerProgression: string;
    };
    educationAnalysis?: {
        score: number;
        degreeLevel: string;
        degreeField: string;
        university: string;
        certifications: string[];
    };
    projectsAnalysis?: {
        score: number;
        relevantProjects: string[];
        technologies: string[];
        projectCount: number;
    };
    culturalFitAnalysis?: {
        score: number;
        signals: string[];
    };
    aiRecommendation?: string;
    aiConfidence?: number;
    aiSummary?: string;
}

interface CandidateRankingDialogProps {
    open: boolean;
    onClose: () => void;
    jobId: string;
    jobTitle: string;
    onUpdate?: () => void; // Callback to notify parent when candidates change
}

export function CandidateRankingDialog({ open, onClose, jobId, jobTitle, onUpdate }: CandidateRankingDialogProps) {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [sort, setSort] = useState("score");
    const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [isScoring, setIsScoring] = useState(false);
    const [showScoreExplanation, setShowScoreExplanation] = useState(false);
    const [scoreExplanation, setScoreExplanation] = useState<any>(null);
    const [loadingExplanation, setLoadingExplanation] = useState(false);
    const { toast } = useToast();
    const token = localStorage.getItem("token");

    useEffect(() => {
        if (open && jobId) {
            fetchCandidates();
        }
    }, [open, jobId, filter, sort]);

    const fetchCandidates = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/jobs/${jobId}/candidates?filter=${filter}&sort=${sort}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.ok) {
                const data = await response.json();
                setCandidates(data);
            }
        } catch (error) {
            console.error("Failed to fetch candidates:", error);
        } finally {
            setLoading(false);
        }
    };

    const [isLoading, setIsLoading] = useState<string | null>(null);

    const handleShortlist = async (candidateId: string) => {
        const candidate = candidates.find(c => c._id === candidateId);
        const isCurrentlyShortlisted = candidate?.shortlisted || candidate?.status === "shortlisted";

        console.log("Shortlist toggle clicked for:", candidateId, "Currently shortlisted:", isCurrentlyShortlisted);
        setIsLoading(candidateId);

        try {
            if (isCurrentlyShortlisted) {
                // Remove from shortlist - update status back to applied
                const response = await fetch(`/api/applications/${candidateId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: "applied" })
                });

                if (response.ok) {
                    setCandidates(prev => prev.map(c =>
                        c._id === candidateId ? { ...c, shortlisted: false, status: "applied" } : c
                    ));
                    toast({ title: "Removed from shortlist" });
                    if (selectedCandidate?._id === candidateId) {
                        setSelectedCandidate({ ...selectedCandidate, shortlisted: false, status: "applied" });
                    }
                }
            } else {
                // Add to shortlist - send email with assessment code
                const response = await fetch(`/api/applications/${candidateId}/shortlist`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    }
                });
                const result = await response.json();
                console.log("Shortlist response:", result);

                if (response.ok) {
                    setCandidates(prev => prev.map(c =>
                        c._id === candidateId ? { ...c, shortlisted: true, status: "shortlisted" } : c
                    ));
                    toast({
                        title: "✅ Candidate Shortlisted!",
                        description: result.emailSent
                            ? "Acceptance email with assessment code sent"
                            : "Status updated (email pending)"
                    });
                    if (selectedCandidate?._id === candidateId) {
                        setSelectedCandidate({ ...selectedCandidate, shortlisted: true, status: "shortlisted" });
                    }
                } else {
                    toast({ title: "Error", description: result.error || "Failed to shortlist", variant: "destructive" });
                }
            }
        } catch (error: any) {
            console.error("Shortlist error:", error);
            toast({ title: "Failed to update", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(null);
        }
    };

    const handleRemove = async (candidateId: string) => {
        console.log("Remove clicked for:", candidateId);

        // Optimistic update - remove from UI immediately using functional update
        // This ensures multiple removals work correctly (each sees latest state)
        setCandidates(prev => prev.filter(c => c._id !== candidateId));

        // Clear selection immediately (Set doesn't have filter, so delete the id)
        setSelectedCandidates(prev => {
            const newSet = new Set(prev);
            newSet.delete(candidateId);
            return newSet;
        });
        if (selectedCandidate?._id === candidateId) {
            setSelectedCandidate(null);
        }

        try {
            const response = await fetch(`/api/applications/${candidateId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.ok) {
                toast({ title: "Candidate removed from job" });
                // Notify parent to update job data (e.g., applicant count)
                onUpdate?.();
            } else {
                const result = await response.json();
                toast({ title: "Error", description: result.error || "Failed to remove", variant: "destructive" });
                // Refetch on error to restore state
                fetchCandidates();
            }
        } catch (error: any) {
            console.error("Remove error:", error);
            toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
            // Refetch on error to restore state
            fetchCandidates();
        }
    };


    const handleReject = async (candidateId: string) => {
        console.log("Reject clicked for:", candidateId);
        try {
            // First send rejection email
            const response = await fetch(`/api/applications/${candidateId}/reject`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ feedback: "After careful review, we've decided to proceed with other candidates." })
            });
            const result = await response.json();
            console.log("Reject response:", result);

            if (response.ok) {
                // Delete application from DB so candidate can re-apply
                await fetch(`/api/applications/${candidateId}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` }
                });

                // Remove from UI list using functional update
                setCandidates(prev => prev.filter(c => c._id !== candidateId));
                toast({
                    title: "Candidate Rejected & Removed",
                    description: result.emailSent
                        ? "Rejection email sent. Candidate can now re-apply."
                        : "Candidate removed. They can now re-apply."
                });
                // Clear selection
                setSelectedCandidate(null);
                setFilter("all");
            } else {
                toast({ title: "Error", description: result.error || "Failed to reject", variant: "destructive" });
            }
        } catch (error: any) {
            console.error("Reject error:", error);
            toast({ title: "Failed to reject", description: error.message, variant: "destructive" });
        }
    };

    const handleInterview = async (candidateId: string) => {
        console.log("Interview clicked for:", candidateId);
        try {
            const response = await fetch(`/api/applications/${candidateId}/interview`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                    time: "10:00 AM",
                    type: "Video Call",
                    duration: "45 minutes"
                })
            });
            const result = await response.json();
            console.log("Interview response:", result);

            if (response.ok) {
                setCandidates(prev => prev.map(c =>
                    c._id === candidateId ? { ...c, status: "interview" } : c
                ));
                toast({
                    title: "🎤 Interview Scheduled!",
                    description: result.emailSent
                        ? "Interview invitation sent to candidate"
                        : "Status updated (email pending)"
                });
                if (selectedCandidate?._id === candidateId) {
                    setSelectedCandidate({ ...selectedCandidate, status: "interview" });
                }
            } else {
                toast({ title: "Error", description: result.error || "Failed to schedule", variant: "destructive" });
            }
        } catch (error: any) {
            console.error("Interview error:", error);
            toast({ title: "Failed to schedule interview", description: error.message, variant: "destructive" });
        }
    };


    const handleBulkShortlist = async (action: "add" | "remove") => {
        if (selectedCandidates.size === 0) return;

        try {
            const response = await fetch("/api/candidates/bulk-shortlist", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    candidateIds: Array.from(selectedCandidates),
                    action
                })
            });
            if (response.ok) {
                fetchCandidates();
                setSelectedCandidates(new Set());
                toast({
                    title: `${selectedCandidates.size} candidates ${action === "add" ? "shortlisted" : "removed"}`
                });
            }
        } catch (error) {
            toast({ title: "Bulk action failed", variant: "destructive" });
        }
    };

    const handleScoreAll = async () => {
        setIsScoring(true);
        try {
            const response = await fetch(`/api/jobs/${jobId}/score-all`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const result = await response.json();
                toast({
                    title: `Scored ${result.scored} candidates`,
                    description: "AI analysis complete"
                });
                fetchCandidates();
            }
        } catch (error) {
            toast({ title: "Scoring failed", variant: "destructive" });
        } finally {
            setIsScoring(false);
        }
    };

    // Fetch AI Score Explanation
    const fetchScoreExplanation = async (candidateId: string) => {
        setLoadingExplanation(true);
        try {
            const response = await fetch(`/api/matches/job/${jobId}/candidate/${candidateId}/explanation`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setScoreExplanation(data.explanation);
                setShowScoreExplanation(true);
            } else {
                toast({ title: "Could not load score explanation", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Failed to fetch explanation", variant: "destructive" });
        } finally {
            setLoadingExplanation(false);
        }
    };

    // View Resume
    const handleViewResume = (candidate: Candidate) => {
        // Try multiple sources for resume URL
        let url = candidate.resumeUrl;

        if (!url && candidate.resume) {
            // Construct URL from resume field
            if (candidate.resume.startsWith('/') || candidate.resume.startsWith('http')) {
                url = candidate.resume;
            } else {
                url = `/uploads/resumes/${candidate.resume}`;
            }
        }

        if (url) {
            window.open(url, '_blank');
        } else {
            toast({ title: "No resume available", description: "This candidate hasn't uploaded a resume yet", variant: "default" });
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return "text-green-600 bg-green-100";
        if (score >= 75) return "text-yellow-600 bg-yellow-100";
        if (score >= 60) return "text-orange-600 bg-orange-100";
        return "text-red-600 bg-red-100";
    };

    const getRecommendationBadge = (rec?: string) => {
        switch (rec) {
            case "STRONG_HIRE": return <Badge className="bg-green-600">⭐ Strong Hire</Badge>;
            case "HIRE": return <Badge className="bg-blue-600">✓ Hire</Badge>;
            case "MAYBE": return <Badge className="bg-yellow-600">? Maybe</Badge>;
            case "NO_HIRE": return <Badge variant="destructive">✗ No Hire</Badge>;
            default: return null;
        }
    };

    const shortlistedCount = candidates.filter(c => c.shortlisted).length;

    return (
        <>
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className="max-w-5xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Candidates for {jobTitle}
                        </DialogTitle>
                        <DialogDescription>
                            {candidates.length} applicants • {shortlistedCount} shortlisted
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-4">
                        {/* Left Panel - Candidate List */}
                        <div className="flex-1 space-y-4">
                            {/* Filters and Actions */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex gap-2">
                                    <Select value={filter} onValueChange={setFilter}>
                                        <SelectTrigger className="w-32">
                                            <Filter className="h-4 w-4 mr-1" />
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="shortlisted">Shortlisted</SelectItem>
                                            <SelectItem value="new">New</SelectItem>
                                            <SelectItem value="reviewed">Reviewed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={sort} onValueChange={setSort}>
                                        <SelectTrigger className="w-36">
                                            <ArrowUpDown className="h-4 w-4 mr-1" />
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="score">Match Score</SelectItem>
                                            <SelectItem value="date">Date Applied</SelectItem>
                                            <SelectItem value="name">Name</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleScoreAll}
                                        disabled={isScoring}
                                    >
                                        {isScoring ? (
                                            <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Scoring...</>
                                        ) : (
                                            <><Sparkles className="h-4 w-4 mr-1" /> AI Score All</>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Bulk Actions */}
                            {selectedCandidates.size > 0 && (
                                <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg">
                                    <span className="text-sm font-medium">{selectedCandidates.size} selected</span>
                                    <Button size="sm" variant="outline" onClick={() => handleBulkShortlist("add")}>
                                        <Star className="h-4 w-4 mr-1" /> Shortlist
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            // Remove each selected candidate
                                            selectedCandidates.forEach(id => handleRemove(id));
                                            setSelectedCandidates(new Set());
                                        }}
                                        disabled={isLoading !== null}
                                    >
                                        Remove
                                    </Button>
                                    <Button size="sm" variant="outline">
                                        <Mail className="h-4 w-4 mr-1" /> Email
                                    </Button>
                                </div>
                            )}

                            {/* Candidate List */}
                            <ScrollArea className="h-[500px] pr-4">
                                {loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : candidates.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>No candidates found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {candidates.map((candidate) => (
                                            <Card
                                                key={candidate._id}
                                                className={`cursor-pointer transition-all hover:shadow-md ${selectedCandidate?._id === candidate._id ? "ring-2 ring-primary" : ""
                                                    } ${candidate.shortlisted ? "border-l-4 border-l-amber-500" : ""}`}
                                                onClick={() => {
                                                    // Toggle: if same candidate is clicked, close the score panel
                                                    if (selectedCandidate?._id === candidate._id) {
                                                        setSelectedCandidate(null);
                                                    } else {
                                                        setSelectedCandidate(candidate);
                                                    }
                                                }}
                                            >
                                                <CardContent className="p-4">
                                                    <div className="flex items-start gap-3">
                                                        <Checkbox
                                                            checked={selectedCandidates.has(candidate._id)}
                                                            onCheckedChange={(checked) => {
                                                                const newSet = new Set(selectedCandidates);
                                                                if (checked) {
                                                                    newSet.add(candidate._id);
                                                                } else {
                                                                    newSet.delete(candidate._id);
                                                                }
                                                                setSelectedCandidates(newSet);
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <Avatar className="h-10 w-10">
                                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                                {candidate.name?.split(" ").map(n => n[0]).join("") || "?"}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-semibold truncate">{candidate.name}</h4>
                                                                {candidate.shortlisted && (
                                                                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-muted-foreground truncate">{candidate.email}</p>

                                                            {/* Quick Stats */}
                                                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                                {candidate.skillsAnalysis && (
                                                                    <span>Skills: {candidate.skillsAnalysis.score}%</span>
                                                                )}
                                                                {candidate.experienceAnalysis && (
                                                                    <span>Exp: {candidate.experienceAnalysis.totalYears}y</span>
                                                                )}
                                                                {candidate.location && (
                                                                    <span className="flex items-center gap-1">
                                                                        <MapPin className="h-3 w-3" />
                                                                        {candidate.location}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`text-2xl font-bold px-2 py-1 rounded ${getScoreColor(candidate.matchScore)}`}>
                                                                {candidate.matchScore || 0}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-1">Match</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>

                        {/* Candidate Profile Section removed - now handled by separate dialog below */}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Separate Candidate Profile Modal */}
            <Dialog open={!!selectedCandidate} onOpenChange={(open) => !open && setSelectedCandidate(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    {selectedCandidate && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-16 w-16">
                                        <AvatarFallback className="text-lg bg-primary/10 text-primary">
                                            {selectedCandidate.name?.split(" ").map(n => n[0]).join("") || "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <DialogTitle className="text-xl">{selectedCandidate.name}</DialogTitle>
                                        <DialogDescription className="flex items-center gap-2">
                                            <Mail className="h-3 w-3" />
                                            {selectedCandidate.email}
                                        </DialogDescription>
                                        <div className="flex gap-2 mt-2">
                                            {getRecommendationBadge(selectedCandidate.aiRecommendation)}
                                            {selectedCandidate.shortlisted && (
                                                <Badge className="bg-amber-500">⭐ Shortlisted</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="space-y-6 py-4">
                                {/* Overall Score */}
                                <div className="text-center p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg">
                                    <div className={`text-5xl font-bold ${getScoreColor(selectedCandidate.matchScore)}`}>
                                        {selectedCandidate.matchScore || 0}/100
                                    </div>
                                    <p className="text-muted-foreground">Overall Match Score</p>
                                    <Progress value={selectedCandidate.matchScore || 0} className="mt-3 h-2" />
                                </div>

                                {/* 5 Scoring Factors */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* Skills Match - 50% */}
                                    <Card className="border-l-4 border-l-blue-500">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm flex items-center justify-between">
                                                <span className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                                                    Skills Match
                                                </span>
                                                <Badge variant="outline">50%</Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className={`text-2xl font-bold ${getScoreColor(selectedCandidate.skillsAnalysis?.score || 0)}`}>
                                                {selectedCandidate.skillsAnalysis?.score || 0}%
                                            </div>
                                            <Progress value={selectedCandidate.skillsAnalysis?.score || 0} className="mt-2" />
                                            {selectedCandidate.skillsAnalysis?.requiredMatched && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {selectedCandidate.skillsAnalysis.requiredMatched.slice(0, 5).map((skill, i) => (
                                                        <Badge key={i} variant="secondary" className="text-xs bg-green-100 text-green-700">{skill}</Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Experience - 20% */}
                                    <Card className="border-l-4 border-l-green-500">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm flex items-center justify-between">
                                                <span className="flex items-center gap-2">
                                                    <Briefcase className="h-4 w-4 text-green-500" />
                                                    Experience
                                                </span>
                                                <Badge variant="outline">20%</Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className={`text-2xl font-bold ${getScoreColor(selectedCandidate.experienceAnalysis?.score || 0)}`}>
                                                {selectedCandidate.experienceAnalysis?.score || 0}%
                                            </div>
                                            <Progress value={selectedCandidate.experienceAnalysis?.score || 0} className="mt-2" />
                                            <div className="mt-2 text-sm text-muted-foreground">
                                                {selectedCandidate.experienceAnalysis?.totalYears || 0} years total, {selectedCandidate.experienceAnalysis?.relevantYears || 0} relevant
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Education - 15% */}
                                    <Card className="border-l-4 border-l-purple-500">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm flex items-center justify-between">
                                                <span className="flex items-center gap-2">
                                                    <GraduationCap className="h-4 w-4 text-purple-500" />
                                                    Education
                                                </span>
                                                <Badge variant="outline">15%</Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className={`text-2xl font-bold ${getScoreColor(selectedCandidate.educationAnalysis?.score || 0)}`}>
                                                {selectedCandidate.educationAnalysis?.score || 0}%
                                            </div>
                                            <Progress value={selectedCandidate.educationAnalysis?.score || 0} className="mt-2" />
                                            <div className="mt-2 text-sm text-muted-foreground">
                                                {selectedCandidate.educationAnalysis?.degreeLevel || "N/A"} - {selectedCandidate.educationAnalysis?.degreeField || "N/A"}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Projects - 10% */}
                                    <Card className="border-l-4 border-l-orange-500">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm flex items-center justify-between">
                                                <span className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-orange-500" />
                                                    Projects
                                                </span>
                                                <Badge variant="outline">10%</Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className={`text-2xl font-bold ${getScoreColor(selectedCandidate.projectsAnalysis?.score || 0)}`}>
                                                {selectedCandidate.projectsAnalysis?.score || 0}%
                                            </div>
                                            <Progress value={selectedCandidate.projectsAnalysis?.score || 0} className="mt-2" />
                                            <div className="mt-2 text-sm text-muted-foreground">
                                                {selectedCandidate.projectsAnalysis?.projectCount || 0} relevant projects
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Cultural Fit - 5% */}
                                    <Card className="border-l-4 border-l-pink-500">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm flex items-center justify-between">
                                                <span className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-pink-500" />
                                                    Cultural Fit
                                                </span>
                                                <Badge variant="outline">5%</Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className={`text-2xl font-bold ${getScoreColor(selectedCandidate.culturalFitAnalysis?.score || 0)}`}>
                                                {selectedCandidate.culturalFitAnalysis?.score || 0}%
                                            </div>
                                            <Progress value={selectedCandidate.culturalFitAnalysis?.score || 0} className="mt-2" />
                                            {selectedCandidate.culturalFitAnalysis?.signals && selectedCandidate.culturalFitAnalysis.signals.length > 0 && (
                                                <div className="mt-2 text-sm text-muted-foreground">
                                                    {selectedCandidate.culturalFitAnalysis.signals.slice(0, 2).join(", ")}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* AI Summary */}
                                {selectedCandidate.aiSummary && (
                                    <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-purple-500" />
                                                AI Analysis Summary
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm">{selectedCandidate.aiSummary}</p>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Actions */}
                                <div className="flex flex-wrap gap-3 pt-4 border-t">
                                    <Button
                                        variant={selectedCandidate.shortlisted ? "outline" : "default"}
                                        onClick={() => handleShortlist(selectedCandidate._id)}
                                        disabled={isLoading === selectedCandidate._id}
                                    >
                                        {isLoading === selectedCandidate._id ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Star className="h-4 w-4 mr-2" />
                                        )}
                                        {selectedCandidate.shortlisted ? "Remove from Shortlist" : "Shortlist"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleReject(selectedCandidate._id)}
                                        disabled={isLoading === selectedCandidate._id}
                                    >
                                        <ThumbsDown className="h-4 w-4 mr-2" />
                                        Reject
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                                        onClick={() => handleViewResume(selectedCandidate)}
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Resume
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"
                                        onClick={() => fetchScoreExplanation(selectedCandidate._id)}
                                        disabled={loadingExplanation}
                                    >
                                        {loadingExplanation ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Sparkles className="h-4 w-4 mr-2" />
                                        )}
                                        AI Score Details
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* AI Score Explanation Modal */}
            <Dialog open={showScoreExplanation} onOpenChange={setShowScoreExplanation}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">AI Matching Score Explanation</DialogTitle>
                        <DialogDescription>{selectedCandidate?.name}</DialogDescription>
                    </DialogHeader>

                    {scoreExplanation && (
                        <div className="space-y-6">
                            <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-24 h-24 rounded-full border-8 flex items-center justify-center ${scoreExplanation.totalScore >= 70 ? 'border-green-500' :
                                            scoreExplanation.totalScore >= 40 ? 'border-yellow-500' : 'border-red-500'
                                            }`}>
                                            <div className="text-center">
                                                <span className={`text-3xl font-bold ${scoreExplanation.totalScore >= 70 ? 'text-green-600' :
                                                    scoreExplanation.totalScore >= 40 ? 'text-yellow-600' : 'text-red-600'
                                                    }`}>{Math.round(scoreExplanation.totalScore)}</span>
                                                <span className="text-sm text-gray-500 block">/ 100</span>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-gray-700">{scoreExplanation.humanReadable || "Analysis complete."}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="space-y-3">
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium">Skills Match (50%)</span>
                                            <span className="font-semibold">{scoreExplanation.breakdown?.skills?.score || 0}%</span>
                                        </div>
                                        <Progress value={scoreExplanation.breakdown?.skills?.score || 0} />
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium">Experience (20%)</span>
                                            <span className="font-semibold">{scoreExplanation.breakdown?.experience?.score || 0}%</span>
                                        </div>
                                        <Progress value={scoreExplanation.breakdown?.experience?.score || 0} />
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium">Education (15%)</span>
                                            <span className="font-semibold">{scoreExplanation.breakdown?.department?.score || 0}%</span>
                                        </div>
                                        <Progress value={scoreExplanation.breakdown?.department?.score || 0} />
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium">Projects (10%)</span>
                                            <span className="font-semibold">{scoreExplanation.breakdown?.description?.score || 0}%</span>
                                        </div>
                                        <Progress value={scoreExplanation.breakdown?.description?.score || 0} />
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium">Cultural Fit (5%)</span>
                                            <span className="font-semibold">N/A</span>
                                        </div>
                                        <Progress value={0} />
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button onClick={() => setShowScoreExplanation(false)} className="bg-blue-600 hover:bg-blue-700">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
