import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "@/components/ui/dialog";
import {
    Code,
    FileText,
    Video,
    ListChecks,
    Plus,
    Clock,
    Users,
    CheckCircle2,
    XCircle,
    Play,
    Eye,
    BarChart3,
    Sparkles,
    AlertTriangle,
    TrendingUp,
    Brain,
    Zap,
    Copy,
    ExternalLink,
    Loader2,
    Trash2,
    Settings2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AssignTestModal from "@/components/assign-test-modal";
import TestBuilderModal from "@/components/test-builder-modal";
import ProctoringSettingsModal from "@/components/proctoring-settings-modal";
import AssessmentResultDetails from "@/components/assessment-result-details";

// Types
interface Assessment {
    _id: string;
    title: string;
    description?: string;
    type: string;
    language?: string;
    difficulty: string;
    timeLimit: number;
    questions: any[];
    avgScore?: number;
    completions?: number;
    isActive: boolean;
    proctoring?: {
        enabled: boolean;
        webcamRequired: boolean;
        tabSwitchLimit: number;
    };
    createdAt: string;
}

interface TestAssignment {
    _id: string;
    assessmentId: string;
    candidateId: string;
    candidateEmail: string;
    candidateName: string;
    status: string;
    score?: number;
    integrityScore?: number;
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
}

const typeIcons: Record<string, any> = {
    coding: Code,
    case_study: FileText,
    mcq: ListChecks,
    video_response: Video
};

const difficultyColors: Record<string, string> = {
    easy: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    hard: "bg-red-100 text-red-700"
};

export default function SkillAssessments() {
    const [tests, setTests] = useState<Assessment[]>([]);
    const [submissions, setSubmissions] = useState<TestAssignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTest, setSelectedTest] = useState<string | null>(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedTestForAssign, setSelectedTestForAssign] = useState<{ id: string, title: string } | null>(null);
    const [builderModalOpen, setBuilderModalOpen] = useState(false);
    const [selectedTestForBuilder, setSelectedTestForBuilder] = useState<{ id: string, title: string, questions: any[] } | null>(null);
    const [proctoringModalOpen, setProctoringModalOpen] = useState(false);
    const [selectedTestForProctoring, setSelectedTestForProctoring] = useState<{ id: string, title: string, proctoring: any } | null>(null);

    // Review submission dialog
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<TestAssignment | null>(null);

    const { toast } = useToast();

    // Form state for new assessment
    const [newTest, setNewTest] = useState({
        title: "",
        type: "coding",
        difficulty: "medium",
        language: "",
        timeLimit: 60,
        description: ""
    });
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    const token = localStorage.getItem("token");

    // Fetch assessments on mount
    useEffect(() => {
        fetchAssessments();
        fetchSubmissions();
    }, []);

    const fetchAssessments = async () => {
        try {
            const response = await fetch("/api/assessments", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTests(data);
            }
        } catch (error) {
            console.error("Failed to fetch assessments:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSubmissions = async () => {
        try {
            // Get all assignments across all assessments
            const response = await fetch("/api/assessments", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const assessments = await response.json();
                const allSubmissions: TestAssignment[] = [];

                for (const assessment of assessments) {
                    const assignRes = await fetch(`/api/assessments/${assessment._id}/assignments`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (assignRes.ok) {
                        const assignments = await assignRes.json();
                        allSubmissions.push(...assignments.map((a: any) => ({
                            ...a,
                            testTitle: assessment.title,
                            testType: assessment.type
                        })));
                    }
                }
                setSubmissions(allSubmissions.filter(s => s.status === "completed"));
            }
        } catch (error) {
            console.error("Failed to fetch submissions:", error);
        }
    };

    const handleCreateTest = async () => {
        try {
            const response = await fetch("/api/assessments", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...newTest,
                    questions: [],
                    proctoring: { enabled: true, webcamRequired: true, tabSwitchLimit: 3 }
                })
            });

            if (response.ok) {
                toast({ title: "Assessment Created", description: "Now add questions to your test." });
                setCreateDialogOpen(false);
                setNewTest({ title: "", type: "coding", difficulty: "medium", language: "", timeLimit: 60, description: "" });
                fetchAssessments();
            } else {
                throw new Error("Failed to create");
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to create assessment", variant: "destructive" });
        }
    };

    const handleDuplicateTest = async (testId: string) => {
        try {
            const response = await fetch(`/api/assessments/${testId}/duplicate`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                toast({ title: "Test Duplicated", description: "A copy has been created." });
                fetchAssessments();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to duplicate test", variant: "destructive" });
        }
    };

    const handleDeleteTest = async (testId: string) => {
        try {
            const response = await fetch(`/api/assessments/${testId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                toast({ title: "Test Deleted", description: "Assessment has been archived." });
                fetchAssessments();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete test", variant: "destructive" });
        }
    };

    const handleAssignTest = (testId: string, testTitle: string) => {
        setSelectedTestForAssign({ id: testId, title: testTitle });
        setAssignModalOpen(true);
    };

    const handleEditTest = (test: Assessment) => {
        setSelectedTestForBuilder({
            id: test._id,
            title: test.title,
            questions: test.questions || []
        });
        setBuilderModalOpen(true);
    };

    // AI Generate assessment content
    const handleAIGenerate = async () => {
        if (!newTest.title) {
            toast({ title: "Enter a title first", description: "We need a title to generate content", variant: "destructive" });
            return;
        }

        setIsGeneratingAI(true);
        try {
            const response = await fetch("/api/assessments/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: newTest.title,
                    type: newTest.type,
                    difficulty: newTest.difficulty,
                    language: newTest.language
                })
            });

            if (response.ok) {
                const generated = await response.json();
                setNewTest({
                    ...newTest,
                    description: generated.description || newTest.description,
                    timeLimit: generated.timeLimit || newTest.timeLimit
                });
                toast({ title: "✨ Content Generated", description: "AI has created a description for your assessment!" });
            } else {
                const error = await response.json();
                toast({ title: "Generation Failed", description: error.error || "Could not generate content", variant: "destructive" });
            }
        } catch (error) {
            console.error("AI generate error:", error);
            toast({ title: "Error", description: "Failed to generate content", variant: "destructive" });
        } finally {
            setIsGeneratingAI(false);
        }
    };

    return (
        <Layout title="Skill Assessments">
            <Tabs defaultValue="library" className="space-y-6">
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="library">Test Library</TabsTrigger>
                        <TabsTrigger value="submissions">Submissions</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    </TabsList>

                    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
                                <Plus className="h-4 w-4" />
                                Create Test
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Create New Assessment</DialogTitle>
                                <DialogDescription>
                                    Build a custom skill assessment for your candidates.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label>Test Title</Label>
                                    <Input
                                        placeholder="e.g., Senior Frontend Coding Challenge"
                                        value={newTest.title}
                                        onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Type</Label>
                                        <Select
                                            value={newTest.type}
                                            onValueChange={(value) => setNewTest({ ...newTest, type: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="coding">
                                                    <div className="flex items-center gap-2">
                                                        <Code className="h-4 w-4" /> Coding Challenge
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="case_study">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4" /> Case Study
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="mcq">
                                                    <div className="flex items-center gap-2">
                                                        <ListChecks className="h-4 w-4" /> MCQ Assessment
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="video">
                                                    <div className="flex items-center gap-2">
                                                        <Video className="h-4 w-4" /> Video Response
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Difficulty</Label>
                                        <Select
                                            value={newTest.difficulty}
                                            onValueChange={(value) => setNewTest({ ...newTest, difficulty: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select difficulty" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="easy">Easy</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="hard">Hard</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Programming Language</Label>
                                        <Select
                                            value={newTest.language}
                                            onValueChange={(value) => setNewTest({ ...newTest, language: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select language" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="javascript">JavaScript</SelectItem>
                                                <SelectItem value="typescript">TypeScript</SelectItem>
                                                <SelectItem value="python">Python</SelectItem>
                                                <SelectItem value="java">Java</SelectItem>
                                                <SelectItem value="go">Go</SelectItem>
                                                <SelectItem value="rust">Rust</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Time Limit (minutes)</Label>
                                        <Input
                                            type="number"
                                            placeholder="60"
                                            value={newTest.timeLimit}
                                            onChange={(e) => setNewTest({ ...newTest, timeLimit: parseInt(e.target.value) || 60 })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea
                                        placeholder="Describe what this assessment evaluates..."
                                        value={newTest.description}
                                        onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                                    />
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleAIGenerate}
                                    disabled={isGeneratingAI || !newTest.title}
                                    className="w-full bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border-purple-200"
                                >
                                    {isGeneratingAI ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Generating with AI...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
                                            <span className="text-purple-700">Auto-fill with AI</span>
                                        </>
                                    )}
                                </Button>
                            </div>

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={async () => {
                                        try {
                                            const response = await fetch("/api/assessments", {
                                                method: "POST",
                                                headers: {
                                                    "Content-Type": "application/json",
                                                    Authorization: `Bearer ${token}`
                                                },
                                                body: JSON.stringify({
                                                    ...newTest,
                                                    isActive: false, // Draft
                                                    questions: [],
                                                    proctoring: { enabled: true, webcamRequired: true, tabSwitchLimit: 3 }
                                                })
                                            });
                                            if (response.ok) {
                                                toast({ title: "Saved as Draft", description: "You can continue editing later." });
                                                setCreateDialogOpen(false);
                                                setNewTest({ title: "", type: "coding", difficulty: "medium", language: "", timeLimit: 60, description: "" });
                                                fetchAssessments();
                                            }
                                        } catch (error) {
                                            toast({ title: "Error", description: "Failed to save draft", variant: "destructive" });
                                        }
                                    }}
                                    disabled={!newTest.title}
                                >
                                    Save as Draft
                                </Button>
                                <Button
                                    onClick={async () => {
                                        try {
                                            const response = await fetch("/api/assessments", {
                                                method: "POST",
                                                headers: {
                                                    "Content-Type": "application/json",
                                                    Authorization: `Bearer ${token}`
                                                },
                                                body: JSON.stringify({
                                                    ...newTest,
                                                    isActive: true,
                                                    questions: [],
                                                    proctoring: { enabled: true, webcamRequired: true, tabSwitchLimit: 3 }
                                                })
                                            });
                                            if (response.ok) {
                                                const created = await response.json();
                                                toast({ title: "Assessment Created", description: "Now add questions." });
                                                setCreateDialogOpen(false);
                                                setNewTest({ title: "", type: "coding", difficulty: "medium", language: "", timeLimit: 60, description: "" });
                                                fetchAssessments();
                                                // Open the question builder for the new assessment
                                                setSelectedTestForBuilder({
                                                    id: created._id,
                                                    title: created.title,
                                                    questions: []
                                                });
                                                setBuilderModalOpen(true);
                                            }
                                        } catch (error) {
                                            toast({ title: "Error", description: "Failed to create assessment", variant: "destructive" });
                                        }
                                    }}
                                    disabled={!newTest.title}
                                >
                                    Create & Add Questions
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Test Library Tab */}
                <TabsContent value="library" className="space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : tests.length === 0 ? (
                        <Card className="p-12 text-center">
                            <ListChecks className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="font-semibold mb-2">No Assessments Yet</h3>
                            <p className="text-muted-foreground mb-4">Create your first assessment to start evaluating candidates.</p>
                            <Button onClick={() => setCreateDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" /> Create Assessment
                            </Button>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tests.map(test => {
                                const TypeIcon = typeIcons[test.type] || Code;
                                return (
                                    <Card key={test._id} className={`hover:shadow-md transition-shadow ${!test.isActive ? 'opacity-60' : ''}`}>
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className={`p-2 rounded-lg ${test.type === 'coding' ? 'bg-blue-100 text-blue-600' :
                                                    test.type === 'case_study' ? 'bg-purple-100 text-purple-600' :
                                                        test.type === 'mcq' ? 'bg-green-100 text-green-600' :
                                                            'bg-orange-100 text-orange-600'
                                                    }`}>
                                                    <TypeIcon className="h-5 w-5" />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={difficultyColors[test.difficulty]}>
                                                        {test.difficulty}
                                                    </Badge>
                                                    {!test.isActive && (
                                                        <Badge variant="outline">Draft</Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <h3 className="font-semibold mb-1">{test.title}</h3>
                                            {test.language && (
                                                <p className="text-sm text-muted-foreground mb-3">{test.language}</p>
                                            )}

                                            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {test.timeLimit} min
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <ListChecks className="h-3 w-3" />
                                                    {test.questions?.length || 0} questions
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-sm mb-4">
                                                <div>
                                                    <span className="text-muted-foreground">Avg Score:</span>
                                                    <span className={`font-bold ml-1 ${(test.avgScore || 0) >= 80 ? 'text-green-600' : (test.avgScore || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                        {test.avgScore || 0}%
                                                    </span>
                                                </div>
                                                <div className="text-muted-foreground">
                                                    {test.completions || 0} completions
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDuplicateTest(test._id)}
                                                >
                                                    <Copy className="h-3.5 w-3.5 mr-1" />
                                                    Copy
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEditTest(test)}
                                                >
                                                    <FileText className="h-3.5 w-3.5 mr-1" />
                                                    Questions ({test.questions?.length || 0})
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => {
                                                        setSelectedTestForProctoring({
                                                            id: test._id,
                                                            title: test.title,
                                                            proctoring: test.proctoring || {}
                                                        });
                                                        setProctoringModalOpen(true);
                                                    }}
                                                    title="Proctoring Settings"
                                                >
                                                    <Settings2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => handleAssignTest(test._id, test.title)}
                                                >
                                                    <Users className="h-3.5 w-3.5 mr-1" />
                                                    Assign
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteTest(test._id)}
                                                    className="text-red-500 hover:text-red-600"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* Submissions Tab */}
                <TabsContent value="submissions" className="space-y-4">
                    <div className="flex items-center gap-4 mb-4">
                        <Select defaultValue="all">
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Submissions</SelectItem>
                                <SelectItem value="pending">Pending Review</SelectItem>
                                <SelectItem value="graded">Graded</SelectItem>
                                <SelectItem value="flagged">Flagged</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select defaultValue="all">
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by test" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Tests</SelectItem>
                                {tests.map(t => (
                                    <SelectItem key={t._id} value={t._id}>{t.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-4">
                        {submissions.length === 0 ? (
                            <Card className="p-8 text-center text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                                <p>No completed submissions yet</p>
                            </Card>
                        ) : (
                            submissions.map((submission: any) => (
                                <Card key={submission._id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex gap-4">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarFallback className="bg-primary/10 text-primary">
                                                        {(submission.candidateName || submission.candidateEmail || "?").split(" ").map((n: string) => n[0]).join("")}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold">{submission.candidateName || submission.candidateEmail}</h3>
                                                        <Badge className="bg-green-100 text-green-700">Completed</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{submission.testTitle}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {submission.completedAt ? new Date(submission.completedAt).toLocaleString() : "N/A"}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-primary">
                                                        {submission.score !== undefined ? `${submission.score}%` : '—'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">Score</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className={`text-2xl font-bold ${(submission.integrityScore || 100) >= 90 ? 'text-green-600' : (submission.integrityScore || 100) >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                        {submission.integrityScore || 100}%
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">Integrity</p>
                                                </div>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2"
                                                    onClick={() => {
                                                        setSelectedSubmission(submission);
                                                        setReviewDialogOpen(true);
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    Review
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics" className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Users className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">297</p>
                                        <p className="text-sm text-muted-foreground">Total Submissions</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <TrendingUp className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">76%</p>
                                        <p className="text-sm text-muted-foreground">Avg Pass Rate</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <Clock className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">42 min</p>
                                        <p className="text-sm text-muted-foreground">Avg Completion Time</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 rounded-lg">
                                        <AlertTriangle className="h-5 w-5 text-red-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">8%</p>
                                        <p className="text-sm text-muted-foreground">Flagged Rate</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Test Performance Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Test Performance</CardTitle>
                            <CardDescription>Breakdown by individual assessments</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="p-4 text-left font-medium">Test Name</th>
                                            <th className="p-4 text-left font-medium">Type</th>
                                            <th className="p-4 text-center font-medium">Completions</th>
                                            <th className="p-4 text-center font-medium">Avg Score</th>
                                            <th className="p-4 text-center font-medium">Pass Rate</th>
                                            <th className="p-4 text-center font-medium">Avg Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {tests.filter((t: any) => t.isActive !== false).map((test: any) => {
                                            const TypeIcon = typeIcons[test.type as keyof typeof typeIcons] || FileText;
                                            return (
                                                <tr key={test._id} className="hover:bg-muted/30">
                                                    <td className="p-4 font-medium">{test.title}</td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <TypeIcon className="h-4 w-4 text-muted-foreground" />
                                                            {(test.type || "technical").replace("_", " ")}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center">{test.completions || 0}</td>
                                                    <td className="p-4 text-center">
                                                        <span className={(test.avgScore || 0) >= 80 ? 'text-green-600' : (test.avgScore || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'}>
                                                            {test.avgScore || 0}%
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <Progress value={((test.avgScore || 0) / 100) * 85} className="h-2 w-20 mx-auto" />
                                                    </td>
                                                    <td className="p-4 text-center text-muted-foreground">
                                                        {Math.round((test.timeLimit || 30) * 0.7)} min
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* AI Insights */}
                    <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Brain className="h-5 w-5 text-primary" />
                                <CardTitle>AI Assessment Insights</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-white/50 rounded-lg border">
                                    <div className="flex items-center gap-2 text-green-600 mb-2">
                                        <Zap className="h-4 w-4" />
                                        <span className="font-medium">Top Performers</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Candidates from referrals score 23% higher on average in coding challenges.
                                    </p>
                                </div>
                                <div className="p-4 bg-white/50 rounded-lg border">
                                    <div className="flex items-center gap-2 text-orange-600 mb-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span className="font-medium">Difficulty Spike</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Question #3 in "System Design" has 65% failure rate. Consider adjusting.
                                    </p>
                                </div>
                                <div className="p-4 bg-white/50 rounded-lg border">
                                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                                        <TrendingUp className="h-4 w-4" />
                                        <span className="font-medium">Correlation Found</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        High trust scores (95%+) correlate with 2.3x better on-job performance.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Assign Test Modal */}
            {selectedTestForAssign && (
                <AssignTestModal
                    open={assignModalOpen}
                    onClose={() => {
                        setAssignModalOpen(false);
                        setSelectedTestForAssign(null);
                    }}
                    testId={selectedTestForAssign.id}
                    testTitle={selectedTestForAssign.title}
                />
            )}

            {/* Test Builder Modal */}
            {selectedTestForBuilder && (
                <TestBuilderModal
                    open={builderModalOpen}
                    onClose={() => {
                        setBuilderModalOpen(false);
                        setSelectedTestForBuilder(null);
                    }}
                    testId={selectedTestForBuilder.id}
                    testTitle={selectedTestForBuilder.title}
                    existingQuestions={selectedTestForBuilder.questions}
                    onSave={() => fetchAssessments()}
                />
            )}

            {/* Proctoring Settings Modal */}
            {selectedTestForProctoring && (
                <ProctoringSettingsModal
                    open={proctoringModalOpen}
                    onClose={() => {
                        setProctoringModalOpen(false);
                        setSelectedTestForProctoring(null);
                    }}
                    testId={selectedTestForProctoring.id}
                    testTitle={selectedTestForProctoring.title}
                    currentSettings={selectedTestForProctoring.proctoring}
                    onSave={() => fetchAssessments()}
                />
            )}

            {/* Assessment Result Details Dialog */}
            {selectedSubmission && (
                <AssessmentResultDetails
                    open={reviewDialogOpen}
                    onClose={() => {
                        setReviewDialogOpen(false);
                        setSelectedSubmission(null);
                    }}
                    result={{
                        _id: selectedSubmission._id,
                        assessmentId: {
                            _id: selectedSubmission.assessmentId,
                            title: tests.find(t => t._id === selectedSubmission.assessmentId)?.title || "Assessment",
                            type: tests.find(t => t._id === selectedSubmission.assessmentId)?.type || "coding",
                            timeLimit: tests.find(t => t._id === selectedSubmission.assessmentId)?.timeLimit || 60
                        },
                        candidateName: selectedSubmission.candidateName,
                        candidateEmail: selectedSubmission.candidateEmail,
                        score: selectedSubmission.score || 0,
                        integrityScore: selectedSubmission.integrityScore || 100,
                        status: selectedSubmission.status,
                        startedAt: selectedSubmission.startedAt,
                        completedAt: selectedSubmission.completedAt,
                        answers: (selectedSubmission as any).answers || [],
                        proctoringReport: (selectedSubmission as any).proctoringReport || {
                            flags: [],
                            overallIntegrity: selectedSubmission.integrityScore || 100,
                            tabSwitchCount: 0,
                            webcamSnapshots: 0,
                            timeInFullscreen: 100
                        }
                    }}
                />
            )}
        </Layout>
    );
}
