import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    CheckCircle, XCircle, AlertTriangle, Clock, Camera, Monitor, MousePointer,
    Eye, Shield, Award, FileText, TrendingUp, ChevronRight
} from "lucide-react";

interface ProctoringFlag {
    type: "tab_switch" | "face_not_visible" | "multiple_faces" | "audio_detected" | "screen_share_stopped" | "suspicious_behavior";
    timestamp: string;
    severity: "low" | "medium" | "high";
    details?: string;
}

interface AssessmentResultDetailsProps {
    open: boolean;
    onClose: () => void;
    result: {
        _id: string;
        assessmentId: {
            _id: string;
            title: string;
            type: string;
            timeLimit: number;
        };
        candidateName: string;
        candidateEmail?: string;
        score: number;
        integrityScore: number;
        status: string;
        startedAt?: string;
        completedAt?: string;
        timeTaken?: number;
        answers?: Array<{
            questionId: string;
            questionIndex?: number;
            questionTitle?: string;
            questionType?: string;
            answer: any;
            selectedOption?: string;
            textAnswer?: string;
            code?: string;
            score?: number;
            maxScore?: number;
            isCorrect?: boolean;
            feedback?: string;
        }>;
        proctoringReport?: {
            flags: ProctoringFlag[];
            overallIntegrity: number;
            tabSwitchCount?: number;
            webcamSnapshots?: number;
            timeInFullscreen?: number;
        };
    };
}

const flagIcons: Record<string, any> = {
    tab_switch: Monitor,
    face_not_visible: Eye,
    multiple_faces: Camera,
    audio_detected: AlertTriangle,
    screen_share_stopped: Monitor,
    suspicious_behavior: AlertTriangle,
};

const flagLabels: Record<string, string> = {
    tab_switch: "Tab Switch",
    face_not_visible: "Face Not Visible",
    multiple_faces: "Multiple Faces Detected",
    audio_detected: "Background Audio",
    screen_share_stopped: "Screen Share Stopped",
    suspicious_behavior: "Suspicious Behavior",
};

const severityColors: Record<string, string> = {
    low: "bg-yellow-100 text-yellow-700 border-yellow-200",
    medium: "bg-orange-100 text-orange-700 border-orange-200",
    high: "bg-red-100 text-red-700 border-red-200",
};

