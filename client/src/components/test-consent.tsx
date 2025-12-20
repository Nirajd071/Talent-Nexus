import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Clock, FileText, Camera, AlertTriangle, Shield, CheckCircle,
    Play, BookOpen, Eye, Smartphone, Monitor
} from "lucide-react";

interface TestConsentProps {
    onStart: () => void;
    testDetails: {
        title: string;
        description?: string;
        duration: number; // minutes
        questionCount: number;
        difficulty?: string;
        type?: string;
        proctoring?: {
            webcamRequired?: boolean;
            tabSwitchLimit?: number;
            fullscreenRequired?: boolean;
        };
    };
}

export default function TestConsent({ onStart, testDetails }: TestConsentProps) {
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [acceptedProctoring, setAcceptedProctoring] = useState(false);
    const [acceptedTiming, setAcceptedTiming] = useState(false);

    const canStart = acceptedTerms && acceptedProctoring && acceptedTiming;

    const rules = [
        { icon: Camera, text: "Your webcam will record throughout the assessment" },
        { icon: Monitor, text: "Fullscreen mode is required during the test" },
        { icon: Eye, text: "Tab switching will be monitored and limited" },
        { icon: Smartphone, text: "No external devices or notes allowed" },
        { icon: Clock, text: "Timer cannot be paused once started" },
    ];

    return (
        <div className="max-w-2xl mx-auto py-8 space-y-6">
            <Card>
                <CardHeader className="text-center border-b">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="h-8 w-8 text-blue-600" />
                    </div>
                    <CardTitle>{testDetails.title}</CardTitle>
                    <CardDescription>
                        Please read the instructions carefully before starting
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-6 space-y-6">
                    {/* Test Overview */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-2xl font-bold">{testDetails.duration}</p>
                            <p className="text-sm text-muted-foreground">Minutes</p>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <FileText className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-2xl font-bold">{testDetails.questionCount}</p>
                            <p className="text-sm text-muted-foreground">Questions</p>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <Shield className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                            <Badge variant={
                                testDetails.difficulty === "hard" ? "destructive" :
                                    testDetails.difficulty === "easy" ? "secondary" : "default"
                            }>
                                {testDetails.difficulty || "Medium"}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">Difficulty</p>
                        </div>
                    </div>

                    {/* Test Description */}
                    {testDetails.description && (
                        <div className="p-4 bg-muted/30 rounded-lg">
                            <h3 className="font-medium mb-2">About This Assessment</h3>
                            <p className="text-sm text-muted-foreground">{testDetails.description}</p>
                        </div>
                    )}

                    {/* Rules */}
                    <div className="space-y-3">
                        <h3 className="font-semibold flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            Important Rules
                        </h3>
                        <div className="space-y-2">
                            {rules.map((rule, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                                    <rule.icon className="h-4 w-4 text-amber-600 shrink-0" />
                                    <span className="text-sm">{rule.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Proctoring Alert */}
                    {testDetails.proctoring?.tabSwitchLimit && (
                        <Alert className="border-red-200 bg-red-50">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-700">
                                <strong>Warning:</strong> Switching tabs more than {testDetails.proctoring.tabSwitchLimit} times
                                will result in automatic submission of your test.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Consent Checkboxes */}
                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="font-semibold">Acknowledgement</h3>

                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="terms"
                                checked={acceptedTerms}
                                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                            />
                            <label htmlFor="terms" className="text-sm leading-tight cursor-pointer">
                                I have read and understood all the instructions above. I understand that any
                                violation of rules may result in disqualification.
                            </label>
                        </div>

                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="proctoring"
                                checked={acceptedProctoring}
                                onCheckedChange={(checked) => setAcceptedProctoring(checked === true)}
                            />
                            <label htmlFor="proctoring" className="text-sm leading-tight cursor-pointer">
                                I consent to webcam recording and screen monitoring during this assessment
                                for integrity verification purposes.
                            </label>
                        </div>

                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="timing"
                                checked={acceptedTiming}
                                onCheckedChange={(checked) => setAcceptedTiming(checked === true)}
                            />
                            <label htmlFor="timing" className="text-sm leading-tight cursor-pointer">
                                I understand the test timer starts immediately and cannot be paused. I am ready
                                to complete the test in one sitting.
                            </label>
                        </div>
                    </div>

                    {/* Start Button */}
                    <div className="pt-4">
                        <Button
                            onClick={onStart}
                            disabled={!canStart}
                            size="lg"
                            className="w-full h-14 text-lg"
                        >
                            <Play className="h-5 w-5 mr-2" />
                            Start Assessment
                        </Button>

                        {!canStart && (
                            <p className="text-center text-sm text-muted-foreground mt-3">
                                Please accept all acknowledgements to proceed
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
