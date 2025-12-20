import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    ShieldCheck,
    ShieldAlert,
    ShieldX,
    AlertTriangle,
    Clock,
    Eye,
    Copy,
    MonitorOff,
    Users,
    Wifi,
    ChevronDown
} from "lucide-react";
import { useState } from "react";

interface ProctoringEvent {
    type: string;
    count: number;
    totalPenalty: number;
}

interface ProctoringReportProps {
    integrityScore: number;
    flagged: boolean;
    events: ProctoringEvent[];
    summary: string;
    recommendations: string[];
    timeline?: Array<{
        eventType: string;
        timestamp: string;
        severity: string;
        metadata?: Record<string, unknown>;
    }>;
}

const eventIcons: Record<string, React.ReactNode> = {
    tab_switch: <MonitorOff className="w-4 h-4" />,
    focus_loss: <Eye className="w-4 h-4" />,
    paste: <Copy className="w-4 h-4" />,
    copy: <Copy className="w-4 h-4" />,
    disconnect: <Wifi className="w-4 h-4" />,
    face_missing: <Users className="w-4 h-4" />,
    multiple_faces: <Users className="w-4 h-4" />,
};

const severityColors: Record<string, string> = {
    low: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    medium: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    high: "bg-red-500/10 text-red-500 border-red-500/20",
    critical: "bg-red-600/10 text-red-600 border-red-600/20",
};

export default function ProctoringReport({
    integrityScore,
    flagged,
    events,
    summary,
    recommendations,
    timeline = [],
}: ProctoringReportProps) {
    const [showTimeline, setShowTimeline] = useState(false);

    // Determine integrity level
    const getIntegrityLevel = (score: number) => {
        if (score >= 90) return { label: "High", color: "text-green-500", icon: ShieldCheck, bg: "bg-green-500/10" };
        if (score >= 70) return { label: "Medium", color: "text-yellow-500", icon: ShieldAlert, bg: "bg-yellow-500/10" };
        if (score >= 60) return { label: "Low", color: "text-orange-500", icon: ShieldAlert, bg: "bg-orange-500/10" };
        return { label: "Flagged", color: "text-red-500", icon: ShieldX, bg: "bg-red-500/10" };
    };

    const integrity = getIntegrityLevel(integrityScore);
    const IntegrityIcon = integrity.icon;

    return (
        <Card className="w-full">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5" />
                        Proctoring Report
                    </span>
                    {flagged && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Flagged for Review
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Integrity Score Gauge */}
                <div className={`p-6 rounded-lg ${integrity.bg}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-full ${integrity.bg}`}>
                                <IntegrityIcon className={`w-8 h-8 ${integrity.color}`} />
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Integrity Score</div>
                                <div className={`text-3xl font-bold ${integrity.color}`}>
                                    {integrityScore}/100
                                </div>
                            </div>
                        </div>
                        <Badge variant="outline" className={integrity.color}>
                            {integrity.label} Integrity
                        </Badge>
                    </div>
                    <Progress
                        value={integrityScore}
                        className="h-3"
                    />
                </div>

                {/* Summary */}
                <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm">{summary}</p>
                </div>

                {/* Events Summary */}
                {events.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold mb-3">Detected Events</h4>
                        <div className="grid grid-cols-2 gap-3">
                            {events.map((event) => (
                                <div
                                    key={event.type}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                    <div className="flex items-center gap-2">
                                        {eventIcons[event.type] || <AlertTriangle className="w-4 h-4" />}
                                        <span className="text-sm capitalize">
                                            {event.type.replace(/_/g, " ")}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary">{event.count}x</Badge>
                                        <span className="text-xs text-red-500">-{event.totalPenalty}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recommendations */}
                {recommendations.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold mb-3">Recommendations</h4>
                        <ul className="space-y-2">
                            {recommendations.map((rec, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm">
                                    <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                    <span>{rec}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Timeline */}
                {timeline.length > 0 && (
                    <Collapsible open={showTimeline} onOpenChange={setShowTimeline}>
                        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                            <Clock className="w-4 h-4" />
                            View Event Timeline ({timeline.length} events)
                            <ChevronDown className={`w-4 h-4 transition-transform ${showTimeline ? "rotate-180" : ""}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3">
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                {timeline.map((event, index) => (
                                    <div
                                        key={index}
                                        className={`flex items-center justify-between p-2 border rounded ${severityColors[event.severity]}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {eventIcons[event.eventType] || <AlertTriangle className="w-4 h-4" />}
                                            <span className="text-sm capitalize">
                                                {event.eventType.replace(/_/g, " ")}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <Badge variant="outline" className={severityColors[event.severity]}>
                                                {event.severity}
                                            </Badge>
                                            <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                )}
            </CardContent>
        </Card>
    );
}
