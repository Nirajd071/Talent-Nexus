import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Camera,
    Clock,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Play,
    Loader2,
    Monitor,
    Eye,
    Shield,
    ArrowRight,
    ArrowLeft,
    Send,
    Maximize,
    AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Question {
    id: string;
    type: "mcq" | "coding" | "open_ended";
    question: string;
    options?: string[];
    points: number;
}

interface Assessment {
    _id: string;
    title: string;
    description?: string;
    timeLimit: number;
    questions: Question[];
    proctoring: {
        enabled: boolean;
        webcamRequired: boolean;
    };
}

interface ProctoringEvent {
    type: string;
    timestamp: Date;
    severity: "low" | "medium" | "high";
    description: string;
}

export default function SecureAssessment() {
    const [, params] = useRoute("/assessment/:token");
    const { toast } = useToast();

    // State
    const [stage, setStage] = useState<"loading" | "consent" | "system_check" | "exam" | "submitted">("loading");
    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [proctoringEvents, setProctoringEvents] = useState<ProctoringEvent[]>([]);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [violationReason, setViolationReason] = useState<string | null>(null);
    const [showViolationDialog, setShowViolationDialog] = useState(false);

    // Code evaluation state
    const [testResults, setTestResults] = useState<Record<string, any>>({});
    const [isRunningTests, setIsRunningTests] = useState(false);
    const [allTestsPassed, setAllTestsPassed] = useState(false);

    // System check state
    const [cameraPermission, setCameraPermission] = useState<"pending" | "granted" | "denied">("pending");
    const [browserCompatible, setBrowserCompatible] = useState(true);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Load assessment data
    useEffect(() => {
        if (params?.token) {
            loadAssessment();
        }
    }, [params?.token]);

    // Timer effect
    useEffect(() => {
        if (stage === "exam" && timeRemaining > 0) {
            timerRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        handleSubmit(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [stage]);

    // Tab switch detection - AUTO SUBMIT on violation
    useEffect(() => {
        if (stage !== "exam") return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                setTabSwitchCount(prev => prev + 1);
                addProctoringEvent("tab_switch", "high", "VIOLATION: Candidate switched away from exam tab");
                // AUTO SUBMIT - strict enforcement
                setViolationReason("Tab switching is not allowed during the exam. Your exam has been terminated.");
                setShowViolationDialog(true);
            }
        };

        // Detect window blur (clicking outside browser window)
        const handleWindowBlur = () => {
            setTabSwitchCount(prev => prev + 1);
            addProctoringEvent("window_blur", "high", "VIOLATION: Candidate clicked outside browser window");
            setViolationReason("Leaving the exam window is not allowed. Your exam has been terminated.");
            setShowViolationDialog(true);
        };

        // Block navigation/close attempts
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "You cannot leave during the exam. Your progress will be lost.";
            return e.returnValue;
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleWindowBlur);
        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleWindowBlur);
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [stage]);

    // Fullscreen change detection - AUTO SUBMIT on exit
    useEffect(() => {
        const handleFullscreenChange = () => {
            const inFullscreen = !!document.fullscreenElement;
            setIsFullscreen(inFullscreen);
            if (!inFullscreen && stage === "exam") {
                addProctoringEvent("fullscreen_exit", "high", "VIOLATION: Candidate exited fullscreen mode");
                // AUTO SUBMIT - strict enforcement
                setViolationReason("Exiting fullscreen is not allowed during the exam. Your exam has been terminated.");
                setShowViolationDialog(true);
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, [stage]);

    // Screenshot detection (PrintScreen key) - AUTO SUBMIT
    useEffect(() => {
        if (stage !== "exam") return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // PrintScreen key
            if (e.key === "PrintScreen" || e.keyCode === 44) {
                e.preventDefault();
                addProctoringEvent("screenshot_attempt", "high", "VIOLATION: Screenshot attempt detected");
                setViolationReason("Screenshots are not allowed during the exam. Your exam has been terminated.");
                setShowViolationDialog(true);
            }
            // Block common shortcuts (Ctrl+C, Ctrl+V, Ctrl+P, Ctrl+S, F12)
            if (e.ctrlKey && (e.key === "c" || e.key === "v" || e.key === "p" || e.key === "s")) {
                e.preventDefault();
                toast({ title: "⚠️ Action Blocked", description: "Copy/Paste is disabled during the exam.", variant: "destructive" });
            }
            if (e.key === "F12") {
                e.preventDefault();
                toast({ title: "⚠️ Action Blocked", description: "Developer tools are disabled during the exam.", variant: "destructive" });
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [stage]);

    // Block right-click context menu
    useEffect(() => {
        if (stage !== "exam") return;

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            toast({ title: "⚠️ Action Blocked", description: "Right-click is disabled during the exam.", variant: "destructive" });
        };

        document.addEventListener("contextmenu", handleContextMenu);
        return () => document.removeEventListener("contextmenu", handleContextMenu);
    }, [stage]);

    // Block copy/paste via clipboard events
    useEffect(() => {
        if (stage !== "exam") return;

        const handleCopy = (e: ClipboardEvent) => {
            e.preventDefault();
            toast({ title: "⚠️ Copy Blocked", description: "Copying content is not allowed.", variant: "destructive" });
        };
        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault();
            toast({ title: "⚠️ Paste Blocked", description: "Pasting content is not allowed.", variant: "destructive" });
        };

        document.addEventListener("copy", handleCopy);
        document.addEventListener("paste", handlePaste);
        return () => {
            document.removeEventListener("copy", handleCopy);
            document.removeEventListener("paste", handlePaste);
        };
    }, [stage]);

    const loadAssessment = async () => {
        try {
            const token = localStorage.getItem("token");
            const sessionToken = params?.token;

            console.log("Loading assessment with sessionToken:", sessionToken);

            // Try to fetch from API first - session token from URL is enough
            if (sessionToken) {
                const res = await fetch(`/api/assessments/sessions/${sessionToken}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });

                console.log("API response status:", res.status);

                if (res.ok) {
                    const data = await res.json();
                    console.log("Assessment data received:", data);
                    const assessmentData = data.assessment;

                    if (!assessmentData) {
                        console.error("No assessment data in response");
                        setStage("consent"); // Show consent with demo questions
                        return;
                    }

                    // Map questions from Question Bank format to assessment format
                    const mappedQuestions = (assessmentData.questions || []).map((q: any, idx: number) => ({
                        id: q._id || q.id || `q${idx}`,
                        type: q.type === "mcq" || q.type === "multiple_choice" ? "mcq" :
                            q.type === "coding" ? "coding" : "open_ended",
                        question: q.question || q.title || q.text,
                        options: q.options?.map((o: any) => o.text || o) || q.choices,
                        points: q.points || 10,
                        correctAnswer: q.options?.find((o: any) => o.isCorrect)?.text || q.correctAnswer
                    }));

                    const loadedAssessment: Assessment = {
                        _id: assessmentData._id,
                        title: assessmentData.title,
                        description: assessmentData.description,
                        timeLimit: assessmentData.timeLimit || 60,
                        proctoring: assessmentData.proctoring || { enabled: true, webcamRequired: true },
                        questions: mappedQuestions.length > 0 ? mappedQuestions : getDemoQuestions()
                    };

                    setAssessment(loadedAssessment);
                    setTimeRemaining(loadedAssessment.timeLimit * 60);
                    setStage("consent");
                    return;
                } else {
                    console.error("API error:", res.status, await res.text());
                }
            }

            // Fallback to demo mode
            console.log("Using demo assessment");
            const demoAssessment: Assessment = {
                _id: "demo-1",
                title: "Frontend Developer Assessment (Demo)",
                description: "Test your React and TypeScript skills",
                timeLimit: 30,
                proctoring: { enabled: true, webcamRequired: true },
                questions: getDemoQuestions()
            };

            setAssessment(demoAssessment);
            setTimeRemaining(demoAssessment.timeLimit * 60);
            setStage("consent");
        } catch (error) {
            console.error("Load assessment error:", error);
            toast({ title: "Error", description: "Failed to load assessment", variant: "destructive" });
            // Still move to consent stage with demo questions to avoid stuck loading
            setStage("consent");
        }
    };

    // Demo questions fallback
    const getDemoQuestions = (): Question[] => [
        {
            id: "q1",
            type: "mcq",
            question: "What is the correct way to create a React functional component?",
            options: [
                "function MyComponent() { return <div>Hello</div>; }",
                "class MyComponent { render() { return <div>Hello</div>; } }",
                "const MyComponent = () => { console.log('Hello'); }",
                "React.createComponent('MyComponent')"
            ],
            points: 10
        },
        {
            id: "q2",
            type: "mcq",
            question: "Which hook is used for side effects in React?",
            options: ["useState", "useEffect", "useContext", "useReducer"],
            points: 10
        },
        {
            id: "q3",
            type: "open_ended",
            question: "Explain the difference between props and state in React.",
            points: 20
        }
    ];

    const requestCameraPermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: 320, height: 240 }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setCameraPermission("granted");
            return true;
        } catch (error) {
            setCameraPermission("denied");
            toast({
                title: "Camera Access Required",
                description: "Please allow camera access to proceed with the assessment.",
                variant: "destructive"
            });
            return false;
        }
    };

    const enterFullscreen = async () => {
        try {
            await document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } catch (error) {
            console.error("Fullscreen error:", error);
        }
    };

    const addProctoringEvent = (type: string, severity: "low" | "medium" | "high", description: string) => {
        setProctoringEvents(prev => [...prev, {
            type,
            timestamp: new Date(),
            severity,
            description
        }]);
    };

    const handleStartExam = async () => {
        if (assessment?.proctoring.webcamRequired) {
            const cameraOk = await requestCameraPermission();
            if (!cameraOk) return;
        }

        await enterFullscreen();
        addProctoringEvent("exam_started", "low", "Candidate started the assessment");
        setStage("exam");
    };

    const handleAnswer = (questionId: string, answer: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
        // Reset test results when code changes
        if (testResults[questionId]) {
            setTestResults(prev => {
                const updated = { ...prev };
                delete updated[questionId];
                return updated;
            });
            setAllTestsPassed(false);
        }
    };

    // Run tests for coding questions
    const runTests = async (questionId: string, code: string, question: Question) => {
        setIsRunningTests(true);
        try {
            const response = await fetch("/api/assessments/evaluate-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    questionId,
                    code,
                    language: (question as any).codeLanguage || "javascript",
                    testCases: (question as any).testCases || [],
                    questionText: question.question
                })
            });

            if (response.ok) {
                const result = await response.json();
                setTestResults(prev => ({ ...prev, [questionId]: result }));

                // Check if all coding questions have passed tests
                const codingQuestions = assessment?.questions.filter(q => q.type === "coding") || [];
                const updatedResults = { ...testResults, [questionId]: result };
                const allPassed = codingQuestions.length === 0 ||
                    codingQuestions.every(q => updatedResults[q.id]?.allTestsPassed);
                setAllTestsPassed(allPassed);

                toast({
                    title: result.allTestsPassed ? "✓ All Tests Passed!" : `${result.passedCount}/${result.totalTests} Tests Passed`,
                    description: result.summary,
                    variant: result.allTestsPassed ? "default" : "destructive"
                });
            } else {
                toast({ title: "Error", description: "Failed to evaluate code", variant: "destructive" });
            }
        } catch (error) {
            console.error("Test run error:", error);
            toast({ title: "Error", description: "Failed to run tests", variant: "destructive" });
        } finally {
            setIsRunningTests(false);
        }
    };

    // Check if submission should be allowed
    const canSubmitManually = () => {
        const codingQuestions = assessment?.questions.filter(q => q.type === "coding") || [];
        if (codingQuestions.length === 0) return true; // No coding questions, can submit
        return allTestsPassed; // Must pass all tests to submit manually
    };

    const handleSubmit = async (autoSubmit: boolean = false) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            addProctoringEvent(
                autoSubmit ? "auto_submit" : "manual_submit",
                "low",
                autoSubmit ? "Time expired - auto submitted" : "Candidate submitted exam"
            );

            // Stop camera
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            // Exit fullscreen
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            }

            // Calculate score
            let score = 0;
            let totalPoints = 0;
            const answerDetails: any[] = [];

            assessment?.questions.forEach(q => {
                totalPoints += q.points;
                const answer = answers[q.id];
                let isCorrect = false;
                let earnedPoints = 0;

                if (q.type === "mcq" && q.options) {
                    // Check if first option is correct (demo) or match correctAnswer
                    const correctOption = (q as any).correctAnswer || q.options[0];
                    isCorrect = answer === correctOption;
                    earnedPoints = isCorrect ? q.points : 0;
                }

                score += earnedPoints;
                answerDetails.push({
                    questionId: q.id,
                    questionTitle: q.question?.substring(0, 50),
                    questionType: q.type,
                    answer: answer || "",
                    score: earnedPoints,
                    maxScore: q.points,
                    isCorrect: q.type === "mcq" ? isCorrect : undefined
                });
            });

            const integrityScore = Math.max(0, 100 - (tabSwitchCount * 15));
            const scorePercentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

            // Submit to API
            const token = localStorage.getItem("token");
            const sessionToken = params?.token;

            if (sessionToken && token) {
                try {
                    await fetch(`/api/assessments/sessions/${sessionToken}/submit`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            answers: answerDetails,
                            score: scorePercentage,
                            integrityScore,
                            timeTaken: assessment ? (assessment.timeLimit * 60 - timeRemaining) / 60 : 0,
                            proctoringReport: {
                                flags: proctoringEvents.filter(e => e.severity !== "low"),
                                overallIntegrity: integrityScore,
                                tabSwitchCount,
                                timeInFullscreen: 100, // Simplified
                            }
                        }),
                    });
                } catch (apiError) {
                    console.error("Failed to save to API:", apiError);
                }
            }

            setStage("submitted");
            toast({ title: "✅ Assessment Submitted", description: "Your responses have been recorded." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to submit. Please try again.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const currentQ = assessment?.questions[currentQuestion];
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = assessment?.questions.length || 0;
    const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

    // Loading state
    if (stage === "loading" || !assessment) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-white">Loading assessment...</p>
                </div>
            </div>
        );
    }

    // Consent stage
    if (stage === "consent") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
                <Card className="max-w-2xl w-full">
                    <CardHeader className="text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Shield className="w-8 h-8 text-blue-600" />
                        </div>
                        <CardTitle className="text-2xl">{assessment.title}</CardTitle>
                        <CardDescription>{assessment.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Assessment Info */}
                        <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                            <div className="text-center">
                                <Clock className="w-5 h-5 mx-auto text-slate-500 mb-1" />
                                <p className="text-sm font-medium">{assessment.timeLimit} min</p>
                                <p className="text-xs text-slate-500">Duration</p>
                            </div>
                            <div className="text-center">
                                <FileText className="w-5 h-5 mx-auto text-slate-500 mb-1" />
                                <p className="text-sm font-medium">{assessment.questions.length}</p>
                                <p className="text-xs text-slate-500">Questions</p>
                            </div>
                            <div className="text-center">
                                <Camera className="w-5 h-5 mx-auto text-slate-500 mb-1" />
                                <p className="text-sm font-medium">Required</p>
                                <p className="text-xs text-slate-500">Webcam</p>
                            </div>
                        </div>

                        {/* Proctoring Notice */}
                        <Alert className="border-amber-200 bg-amber-50">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-800">
                                <strong>This is a proctored assessment.</strong> Your webcam will record you during the exam.
                                Tab switching and other suspicious activities will be flagged.
                            </AlertDescription>
                        </Alert>

                        {/* Consent Checklist */}
                        <div className="space-y-3">
                            <p className="font-medium">Before starting, please confirm:</p>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span>I am in a quiet, private environment</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span>I understand my webcam will be active</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span>I will not use external help or resources</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span>I will stay on this tab throughout the exam</span>
                                </div>
                            </div>
                        </div>

                        <Button onClick={handleStartExam} className="w-full" size="lg">
                            <Play className="w-4 h-4 mr-2" />
                            I Agree - Start Assessment
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Submitted stage
    if (stage === "submitted") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center">
                    <CardContent className="pt-8 pb-6">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-green-800 mb-2">Assessment Submitted!</h2>
                        <p className="text-slate-600 mb-6">
                            Your responses have been recorded successfully.
                            You will receive your results via email within 2-3 business days.
                        </p>

                        <div className="p-4 bg-slate-50 rounded-lg mb-6">
                            <p className="text-sm text-slate-500">Questions Answered</p>
                            <p className="text-2xl font-bold">{answeredCount} / {totalQuestions}</p>
                        </div>

                        <Button onClick={() => window.location.href = "/candidate"}>
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Exam stage
    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Top Bar */}
            <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Badge variant="outline" className="border-blue-500 text-blue-400">
                        Question {currentQuestion + 1} / {totalQuestions}
                    </Badge>
                    <Progress value={progress} className="w-32 h-2" />
                </div>

                <h1 className="font-semibold text-lg hidden md:block">{assessment.title}</h1>

                <div className="flex items-center gap-4">
                    {/* Timer */}
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${timeRemaining < 300 ? "bg-red-500/20 text-red-400" : "bg-slate-700 text-white"
                        }`}>
                        <Clock className="w-4 h-4" />
                        <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
                    </div>

                    {/* Tab switch warning */}
                    {tabSwitchCount > 0 && (
                        <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {tabSwitchCount} tab switch{tabSwitchCount > 1 ? "es" : ""}
                        </Badge>
                    )}
                </div>
            </header>

            <div className="flex">
                {/* Main Content */}
                <main className="flex-1 p-6">
                    <Card className="bg-slate-800 border-slate-700 max-w-4xl mx-auto">
                        <CardHeader>
                            <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                                <Badge variant={currentQ?.type === "mcq" ? "default" : "secondary"}>
                                    {currentQ?.type === "mcq" ? "Multiple Choice" : "Written Response"}
                                </Badge>
                                <span>{currentQ?.points} points</span>
                            </div>
                            <CardTitle className="text-xl text-white">{currentQ?.question}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {currentQ?.type === "mcq" && currentQ.options && (
                                <RadioGroup
                                    value={answers[currentQ.id] || ""}
                                    onValueChange={(value) => handleAnswer(currentQ.id, value)}
                                    className="space-y-3"
                                >
                                    {currentQ.options.map((option, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${answers[currentQ.id] === option
                                                ? "border-blue-500 bg-blue-500/10"
                                                : "border-slate-600 hover:border-slate-500 bg-slate-700/50"
                                                }`}
                                            onClick={() => handleAnswer(currentQ.id, option)}
                                        >
                                            <RadioGroupItem value={option} id={`option-${idx}`} />
                                            <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer text-white">
                                                {option}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            )}

                            {currentQ?.type === "open_ended" && (
                                <Textarea
                                    placeholder="Type your answer here..."
                                    value={answers[currentQ.id] || ""}
                                    onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
                                    className="min-h-[200px] bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                />
                            )}

                            {currentQ?.type === "coding" && (
                                <div className="space-y-4">
                                    <Textarea
                                        placeholder="// Write your code here..."
                                        value={answers[currentQ.id] || ""}
                                        onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
                                        className="min-h-[250px] font-mono bg-slate-900 border-slate-600 text-green-400 placeholder:text-slate-400 text-sm"
                                    />

                                    {/* Run Tests Button */}
                                    <div className="flex items-center gap-4">
                                        <Button
                                            onClick={() => runTests(currentQ.id, answers[currentQ.id] || "", currentQ)}
                                            disabled={!answers[currentQ.id] || isRunningTests}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            {isRunningTests ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running Tests...</>
                                            ) : (
                                                <><Play className="w-4 h-4 mr-2" /> Run Tests</>
                                            )}
                                        </Button>

                                        {testResults[currentQ.id] && (
                                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${testResults[currentQ.id].allTestsPassed
                                                ? "bg-green-500/20 text-green-400"
                                                : "bg-red-500/20 text-red-400"
                                                }`}>
                                                {testResults[currentQ.id].allTestsPassed ? (
                                                    <CheckCircle className="w-4 h-4" />
                                                ) : (
                                                    <XCircle className="w-4 h-4" />
                                                )}
                                                {testResults[currentQ.id].passedCount}/{testResults[currentQ.id].totalTests} Tests Passed
                                            </div>
                                        )}
                                    </div>

                                    {/* Test Results Display */}
                                    {testResults[currentQ.id] && (
                                        <div className="bg-slate-800 rounded-lg p-4 space-y-3">
                                            <div className="text-sm font-medium text-slate-300">Test Results</div>

                                            {/* Scoring Breakdown */}
                                            <div className="grid grid-cols-4 gap-2 text-xs">
                                                {Object.entries(testResults[currentQ.id].scoring || {}).map(([key, val]: [string, any]) => (
                                                    <div key={key} className="bg-slate-700/50 rounded p-2">
                                                        <div className="text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                                                        <div className={`font-bold ${val.score >= 70 ? "text-green-400" : val.score >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                                                            {val.score}%
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Overall Score */}
                                            <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                                                <span className="text-slate-400">Overall Score</span>
                                                <span className={`text-xl font-bold ${testResults[currentQ.id].overallScore >= 70 ? "text-green-400" :
                                                    testResults[currentQ.id].overallScore >= 50 ? "text-yellow-400" : "text-red-400"
                                                    }`}>
                                                    {testResults[currentQ.id].overallScore}%
                                                </span>
                                            </div>

                                            {/* Summary */}
                                            <div className="text-sm text-slate-400 italic">
                                                {testResults[currentQ.id].summary}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Navigation */}
                    <div className="max-w-4xl mx-auto mt-6 flex items-center justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                            disabled={currentQuestion === 0}
                            className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Previous
                        </Button>

                        <div className="flex items-center gap-2">
                            {assessment.questions.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentQuestion(idx)}
                                    className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${idx === currentQuestion
                                        ? "bg-blue-600 text-white"
                                        : answers[assessment.questions[idx].id]
                                            ? "bg-green-600 text-white"
                                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                        }`}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                        </div>

                        {currentQuestion === totalQuestions - 1 ? (
                            <div className="flex items-center gap-3">
                                {!canSubmitManually() && (
                                    <span className="text-sm text-yellow-400 flex items-center gap-1">
                                        <AlertTriangle className="w-4 h-4" />
                                        Pass all tests to submit
                                    </span>
                                )}
                                <Button
                                    onClick={() => handleSubmit(false)}
                                    disabled={isSubmitting || !canSubmitManually()}
                                    className={canSubmitManually() ? "bg-green-600 hover:bg-green-700" : "bg-slate-600 cursor-not-allowed"}
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                                    ) : (
                                        <><Send className="w-4 h-4 mr-2" /> Submit Exam</>
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <Button
                                onClick={() => setCurrentQuestion(prev => Math.min(totalQuestions - 1, prev + 1))}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                Next
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        )}
                    </div>
                </main>

                {/* Webcam Sidebar */}
                <aside className="w-80 bg-slate-800 border-l border-slate-700 p-4 hidden lg:block">
                    <div className="sticky top-20">
                        {/* Webcam Feed */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2 text-sm text-slate-400">
                                <Camera className="w-4 h-4" />
                                <span>Webcam Monitor</span>
                                <span className="ml-auto flex items-center gap-1 text-green-400">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    Recording
                                </span>
                            </div>
                            <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden relative">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                                {cameraPermission !== "granted" && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                                        <XCircle className="w-8 h-8 text-red-500" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Proctoring Status */}
                        <Card className="bg-slate-700/50 border-slate-600">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-white flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    Proctoring Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Camera</span>
                                    <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Tab Focus</span>
                                    <Badge className={tabSwitchCount > 0 ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}>
                                        {tabSwitchCount > 0 ? `${tabSwitchCount} violations` : "Good"}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Fullscreen</span>
                                    <Badge className={isFullscreen ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                                        {isFullscreen ? "Active" : "Exited"}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Integrity Score */}
                        <Card className="bg-slate-700/50 border-slate-600 mt-4">
                            <CardContent className="pt-4">
                                <div className="text-center">
                                    <p className="text-sm text-slate-400 mb-1">Integrity Score</p>
                                    <p className={`text-3xl font-bold ${100 - (tabSwitchCount * 10) >= 80 ? "text-green-400" :
                                        100 - (tabSwitchCount * 10) >= 60 ? "text-yellow-400" : "text-red-400"
                                        }`}>
                                        {Math.max(0, 100 - (tabSwitchCount * 10))}%
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </aside>
            </div>

            {/* Violation Dialog - Auto Submit */}
            <Dialog open={showViolationDialog} onOpenChange={() => { }}>
                <DialogContent className="bg-red-50 border-red-200">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-700">
                            <AlertCircle className="w-6 h-6" />
                            Exam Terminated - Integrity Violation
                        </DialogTitle>
                        <DialogDescription className="text-red-600">
                            {violationReason}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-white rounded-lg p-4 border border-red-200">
                        <p className="text-sm text-slate-700 mb-2">
                            <strong>What happens now:</strong>
                        </p>
                        <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                            <li>Your responses up to this point have been saved</li>
                            <li>This violation has been logged and will be reported</li>
                            <li>The recruiter will be notified of this incident</li>
                        </ul>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={() => {
                                setShowViolationDialog(false);
                                handleSubmit(true);
                            }}
                            variant="destructive"
                            className="w-full"
                        >
                            I Understand - Submit Exam
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Missing import fix
const FileText = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10,9 9,9 8,9" />
    </svg>
);