export default function AssessmentResultDetails({ open, onClose, result }: AssessmentResultDetailsProps) {
    const [activeTab, setActiveTab] = useState("overview");

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-600";
        if (score >= 60) return "text-yellow-600";
        return "text-red-600";
    };

    const getIntegrityBadge = (score: number) => {
        if (score >= 90) return { label: "Clean", variant: "default", className: "bg-green-500" };
        if (score >= 70) return { label: "Minor Issues", variant: "secondary", className: "bg-yellow-500" };
        return { label: "Flagged", variant: "destructive", className: "bg-red-500" };
    };

    const integrityBadge = getIntegrityBadge(result.integrityScore);
    const proctoringReport = result.proctoringReport;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Assessment Result Details
                    </DialogTitle>
                    <DialogDescription>
                        {result.candidateName} • {result.assessmentId.title}
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid grid-cols-3 w-full">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="answers">Answers</TabsTrigger>
                        <TabsTrigger value="proctoring">Proctoring Report</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="flex-1 overflow-auto">
                        <div className="space-y-4 py-4">
                            {/* Score Cards */}
                            <div className="grid grid-cols-3 gap-4">
                                <Card>
                                    <CardContent className="pt-4 text-center">
                                        <Award className="h-8 w-8 mx-auto text-primary mb-2" />
                                        <p className={`text-3xl font-bold ${getScoreColor(result.score)}`}>
                                            {result.score}%
                                        </p>
                                        <p className="text-sm text-muted-foreground">Assessment Score</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-4 text-center">
                                        <Shield className="h-8 w-8 mx-auto text-green-600 mb-2" />
                                        <p className={`text-3xl font-bold ${getScoreColor(result.integrityScore)}`}>
                                            {result.integrityScore}%
                                        </p>
                                        <p className="text-sm text-muted-foreground">Integrity Score</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-4 text-center">
                                        <Clock className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                                        <p className="text-3xl font-bold">
                                            {result.timeTaken || result.assessmentId.timeLimit} min
                                        </p>
                                        <p className="text-sm text-muted-foreground">Time Taken</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Status Badge */}
                            <div className="flex items-center gap-4">
                                <Badge className={integrityBadge.className}>{integrityBadge.label}</Badge>
                                {proctoringReport?.flags && proctoringReport.flags.length > 0 && (
                                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        {proctoringReport.flags.length} Flag(s)
                                    </Badge>
                                )}
                            </div>

                            {/* Proctoring Summary */}
                            {proctoringReport && (
                                <Card className="bg-muted/30">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium">Proctoring Summary</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Tab Switches</p>
                                            <p className="font-medium">{proctoringReport.tabSwitchCount || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Webcam Snapshots</p>
                                            <p className="font-medium">{proctoringReport.webcamSnapshots || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Fullscreen Time</p>
                                            <p className="font-medium">{Math.round((proctoringReport.timeInFullscreen || 100))}%</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Timeline */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Timeline</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    {result.startedAt && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                                            <span>Started: {new Date(result.startedAt).toLocaleString()}</span>
                                        </div>
                                    )}
                                    {result.completedAt && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                            <span>Completed: {new Date(result.completedAt).toLocaleString()}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Answers Tab */}
                    <TabsContent value="answers" className="flex-1 overflow-hidden">
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-4 py-4">
                                {/* Get questions from assessment */}
                                {(() => {
                                    const assessment = result.assessmentId as any;
                                    const questions = assessment?.questions || [];
                                    const answers = result.answers || [];

                                    if (questions.length === 0 && answers.length === 0) {
                                        return (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <FileText className="h-8 w-8 mx-auto mb-2" />
                                                <p>No answer details available</p>
                                                <p className="text-xs mt-1">Assessment questions were not recorded</p>
                                            </div>
                                        );
                                    }

                                    // Match questions with answers
                                    return questions.map((q: any, idx: number) => {
                                        const answer = answers.find((a: any) =>
                                            a.questionId === q._id?.toString() ||
                                            a.questionId === q.id ||
                                            a.questionIndex === idx
                                        );

                                        const candidateAnswer = answer?.selectedOption ||
                                            answer?.textAnswer ||
                                            answer?.code ||
                                            answer?.answer ||
                                            "Not answered";

                                        const isCorrect = q.type === 'mcq' && q.correctAnswer
                                            ? candidateAnswer === q.correctAnswer
                                            : answer?.isCorrect;

                                        return (
                                            <Card key={idx} className={`${isCorrect === false ? 'border-red-200 bg-red-50/30' :
                                                isCorrect === true ? 'border-green-200 bg-green-50/30' : ''}`}>
                                                <CardContent className="p-4 space-y-3">
                                                    {/* Question Header */}
                                                    <div className="flex items-start gap-3">
                                                        <div className={`p-2 rounded-full flex-shrink-0 ${isCorrect === true ? 'bg-green-100' :
                                                            isCorrect === false ? 'bg-red-100' : 'bg-muted'
                                                            }`}>
                                                            {isCorrect === true ? (
                                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                                            ) : isCorrect === false ? (
                                                                <XCircle className="h-4 w-4 text-red-600" />
                                                            ) : (
                                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <p className="font-semibold text-sm">
                                                                    Question {idx + 1}
                                                                    <Badge variant="outline" className="ml-2 text-xs capitalize">
                                                                        {q.type || 'unknown'}
                                                                    </Badge>
                                                                </p>
                                                                <Badge variant={isCorrect === true ? 'default' : isCorrect === false ? 'destructive' : 'secondary'}>
                                                                    {answer?.score || 0}/{q.points || 10} pts
                                                                </Badge>
                                                            </div>

                                                            {/* Question Text */}
                                                            <p className="text-sm font-medium mb-3 whitespace-pre-wrap">
                                                                {q.question || q.title || q.description || "Question text not available"}
                                                            </p>

                                                            {/* MCQ Options */}
                                                            {q.type === 'mcq' && q.options && (
                                                                <div className="space-y-1 mb-3">
                                                                    {q.options.map((opt: string, optIdx: number) => (
                                                                        <div key={optIdx} className={`flex items-center gap-2 p-2 rounded text-sm ${opt === q.correctAnswer ? 'bg-green-100 border border-green-200' :
                                                                            opt === candidateAnswer && opt !== q.correctAnswer ? 'bg-red-100 border border-red-200' :
                                                                                'bg-muted/50'
                                                                            }`}>
                                                                            <span className="w-5 h-5 rounded-full bg-background border flex items-center justify-center text-xs">
                                                                                {String.fromCharCode(65 + optIdx)}
                                                                            </span>
                                                                            <span>{opt}</span>
                                                                            {opt === q.correctAnswer && (
                                                                                <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                                                                            )}
                                                                            {opt === candidateAnswer && opt !== q.correctAnswer && (
                                                                                <XCircle className="h-4 w-4 text-red-600 ml-auto" />
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Candidate's Answer Display */}
                                                            {q.type !== 'mcq' && (
                                                                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                                                                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                                                                        Candidate's Answer:
                                                                    </p>
                                                                    {q.type === 'coding' || answer?.code ? (
                                                                        <pre className="text-xs bg-background p-2 rounded border overflow-x-auto max-h-40">
                                                                            <code>{answer?.code || candidateAnswer}</code>
                                                                        </pre>
                                                                    ) : (
                                                                        <p className="text-sm whitespace-pre-wrap">
                                                                            {candidateAnswer}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* AI Feedback if available */}
                                                            {answer?.feedback && (
                                                                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100">
                                                                    <p className="text-xs font-semibold text-blue-700 mb-1">AI Feedback:</p>
                                                                    <p className="text-sm text-blue-800">{answer.feedback}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    });
                                })()}

                                {/* Show raw answers if no questions but answers exist */}
                                {(() => {
                                    const assessment = result.assessmentId as any;
                                    const questions = assessment?.questions || [];
                                    const answers = result.answers || [];

                                    if (questions.length === 0 && answers.length > 0) {
                                        return answers.map((answer: any, idx: number) => (
                                            <Card key={idx}>
                                                <CardContent className="p-4">
                                                    <div className="flex items-start gap-3">
                                                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                                        <div className="flex-1">
                                                            <p className="font-medium mb-2">Answer {idx + 1}</p>
                                                            <div className="p-2 bg-muted rounded text-sm">
                                                                {typeof answer === 'object' ? (
                                                                    <pre className="text-xs overflow-x-auto">
                                                                        {JSON.stringify(answer, null, 2)}
                                                                    </pre>
                                                                ) : (
                                                                    <p>{String(answer)}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ));
                                    }
                                    return null;
                                })()}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    {/* Proctoring Tab */}
                    <TabsContent value="proctoring" className="flex-1 overflow-hidden">
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-4 py-4">
                                {/* Integrity Meter */}
                                <Card>
                                    <CardContent className="pt-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium">Overall Integrity</span>
                                            <span className={`font-bold ${getScoreColor(result.integrityScore)}`}>
                                                {result.integrityScore}%
                                            </span>
                                        </div>
                                        <Progress value={result.integrityScore} className="h-2" />
                                    </CardContent>
                                </Card>

                                {/* Flags List */}
                                <div className="space-y-2">
                                    <h3 className="font-semibold">Proctoring Flags</h3>
                                    {proctoringReport?.flags && proctoringReport.flags.length > 0 ? (
                                        proctoringReport.flags.map((flag, idx) => {
                                            const FlagIcon = flagIcons[flag.type] || AlertTriangle;
                                            return (
                                                <Card key={idx} className={`${severityColors[flag.severity]} border`}>
                                                    <CardContent className="p-3 flex items-center gap-3">
                                                        <FlagIcon className="h-5 w-5 shrink-0" />
                                                        <div className="flex-1">
                                                            <p className="font-medium">
                                                                {flagLabels[flag.type] || flag.type}
                                                            </p>
                                                            {flag.details && (
                                                                <p className="text-sm opacity-80">{flag.details}</p>
                                                            )}
                                                            <p className="text-xs opacity-60">
                                                                {new Date(flag.timestamp).toLocaleTimeString()}
                                                            </p>
                                                        </div>
                                                        <Badge variant="outline" className="capitalize">
                                                            {flag.severity}
                                                        </Badge>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })
                                    ) : (
                                        <Card className="bg-green-50 border-green-200">
                                            <CardContent className="p-4 flex items-center gap-3">
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                                <div>
                                                    <p className="font-medium text-green-800">No Flags Detected</p>
                                                    <p className="text-sm text-green-600">
                                                        The assessment was completed without any proctoring violations
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end border-t pt-4">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
