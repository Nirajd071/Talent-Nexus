import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Camera,
  Mic,
  Monitor,
  Wifi,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Eye,
  Clock,
  Loader2,
  XCircle,
  Play,
  LogIn
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Step = "login" | "permissions" | "ready" | "test";

interface SessionData {
  id: string;
  candidateName: string;
  candidateEmail: string;
  status: string;
  timeLimit: number;
  permissions: {
    webcam: boolean;
    microphone: boolean;
    screen: boolean;
  };
}

interface ProblemData {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  constraints: string[];
  starterCode: { python: string; java: string; cpp: string };
  testCases: Array<{ input: string; expectedOutput: string }>;
}

export default function AssessmentSecure() {
  const [step, setStep] = useState<Step>("login");
  const [accessToken, setAccessToken] = useState("");
  const [session, setSession] = useState<SessionData | null>(null);
  const [problem, setProblem] = useState<ProblemData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Permissions state
  const [webcamGranted, setWebcamGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(false);

  // Media streams
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Test state
  const [timeLeft, setTimeLeft] = useState(3600);
  const [testStarted, setTestStarted] = useState(false);
  const [language, setLanguage] = useState<"python" | "java" | "cpp">("python");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Proctoring state
  const [integrityScore, setIntegrityScore] = useState(100);
  const [violations, setViolations] = useState({ tabSwitches: 0, pasteAttempts: 0, focusLosses: 0 });
  const [flagCount, setFlagCount] = useState(0);
  const [terminated, setTerminated] = useState(false);
  const [penaltyDeduction, setPenaltyDeduction] = useState(0);
  const PENALTY_PER_FLAG = 5; // -5% per flag
  const MAX_FLAGS = 3; // Auto-terminate at 3 flags

  const { toast } = useToast();

  // Get token from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setAccessToken(token);
    }
  }, []);

  // Verify token and login
  const handleLogin = async () => {
    if (!accessToken.trim()) {
      setLoginError("Please enter your access token");
      return;
    }

    setIsLoading(true);
    setLoginError("");

    try {
      const response = await fetch("/api/assessments/sessions/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Invalid token");
      }

      const data = await response.json();
      setSession(data.session);
      setProblem(data.problem);

      if (data.problem?.starterCode) {
        setCode(data.problem.starterCode.python || "");
      }

      setStep("permissions");
      toast({ title: "Logged in", description: `Welcome, ${data.session.candidateName}!` });
    } catch (error: any) {
      setLoginError(error.message || "Failed to verify token");
    } finally {
      setIsLoading(false);
    }
  };

  // Request webcam and microphone permissions
  const requestPermissions = async () => {
    setCheckingPermissions(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setWebcamGranted(true);
      setMicGranted(true);

      // Update server
      await fetch("/api/assessments/sessions/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          webcam: true,
          microphone: true
        })
      });

      toast({ title: "Permissions granted", description: "Camera and microphone active" });
      setStep("ready");
    } catch (error) {
      toast({
        title: "Permission denied",
        description: "Webcam and microphone are required for this assessment",
        variant: "destructive"
      });
    } finally {
      setCheckingPermissions(false);
    }
  };

  // Start the test
  const startTest = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/assessments/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken })
      });

      const data = await response.json();

      if (data.alreadyStarted) {
        setTimeLeft(data.remainingTime);
      } else {
        setTimeLeft(session?.timeLimit || 3600);
      }

      setTestStarted(true);
      setStep("test");

      // Enter fullscreen
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        console.log("Fullscreen not supported");
      }

      toast({ title: "Test Started", description: "Good luck! Your time starts now." });
    } catch {
      toast({ title: "Error", description: "Failed to start test", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Log proctoring event with 3-strike system
  const logViolation = useCallback(async (eventType: string, severity: string, details?: string) => {
    if (!accessToken || !testStarted || terminated) return;

    // Increment flag count
    const newFlagCount = flagCount + 1;
    setFlagCount(newFlagCount);

    // Apply penalty deduction (-5% per flag)
    const newPenalty = penaltyDeduction + PENALTY_PER_FLAG;
    setPenaltyDeduction(newPenalty);

    setViolations(prev => ({
      ...prev,
      [eventType === "tab_switch" ? "tabSwitches" :
        eventType === "paste" ? "pasteAttempts" : "focusLosses"]:
        prev[eventType === "tab_switch" ? "tabSwitches" :
          eventType === "paste" ? "pasteAttempts" : "focusLosses"] + 1
    }));

    // Log to server
    try {
      const response = await fetch("/api/assessments/sessions/proctoring-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, eventType, severity, details, flagCount: newFlagCount })
      });

      const data = await response.json();
      if (data.integrityScore !== undefined) {
        setIntegrityScore(data.integrityScore);
      }
    } catch {
      // Silent fail
    }

    // Show warning with strike count
    toast({
      title: `⚠️ Strike ${newFlagCount} of ${MAX_FLAGS}`,
      description: `${eventType.replace("_", " ")} detected. ${MAX_FLAGS - newFlagCount} strikes remaining before auto-termination. -${PENALTY_PER_FLAG}% penalty applied.`,
      variant: "destructive"
    });

    // Check for 3-strike termination
    if (newFlagCount >= MAX_FLAGS) {
      setTerminated(true);
      toast({
        title: "🚫 Assessment Terminated",
        description: "Too many violations detected. Your assessment has been auto-submitted.",
        variant: "destructive"
      });
      // Auto-submit with termination reason
      await submitCodeWithTermination("3_strikes", newFlagCount, newPenalty);
    }
  }, [accessToken, testStarted, toast, flagCount, penaltyDeduction, terminated]);

  // Browser lockdown - Tab switch detection
  useEffect(() => {
    if (!testStarted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation("tab_switch", "high", "Tab switched or window minimized");
      }
    };

    const handleBlur = () => {
      logViolation("focus_loss", "medium", "Window lost focus");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [testStarted, logViolation]);

  // Timer countdown
  useEffect(() => {
    if (!testStarted || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [testStarted, timeLeft]);

  // Auto-submit on timer expire
  const handleAutoSubmit = async () => {
    toast({ title: "Time's up!", description: "Your assessment has been auto-submitted.", variant: "destructive" });
    await submitCode(true);
  };

  // Submit code
  const submitCode = async (autoSubmit = false) => {
    if (!problem || !code.trim()) {
      if (!autoSubmit) {
        toast({ title: "Cannot submit", description: "Please write some code first.", variant: "destructive" });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/assessments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          problemId: problem.id,
          candidateName: session?.candidateName,
          candidateEmail: session?.candidateEmail
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        toast({
          title: autoSubmit ? "Auto-Submitted" : "Evaluation Complete!",
          description: `Score: ${data.scores.total}/100`
        });
      }
    } catch {
      if (!autoSubmit) {
        toast({ title: "Submission failed", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit code with termination data (for 3-strike auto-submit)
  const submitCodeWithTermination = async (reason: string, flags: number, penalty: number) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/assessments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          problemId: problem?.id,
          candidateName: session?.candidateName,
          candidateEmail: session?.candidateEmail,
          accessToken,
          terminated: true,
          terminatedReason: reason,
          cheatingFlags: flags,
          penaltyDeduction: penalty
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        // Exit fullscreen
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => { });
        }
      }
    } catch (error) {
      console.error("Termination submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle paste block
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    logViolation("paste", "high", "Paste attempt blocked");
  };

  // Handle right-click block
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    logViolation("right_click", "medium", "Right-click attempt blocked");
  };

  // Format time
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // ==========================================
  // LOGIN STEP
  // ==========================================
  if (step === "login") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur text-slate-50">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
            <CardTitle className="text-2xl">Secure Assessment</CardTitle>
            <CardDescription className="text-slate-400">
              Enter your access token to begin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token" className="text-slate-300">Access Token</Label>
              <Input
                id="token"
                type="text"
                placeholder="Enter your unique access token"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>

            {loginError && (
              <Alert variant="destructive" className="bg-red-900/50 border-red-800">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full bg-blue-600 hover:bg-blue-500"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
              ) : (
                <><LogIn className="w-4 h-4 mr-2" /> Access Assessment</>
              )}
            </Button>

            <p className="text-xs text-slate-500 text-center">
              Your token was sent to your email. Contact support if you haven't received it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==========================================
  // PERMISSIONS STEP
  // ==========================================
  if (step === "permissions") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-slate-700 bg-slate-800/50 backdrop-blur text-slate-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
              <Camera className="w-6 h-6 text-blue-400" />
            </div>
            <CardTitle>Grant Permissions</CardTitle>
            <CardDescription className="text-slate-400">
              This assessment requires webcam and microphone for proctoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-yellow-500/10 border-yellow-500/30 text-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertTitle>Proctoring Required</AlertTitle>
              <AlertDescription className="text-xs">
                You will be monitored throughout the assessment. Tab switches, copy/paste, and other suspicious activities will be logged.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <PermissionItem
                icon={Camera}
                label="Webcam Access"
                description="Face detection and monitoring"
                granted={webcamGranted}
              />
              <PermissionItem
                icon={Mic}
                label="Microphone Access"
                description="Audio monitoring"
                granted={micGranted}
              />
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-500"
              onClick={requestPermissions}
              disabled={checkingPermissions || webcamGranted}
            >
              {checkingPermissions ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Requesting...</>
              ) : webcamGranted ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Permissions Granted</>
              ) : (
                "Grant Permissions"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==========================================
  // READY STEP
  // ==========================================
  if (step === "ready") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-slate-700 bg-slate-800/50 backdrop-blur text-slate-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <CardTitle>Ready to Start</CardTitle>
            <CardDescription className="text-slate-400">
              All checks passed. Click Start when ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Live webcam preview */}
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 bg-green-500/80 px-2 py-1 rounded text-xs text-white flex items-center gap-1">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE
              </div>
            </div>

            <div className="bg-slate-900 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Problem:</span>
                <span className="font-medium">{problem?.title || "Two Sum"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Time Limit:</span>
                <span className="font-medium">{formatTime(session?.timeLimit || 3600)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Candidate:</span>
                <span className="font-medium">{session?.candidateName}</span>
              </div>
            </div>

            <Alert className="bg-red-500/10 border-red-500/30 text-red-200">
              <Lock className="h-4 w-4 text-red-400" />
              <AlertTitle className="text-sm">Browser Will Be Locked</AlertTitle>
              <AlertDescription className="text-xs">
                Once started: no tab switching, no copy/paste, no right-click. Violations reduce your integrity score.
              </AlertDescription>
            </Alert>

            <Button
              className="w-full bg-green-600 hover:bg-green-500 h-12 text-lg"
              onClick={startTest}
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Starting...</>
              ) : (
                <><Play className="w-5 h-5 mr-2" /> Start Assessment</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==========================================
  // TEST STEP (LOCKED BROWSER)
  // ==========================================
  return (
    <div
      className="h-screen flex flex-col bg-white overflow-hidden select-none"
      onContextMenu={handleContextMenu}
    >
      {/* Secure Header */}
      <header className="h-14 bg-slate-900 text-white flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-green-400" />
          <span className="font-mono text-sm tracking-wide">SECURE BROWSER</span>
          <Badge variant="outline" className="border-slate-600 text-slate-300">
            {problem?.title || "Assessment"}
          </Badge>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-slate-300">REC</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-mono">
            <Clock className="h-4 w-4" />
            <span className={timeLeft < 300 ? "text-red-400" : ""}>{formatTime(timeLeft)}</span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="h-8"
            onClick={() => submitCode(false)}
            disabled={isSubmitting}
          >
            {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : "Submit & End"}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Language Bar */}
          <div className="h-12 bg-slate-100 border-b flex items-center px-4 gap-4">
            <span className="text-sm text-slate-600">Language:</span>
            <select
              value={language}
              onChange={(e) => {
                const newLang = e.target.value as "python" | "java" | "cpp";
                setLanguage(newLang);
                if (problem?.starterCode) {
                  setCode(problem.starterCode[newLang] || "");
                }
              }}
              className="bg-white border rounded px-3 py-1.5 text-sm font-medium"
            >
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
            <Badge variant="secondary" className="ml-auto">
              {problem?.difficulty || "Medium"}
            </Badge>
          </div>

          {/* Split View */}
          <div className="flex-1 flex overflow-hidden">
            {/* Problem */}
            <div className="w-1/2 p-6 overflow-y-auto border-r bg-white">
              {problem ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold">{problem.title}</h2>
                  <p className="text-slate-700 whitespace-pre-wrap">{problem.description}</p>

                  {problem.examples?.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold">Examples:</h3>
                      {problem.examples.map((ex, i) => (
                        <div key={i} className="bg-slate-50 p-3 rounded-lg text-sm font-mono">
                          <div><span className="text-slate-500">Input:</span> {ex.input}</div>
                          <div><span className="text-slate-500">Output:</span> {ex.output}</div>
                          {ex.explanation && <div className="text-slate-600 mt-1">{ex.explanation}</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {problem.constraints?.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Constraints:</h3>
                      <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                        {problem.constraints.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              )}
            </div>

            {/* Editor */}
            <div className="w-1/2 flex flex-col bg-slate-900">
              <div className="p-2 bg-slate-800 text-xs text-slate-400 border-b border-slate-700">
                solution.{language === "python" ? "py" : language === "java" ? "java" : "cpp"}
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onPaste={handlePaste}
                className="flex-1 p-4 bg-slate-900 text-green-400 font-mono text-sm resize-none outline-none"
                placeholder="// Write your solution here..."
                spellCheck={false}
              />
            </div>
          </div>

          {/* Results Panel */}
          {result && (
            <div className="h-48 border-t bg-slate-50 p-4 overflow-y-auto">
              <div className="flex items-center gap-4 mb-3">
                <h3 className="font-semibold">Results</h3>
                <Badge variant={result.scores.total >= 70 ? "default" : "destructive"}>
                  Score: {result.scores.total}/100
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-white p-3 rounded border">
                  <div className="text-slate-500">Logic</div>
                  <div className="text-lg font-bold text-blue-600">{result.scores.logic}/50</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-slate-500">Semantics</div>
                  <div className="text-lg font-bold text-purple-600">{result.scores.semantics}/50</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-slate-500">Penalty</div>
                  <div className="text-lg font-bold text-red-600">{result.scores.penalty}</div>
                </div>
              </div>
              {result.feedback && (
                <div className="mt-3 p-3 bg-white rounded border text-sm">
                  <span className="font-medium">Feedback:</span> {result.feedback}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Proctor Sidebar */}
        <div className="w-72 bg-slate-100 border-l p-4 flex flex-col gap-4">
          {/* Webcam */}
          <div className="aspect-video bg-black rounded-lg relative overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2 bg-black/50 px-2 py-0.5 rounded text-[10px] text-white font-mono flex items-center gap-1">
              <Eye className="w-3 h-3 text-green-400" />
              Tracking
            </div>
          </div>

          {/* Integrity */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase text-slate-500">Integrity</h3>
            <div className="bg-white p-3 rounded-md border space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Tab Switches</span>
                <span className={violations.tabSwitches > 0 ? "text-red-500 font-medium" : ""}>
                  {violations.tabSwitches}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Paste Attempts</span>
                <span className={violations.pasteAttempts > 0 ? "text-red-500 font-medium" : ""}>
                  {violations.pasteAttempts}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Focus Lost</span>
                <span className={violations.focusLosses > 0 ? "text-orange-500 font-medium" : ""}>
                  {violations.focusLosses}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Score</span>
                <span className={integrityScore < 50 ? "text-red-600" : "text-green-600"}>
                  {integrityScore}%
                </span>
              </div>
              <Progress value={integrityScore} className="h-2" />
            </div>
          </div>

          <div className="mt-auto">
            <Alert className="bg-red-50 border-red-200">
              <Lock className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-xs text-red-800">Browser Locked</AlertTitle>
              <AlertDescription className="text-[10px] text-red-700">
                Violations are being monitored
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  );
}

function PermissionItem({ icon: Icon, label, description, granted }: any) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${granted ? "bg-green-500/20" : "bg-slate-700"}`}>
          <Icon className={`w-4 h-4 ${granted ? "text-green-400" : "text-slate-400"}`} />
        </div>
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-slate-400">{description}</div>
        </div>
      </div>
      {granted ? (
        <CheckCircle2 className="w-5 h-5 text-green-400" />
      ) : (
        <div className="w-5 h-5 border-2 border-slate-600 rounded-full" />
      )}
    </div>
  );
}
