import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import PreTestCheck from "@/components/pre-test-check";
import TestConsent from "@/components/test-consent";

type Step = "loading" | "system-check" | "consent" | "starting" | "error";

export default function AssessmentStart() {
    const [match, params] = useRoute("/assessment-start/:sessionToken");
    const [, setLocation] = useLocation();
    const sessionToken = params?.sessionToken;

    const [step, setStep] = useState<Step>("loading");
    const [testDetails, setTestDetails] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const token = localStorage.getItem("token");

    useEffect(() => {
        if (sessionToken) {
            fetchSessionDetails();
        }
    }, [sessionToken]);

    const fetchSessionDetails = async () => {
        try {
            const res = await fetch(`/api/assessments/sessions/${sessionToken}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Invalid or expired session");
                setStep("error");
                return;
            }

            const data = await res.json();
            setTestDetails({
                title: data.assessment?.title || "Assessment",
                description: data.assessment?.description,
                duration: data.assessment?.timeLimit || 60,
                questionCount: data.assessment?.questions?.length || 0,
                difficulty: data.assessment?.difficulty || "medium",
                type: data.assessment?.type || "mixed",
                proctoring: data.assessment?.proctoring || {
                    webcamRequired: true,
                    tabSwitchLimit: 3,
                    fullscreenRequired: true,
                },
            });
            setStep("system-check");
        } catch (err) {
            setError("Failed to load assessment details");
            setStep("error");
        }
    };

    const handleSystemCheckComplete = () => {
        setStep("consent");
    };

    const handleStartTest = async () => {
        setStep("starting");
        try {
            // API call to start the session
            const res = await fetch("/api/assessments/sessions/start", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ sessionToken }),
            });

            if (res.ok) {
                // Enter fullscreen
                try {
                    await document.documentElement.requestFullscreen();
                } catch (e) {
                    console.warn("Could not enter fullscreen:", e);
                }
                // Navigate to the actual assessment page
                setLocation(`/secure-assessment/${sessionToken}`);
            } else {
                const data = await res.json();
                setError(data.error || "Failed to start assessment");
                setStep("error");
            }
        } catch (err) {
            setError("Network error while starting test");
            setStep("error");
        }
    };

    if (step === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="p-8">
                    <CardContent className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Loading assessment...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (step === "error") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="p-8 max-w-md">
                    <CardContent className="flex flex-col items-center gap-4 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                        </div>
                        <h2 className="text-xl font-semibold">Unable to Load Assessment</h2>
                        <p className="text-muted-foreground">{error}</p>
                        <Button variant="outline" onClick={() => setLocation("/candidate")}>
                            Return to Portal
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (step === "system-check" && testDetails) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <PreTestCheck
                    onComplete={handleSystemCheckComplete}
                    testTitle={testDetails.title}
                    requirements={{
                        webcam: testDetails.proctoring?.webcamRequired ?? true,
                        microphone: true,
                        fullscreen: testDetails.proctoring?.fullscreenRequired ?? true,
                    }}
                />
            </div>
        );
    }

    if (step === "consent" && testDetails) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <TestConsent
                    onStart={handleStartTest}
                    testDetails={testDetails}
                />
            </div>
        );
    }

    if (step === "starting") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="p-8">
                    <CardContent className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Preparing your assessment...</p>
                        <p className="text-sm text-muted-foreground">Entering fullscreen mode...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null;
}
