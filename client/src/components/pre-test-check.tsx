import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Camera, Mic, Monitor, CheckCircle, XCircle, Loader2,
    AlertTriangle, RefreshCw, ArrowRight, Shield, Wifi
} from "lucide-react";

interface PreTestCheckProps {
    onComplete: () => void;
    testTitle: string;
    requirements?: {
        webcam: boolean;
        microphone: boolean;
        fullscreen: boolean;
    };
}

interface CheckResult {
    status: "pending" | "checking" | "passed" | "failed";
    message?: string;
}

export default function PreTestCheck({
    onComplete,
    testTitle,
    requirements = { webcam: true, microphone: true, fullscreen: true }
}: PreTestCheckProps) {
    const [checks, setChecks] = useState<{
        webcam: CheckResult;
        microphone: CheckResult;
        fullscreen: CheckResult;
        internet: CheckResult;
    }>({
        webcam: { status: "pending" },
        microphone: { status: "pending" },
        fullscreen: { status: "pending" },
        internet: { status: "pending" },
    });

    const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [allPassed, setAllPassed] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const updateCheck = (key: keyof typeof checks, result: CheckResult) => {
        setChecks(prev => ({ ...prev, [key]: result }));
    };

    const checkInternet = async () => {
        updateCheck("internet", { status: "checking" });
        try {
            const start = Date.now();
            await fetch("/api/health", { cache: "no-cache" });
            const latency = Date.now() - start;

            if (latency < 500) {
                updateCheck("internet", { status: "passed", message: `${latency}ms latency - Excellent` });
            } else if (latency < 1000) {
                updateCheck("internet", { status: "passed", message: `${latency}ms latency - Good` });
            } else {
                updateCheck("internet", { status: "passed", message: `${latency}ms latency - Acceptable` });
            }
        } catch {
            updateCheck("internet", { status: "failed", message: "No internet connection" });
        }
    };

    const checkWebcam = async () => {
        if (!requirements.webcam) {
            updateCheck("webcam", { status: "passed", message: "Not required" });
            return;
        }

        updateCheck("webcam", { status: "checking" });
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setWebcamStream(stream);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            updateCheck("webcam", { status: "passed", message: "Camera access granted" });
        } catch (err: any) {
            if (err.name === "NotAllowedError") {
                updateCheck("webcam", { status: "failed", message: "Permission denied - Please allow camera access" });
            } else if (err.name === "NotFoundError") {
                updateCheck("webcam", { status: "failed", message: "No camera found" });
            } else {
                updateCheck("webcam", { status: "failed", message: "Camera access failed" });
            }
        }
    };

    const checkMicrophone = async () => {
        if (!requirements.microphone) {
            updateCheck("microphone", { status: "passed", message: "Not required" });
            return;
        }

        updateCheck("microphone", { status: "checking" });
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Stop immediately
            updateCheck("microphone", { status: "passed", message: "Microphone access granted" });
        } catch (err: any) {
            if (err.name === "NotAllowedError") {
                updateCheck("microphone", { status: "failed", message: "Permission denied" });
            } else if (err.name === "NotFoundError") {
                updateCheck("microphone", { status: "failed", message: "No microphone found" });
            } else {
                updateCheck("microphone", { status: "failed", message: "Microphone access failed" });
            }
        }
    };

    const checkFullscreen = async () => {
        if (!requirements.fullscreen) {
            updateCheck("fullscreen", { status: "passed", message: "Not required" });
            return;
        }

        updateCheck("fullscreen", { status: "checking" });
        try {
            if (document.fullscreenEnabled) {
                updateCheck("fullscreen", { status: "passed", message: "Fullscreen supported" });
            } else {
                updateCheck("fullscreen", { status: "failed", message: "Fullscreen not supported" });
            }
        } catch {
            updateCheck("fullscreen", { status: "failed", message: "Fullscreen check failed" });
        }
    };

    const runAllChecks = async () => {
        setIsRunning(true);

        // Run checks sequentially
        await checkInternet();
        await new Promise(r => setTimeout(r, 300));

        await checkWebcam();
        await new Promise(r => setTimeout(r, 300));

        await checkMicrophone();
        await new Promise(r => setTimeout(r, 300));

        await checkFullscreen();

        setIsRunning(false);
    };

    // Check all passed
    useEffect(() => {
        const allChecksPassed = Object.values(checks).every(c => c.status === "passed");
        setAllPassed(allChecksPassed);
    }, [checks]);

    // Start checks on mount
    useEffect(() => {
        runAllChecks();

        return () => {
            // Cleanup webcam stream
            if (webcamStream) {
                webcamStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const completedCount = Object.values(checks).filter(c => c.status === "passed").length;
    const totalChecks = Object.keys(checks).length;
    const progress = (completedCount / totalChecks) * 100;

    const getStatusIcon = (status: CheckResult["status"]) => {
        switch (status) {
            case "checking": return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
            case "passed": return <CheckCircle className="h-5 w-5 text-green-500" />;
            case "failed": return <XCircle className="h-5 w-5 text-red-500" />;
            default: return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
        }
    };

    const CheckItem = ({
        icon: Icon,
        title,
        check
    }: {
        icon: React.ElementType;
        title: string;
        check: CheckResult;
    }) => (
        <div className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${check.status === "passed" ? "bg-green-50 border-green-200" :
                check.status === "failed" ? "bg-red-50 border-red-200" :
                    check.status === "checking" ? "bg-blue-50 border-blue-200" :
                        "bg-muted/50"
            }`}>
            <div className={`p-2 rounded-full ${check.status === "passed" ? "bg-green-100" :
                    check.status === "failed" ? "bg-red-100" :
                        check.status === "checking" ? "bg-blue-100" :
                            "bg-muted"
                }`}>
                <Icon className={`h-5 w-5 ${check.status === "passed" ? "text-green-600" :
                        check.status === "failed" ? "text-red-600" :
                            check.status === "checking" ? "text-blue-600" :
                                "text-muted-foreground"
                    }`} />
            </div>
            <div className="flex-1">
                <p className="font-medium">{title}</p>
                {check.message && (
                    <p className={`text-sm ${check.status === "passed" ? "text-green-600" :
                            check.status === "failed" ? "text-red-600" :
                                "text-muted-foreground"
                        }`}>
                        {check.message}
                    </p>
                )}
            </div>
            {getStatusIcon(check.status)}
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto py-8 space-y-6">
            <Card>
                <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle>Pre-Test System Check</CardTitle>
                    <CardDescription>
                        Verifying your system meets the requirements for: <strong>{testTitle}</strong>
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Progress */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Verification Progress</span>
                            <span>{completedCount}/{totalChecks} checks passed</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>

                    {/* Webcam Preview */}
                    {requirements.webcam && checks.webcam.status === "passed" && (
                        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            <Badge className="absolute bottom-2 left-2 bg-green-500">
                                <Camera className="h-3 w-3 mr-1" /> Camera Active
                            </Badge>
                        </div>
                    )}

                    {/* Check Items */}
                    <div className="space-y-3">
                        <CheckItem icon={Wifi} title="Internet Connection" check={checks.internet} />
                        <CheckItem icon={Camera} title="Webcam Access" check={checks.webcam} />
                        <CheckItem icon={Mic} title="Microphone Access" check={checks.microphone} />
                        <CheckItem icon={Monitor} title="Fullscreen Mode" check={checks.fullscreen} />
                    </div>

                    {/* Actions */}
                    {Object.values(checks).some(c => c.status === "failed") && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                Some checks failed. Please fix the issues and retry.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={runAllChecks}
                            disabled={isRunning}
                            className="flex-1"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? "animate-spin" : ""}`} />
                            Retry Checks
                        </Button>
                        <Button
                            onClick={onComplete}
                            disabled={!allPassed}
                            className="flex-1"
                        >
                            Continue to Instructions
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>

                    {/* Requirements Notice */}
                    <p className="text-xs text-center text-muted-foreground">
                        This assessment requires webcam and microphone access for proctoring.
                        Your session will be recorded for integrity verification.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
