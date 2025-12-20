import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Briefcase, Mail, Lock, Shield, CheckCircle, ArrowRight, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
    const [activeTab, setActiveTab] = useState<"candidate" | "recruiter">("candidate");
    const [candidateMode, setCandidateMode] = useState<"login" | "register">("login");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const { toast } = useToast();

    // Candidate login state
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");

    // Candidate register state
    const [registerEmail, setRegisterEmail] = useState("");
    const [registerPassword, setRegisterPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    // Recruiter OTP state
    const [recruiterEmail, setRecruiterEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [demoOtp, setDemoOtp] = useState("");

    const handleGoogleLogin = () => {
        window.location.href = "/api/auth/google";
    };

    const handleCandidateLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: loginEmail, password: loginPassword })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Login failed");
            }

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            toast({ title: "Welcome back!", description: "Login successful" });
            window.location.href = data.user.role === "recruiter" ? "/dashboard" : "/candidate";
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCandidateRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (registerPassword !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: registerEmail,
                    password: registerPassword,
                    firstName,
                    lastName,
                    role: "candidate"
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Registration failed");
            }

            // Auto-login: store token and redirect
            if (data.token) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                toast({ title: "Account created!", description: "Welcome to HireSphere!" });
                window.location.href = "/candidate";
            } else {
                // Fallback: ask to login manually
                toast({ title: "Account created!", description: "Please login with your credentials" });
                setCandidateMode("login");
                setLoginEmail(registerEmail);
            }

            setRegisterEmail("");
            setRegisterPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/recruiter/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: recruiterEmail })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to send OTP");
            }

            setOtpSent(true);
            setDemoOtp(data._demoOtp || "");
            toast({ title: "OTP Sent!", description: "Check your email for the verification code" });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/recruiter/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: recruiterEmail, otp })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Verification failed");
            }

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            toast({ title: "Welcome!", description: "Login successful" });
            window.location.href = "/dashboard";
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-sm border">
                <CardHeader className="text-center space-y-2 pb-4">
                    <div className="mx-auto w-14 h-14 rounded-xl flex items-center justify-center mb-2 overflow-hidden">
                        <img src="/logo.png" alt="HireSphere" className="w-full h-full object-contain" />
                    </div>
                    <CardTitle className="text-xl font-display"><span className="text-foreground">Hire</span><span className="text-primary">Sphere</span></CardTitle>
                    <CardDescription>AI-Powered Talent Acquisition Platform</CardDescription>
                </CardHeader>

                <CardContent>
                    {/* Demo Credentials for Judges */}
                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-700 mb-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                            <span className="font-semibold">Demo Credentials for Judges</span>
                        </div>
                        <p className="text-xs text-blue-600 mb-3">Test the recruiter dashboard</p>

                        <div className="bg-white rounded-md p-3 border border-blue-100">
                            <div className="flex items-center gap-2 mb-1">
                                <Shield className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-sm">Recruiter</span>
                                <span className="text-orange-500 font-mono text-sm">(OTP: 999999)</span>
                            </div>
                            <p className="text-sm text-gray-700 ml-6">admin.demo@hackathon.com</p>
                            <p className="text-xs text-blue-500 mt-1 ml-6">Use OTP: 999999</p>
                        </div>

                        <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                            💡 Candidates can register freely - no demo account needed
                        </p>
                    </div>

                    <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setError(""); setOtpSent(false); }}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="candidate">
                                <User className="w-4 h-4 mr-2" /> Candidate
                            </TabsTrigger>
                            <TabsTrigger value="recruiter">
                                <Shield className="w-4 h-4 mr-2" /> Recruiter
                            </TabsTrigger>
                        </TabsList>

                        {/* Candidate Tab */}
                        <TabsContent value="candidate" className="space-y-4 mt-4">
                            <div className="flex border-b mb-4">
                                <button
                                    className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${candidateMode === "login" ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}
                                    onClick={() => { setCandidateMode("login"); setError(""); }}
                                >
                                    Login
                                </button>
                                <button
                                    className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${candidateMode === "register" ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}
                                    onClick={() => { setCandidateMode("register"); setError(""); }}
                                >
                                    Register
                                </button>
                            </div>

                            {candidateMode === "login" ? (
                                <div className="space-y-4">
                                    <Button onClick={handleGoogleLogin} variant="outline" className="w-full h-10">
                                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Continue with Google
                                    </Button>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-background px-2 text-muted-foreground">or</span>
                                        </div>
                                    </div>

                                    <form onSubmit={handleCandidateLogin} className="space-y-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="login-email" className="text-sm">Email</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="login-email"
                                                    type="email"
                                                    placeholder="you@example.com"
                                                    value={loginEmail}
                                                    onChange={(e) => setLoginEmail(e.target.value)}
                                                    className="pl-10 h-9"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="login-password" className="text-sm">Password</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="login-password"
                                                    type="password"
                                                    placeholder="••••••••"
                                                    value={loginPassword}
                                                    onChange={(e) => setLoginPassword(e.target.value)}
                                                    className="pl-10 h-9"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {error && (
                                            <Alert variant="destructive" className="py-2">
                                                <AlertDescription className="text-sm">{error}</AlertDescription>
                                            </Alert>
                                        )}

                                        <Button type="submit" className="w-full" disabled={isLoading}>
                                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Login"}
                                        </Button>
                                    </form>
                                </div>
                            ) : (
                                <form onSubmit={handleCandidateRegister} className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-sm">First Name</Label>
                                            <Input
                                                placeholder="John"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                className="h-9"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-sm">Last Name</Label>
                                            <Input
                                                placeholder="Doe"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                className="h-9"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-sm">Email</Label>
                                        <Input
                                            type="email"
                                            placeholder="you@example.com"
                                            value={registerEmail}
                                            onChange={(e) => setRegisterEmail(e.target.value)}
                                            className="h-9"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-sm">Password</Label>
                                        <Input
                                            type="password"
                                            placeholder="Min 6 characters"
                                            value={registerPassword}
                                            onChange={(e) => setRegisterPassword(e.target.value)}
                                            className="h-9"
                                            required
                                            minLength={6}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-sm">Confirm Password</Label>
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="h-9"
                                            required
                                        />
                                    </div>

                                    {error && (
                                        <Alert variant="destructive" className="py-2">
                                            <AlertDescription className="text-sm">{error}</AlertDescription>
                                        </Alert>
                                    )}

                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4 mr-2" /> Create Account</>}
                                    </Button>
                                </form>
                            )}
                        </TabsContent>

                        {/* Recruiter Tab */}
                        <TabsContent value="recruiter" className="space-y-4 mt-4">
                            {!otpSent ? (
                                <form onSubmit={handleSendOtp} className="space-y-4">
                                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                                        <Shield className="w-10 h-10 mx-auto mb-2 text-primary" />
                                        <h3 className="font-medium">Recruiter Login</h3>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Enter your company email to receive a verification code
                                        </p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-sm">Company Email</Label>
                                        <Input
                                            type="email"
                                            placeholder="you@kpriet.ac.in"
                                            value={recruiterEmail}
                                            onChange={(e) => setRecruiterEmail(e.target.value)}
                                            className="h-9"
                                            required
                                        />
                                    </div>

                                    {error && (
                                        <Alert variant="destructive" className="py-2">
                                            <AlertDescription className="text-sm">{error}</AlertDescription>
                                        </Alert>
                                    )}

                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send OTP <ArrowRight className="w-4 h-4 ml-2" /></>}
                                    </Button>
                                </form>
                            ) : (
                                <form onSubmit={handleVerifyOtp} className="space-y-4">
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                                        <p className="text-sm text-foreground">OTP sent to {recruiterEmail}</p>
                                        {demoOtp && <p className="text-xs text-amber-600 mt-1 font-mono">Demo: {demoOtp}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-sm">Enter 6-digit OTP</Label>
                                        <Input
                                            type="text"
                                            placeholder="123456"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            className="text-center text-lg tracking-widest h-10"
                                            maxLength={6}
                                            required
                                        />
                                    </div>

                                    {error && (
                                        <Alert variant="destructive" className="py-2">
                                            <AlertDescription className="text-sm">{error}</AlertDescription>
                                        </Alert>
                                    )}

                                    <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Login"}
                                    </Button>

                                    <Button type="button" variant="ghost" className="w-full" onClick={() => { setOtpSent(false); setOtp(""); setError(""); }}>
                                        ← Back
                                    </Button>
                                </form>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>

                <CardFooter className="justify-center pt-0">
                    <p className="text-xs text-muted-foreground">Secure authentication for candidates and recruiters</p>
                </CardFooter>
            </Card>
        </div>
    );
}
