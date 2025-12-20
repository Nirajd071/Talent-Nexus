import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Lock, KeyRound, CheckCircle, XCircle, Clock, Shield,
    AlertTriangle, ArrowRight, Mail, RefreshCw, Loader2
} from "lucide-react";

interface AccessCodeEntryProps {
    onVerified: (sessionToken: string, testDetails: any) => void;
    candidateEmail?: string;
}

export default function AccessCodeEntry({ onVerified, candidateEmail }: AccessCodeEntryProps) {
    const [codeGroups, setCodeGroups] = useState(["", "", "", ""]);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [testDetails, setTestDetails] = useState<any>(null);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const token = localStorage.getItem("token");

    const handleGroupChange = (index: number, value: string) => {
        // Only allow alphanumeric characters
        const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);

        const newGroups = [...codeGroups];
        newGroups[index] = cleaned;
        setCodeGroups(newGroups);
        setError(null);

        // Auto-focus next input when current is filled
        if (cleaned.length === 4 && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        // Handle backspace to go to previous input
        if (e.key === "Backspace" && codeGroups[index] === "" && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").toUpperCase().replace(/[^A-Z0-9-]/g, "");
        const parts = pasted.split("-");

        if (parts.length === 4) {
            setCodeGroups(parts.map(p => p.slice(0, 4)));
        } else {
            // Try to parse as continuous string
            const continuous = pasted.replace(/-/g, "");
            if (continuous.length >= 16) {
                setCodeGroups([
                    continuous.slice(0, 4),
                    continuous.slice(4, 8),
                    continuous.slice(8, 12),
                    continuous.slice(12, 16)
                ]);
            }
        }
    };

    const getFullCode = () => codeGroups.join("-");

    const isCodeComplete = () => codeGroups.every(g => g.length === 4);

    const handleVerify = async () => {
        if (!isCodeComplete()) {
            setError("Please enter the complete access code");
            return;
        }

        setIsVerifying(true);
        setError(null);

        try {
            const res = await fetch("/api/access-codes/verify", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    code: getFullCode(),
                    candidateEmail,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Verification failed");
                return;
            }

            setSuccess(true);
            setTestDetails(data.testDetails);

            // After short delay, call onVerified callback
            setTimeout(() => {
                onVerified(data.sessionToken, data.testDetails);
            }, 1500);
        } catch (err) {
            setError("Network error. Please try again.");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleRequestResend = async () => {
        // TODO: Implement resend request
        alert("Please contact your recruiter to resend the access code.");
    };

    if (success && testDetails) {
        return (
            <Card className="max-w-lg mx-auto border-green-200 bg-green-50">
                <CardContent className="pt-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-green-800 mb-2">Access Granted!</h3>
                    <p className="text-green-700 mb-4">Redirecting to your assessment...</p>
                    <div className="bg-white rounded-lg p-4 text-left">
                        <p className="font-medium">{testDetails.title}</p>
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {testDetails.durationMinutes} min
                            </span>
                            <span>{testDetails.totalQuestions} questions</span>
                        </div>
                    </div>
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mt-4 text-green-600" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <Card>
                <CardHeader className="text-center pb-2">
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <KeyRound className="h-7 w-7 text-primary" />
                    </div>
                    <CardTitle className="text-xl">Enter Access Code</CardTitle>
                    <CardDescription>
                        Enter the unique access code sent to your email to start your assessment
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Access Code Input */}
                    <div className="space-y-3">
                        <div className="flex justify-center gap-2" onPaste={handlePaste}>
                            {codeGroups.map((group, idx) => (
                                <div key={idx} className="flex items-center">
                                    <Input
                                        ref={(el) => { inputRefs.current[idx] = el; }}
                                        value={group}
                                        onChange={(e) => handleGroupChange(idx, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(idx, e)}
                                        className={`w-20 h-14 text-center text-xl font-mono font-bold tracking-widest ${error ? "border-red-300 focus:border-red-500" :
                                            group.length === 4 ? "border-green-300" : ""
                                            }`}
                                        placeholder="····"
                                        maxLength={4}
                                    />
                                    {idx < 3 && (
                                        <span className="mx-1 text-2xl text-muted-foreground">-</span>
                                    )}
                                </div>
                            ))}
                        </div>
                        <p className="text-center text-xs text-muted-foreground">
                            Format: XXXX-XXXX-XXXX-XXXX
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Verify Button */}
                    <Button
                        onClick={handleVerify}
                        disabled={!isCodeComplete() || isVerifying}
                        className="w-full h-12 text-base"
                    >
                        {isVerifying ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            <>
                                <Lock className="h-4 w-4 mr-2" />
                                Verify Access Code
                            </>
                        )}
                    </Button>

                    {/* Help Section */}
                    <div className="border-t pt-4 space-y-3">
                        <p className="text-sm text-center text-muted-foreground">
                            Didn't receive a code?
                        </p>
                        <div className="flex gap-2 justify-center">
                            <Button variant="outline" size="sm" onClick={handleRequestResend}>
                                <Mail className="h-4 w-4 mr-1" />
                                Request Resend
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-4">
                    <div className="flex gap-3">
                        <Shield className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-medium text-amber-800 mb-1">Important Security Notice</p>
                            <ul className="text-amber-700 space-y-1 list-disc list-inside">
                                <li>Your access code is unique and can only be used once</li>
                                <li>Do not share this code with anyone</li>
                                <li>The assessment is proctored via webcam and screen recording</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
