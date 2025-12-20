import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    History,
    User,
    Calendar,
    Star,
    ThumbsUp,
    ThumbsDown,
    Minus,
    ChevronDown,
    ChevronRight,
    FileText,
    Download,
    Brain
} from "lucide-react";
import { useState } from "react";

interface Scores {
    technical?: number;
    communication?: number;
    cultureFit?: number;
    problemSolving?: number;
    leadership?: number;
}

interface EvaluationRecord {
    id: string;
    version: number;
    evaluatorName: string;
    scores: Scores;
    overallScore?: number;
    recommendation: "strong_hire" | "hire" | "maybe" | "no_hire" | "strong_no_hire";
    reasonCodes: string[];
    notes?: string;
    stage?: string;
    aiGenerated?: boolean;
    createdAt: string;
}

interface EvaluationHistoryProps {
    evaluations: EvaluationRecord[];
    onExport?: () => void;
}

const recommendationConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    strong_hire: { label: "Strong Hire", color: "bg-green-500/10 text-green-500", icon: <ThumbsUp className="w-4 h-4" /> },
    hire: { label: "Hire", color: "bg-emerald-500/10 text-emerald-500", icon: <ThumbsUp className="w-4 h-4" /> },
    maybe: { label: "Maybe", color: "bg-yellow-500/10 text-yellow-500", icon: <Minus className="w-4 h-4" /> },
    no_hire: { label: "No Hire", color: "bg-red-500/10 text-red-500", icon: <ThumbsDown className="w-4 h-4" /> },
    strong_no_hire: { label: "Strong No Hire", color: "bg-red-600/10 text-red-600", icon: <ThumbsDown className="w-4 h-4" /> },
};

const reasonCodeLabels: Record<string, string> = {
    SKILL_MATCH: "Skills Align",
    EXPERIENCE_FIT: "Experience Fit",
    CULTURE_FIT: "Cultural Alignment",
    STRONG_COMMUNICATION: "Strong Communication",
    LEADERSHIP_POTENTIAL: "Leadership Potential",
    PROBLEM_SOLVER: "Problem Solver",
    QUICK_LEARNER: "Quick Learner",
    SKILL_MISMATCH: "Skill Gap",
    EXPERIENCE_GAP: "Experience Gap",
    CULTURE_CONCERN: "Culture Concern",
    COMMUNICATION_ISSUE: "Communication Issue",
    SALARY_MISMATCH: "Salary Mismatch",
    INTEGRITY_FLAG: "Integrity Concern",
    AVAILABILITY_ISSUE: "Availability Issue",
    INCOMPLETE_ASSESSMENT: "Incomplete Assessment",
};

function ScoreBar({ label, score }: { label: string; score: number }) {
    const percentage = (score / 5) * 100;
    return (
        <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-28">{label}</span>
            <div className="flex-1 h-2 bg-muted rounded-full">
                <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className="text-sm font-medium w-10 text-right">{score.toFixed(1)}</span>
        </div>
    );
}

export default function EvaluationHistory({
    evaluations,
    onExport,
}: EvaluationHistoryProps) {
    const [expandedId, setExpandedId] = useState<string | null>(
        evaluations[0]?.id || null
    );

    const toggleExpanded = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    if (evaluations.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <History className="w-12 h-12 mb-4 opacity-50" />
                    <p>No evaluations yet</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Evaluation History
                    <Badge variant="secondary">{evaluations.length} versions</Badge>
                </CardTitle>
                {onExport && (
                    <Button variant="outline" size="sm" onClick={onExport}>
                        <Download className="w-4 h-4 mr-2" />
                        Export Decision Packet
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <ScrollArea className="max-h-[600px]">
                    <div className="space-y-4">
                        {evaluations.map((evaluation, index) => {
                            const rec = recommendationConfig[evaluation.recommendation];
                            const isExpanded = expandedId === evaluation.id;
                            const isLatest = index === 0;

                            return (
                                <div
                                    key={evaluation.id}
                                    className={`border rounded-lg transition-colors ${isLatest ? "border-primary/50" : "border-border"
                                        }`}
                                >
                                    {/* Header - Always Visible */}
                                    <div
                                        className="flex items-center justify-between p-4 cursor-pointer"
                                        onClick={() => toggleExpanded(evaluation.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            {isExpanded ? (
                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">v{evaluation.version}</span>
                                                    {isLatest && (
                                                        <Badge variant="outline" className="text-xs">Latest</Badge>
                                                    )}
                                                    {evaluation.aiGenerated && (
                                                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                                            <Brain className="w-3 h-3" /> AI
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                    <User className="w-3 h-3" />
                                                    {evaluation.evaluatorName}
                                                    <span>•</span>
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(evaluation.createdAt).toLocaleDateString()}
                                                    {evaluation.stage && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="capitalize">{evaluation.stage}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1">
                                                <Star className="w-4 h-4 text-yellow-500" />
                                                <span className="font-semibold">
                                                    {evaluation.overallScore?.toFixed(1) || "—"}
                                                </span>
                                            </div>
                                            <Badge className={`${rec.color} flex items-center gap-1`}>
                                                {rec.icon}
                                                {rec.label}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <>
                                            <Separator />
                                            <div className="p-4 space-y-4">
                                                {/* Scores */}
                                                <div>
                                                    <h4 className="text-sm font-medium mb-3">Scores</h4>
                                                    <div className="space-y-2">
                                                        {Object.entries(evaluation.scores).map(([key, value]) => (
                                                            value !== undefined && (
                                                                <ScoreBar
                                                                    key={key}
                                                                    label={key.replace(/([A-Z])/g, " $1").trim()}
                                                                    score={value}
                                                                />
                                                            )
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Reason Codes */}
                                                {evaluation.reasonCodes.length > 0 && (
                                                    <div>
                                                        <h4 className="text-sm font-medium mb-2">Reason Codes</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {evaluation.reasonCodes.map((code) => (
                                                                <Badge
                                                                    key={code}
                                                                    variant="outline"
                                                                    className={code.includes("MISMATCH") || code.includes("GAP") || code.includes("CONCERN") || code.includes("ISSUE") || code.includes("FLAG")
                                                                        ? "border-red-500/30 text-red-500"
                                                                        : "border-green-500/30 text-green-500"
                                                                    }
                                                                >
                                                                    {reasonCodeLabels[code] || code}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Notes */}
                                                {evaluation.notes && (
                                                    <div>
                                                        <h4 className="text-sm font-medium mb-2">Notes</h4>
                                                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                                                            {evaluation.notes}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
