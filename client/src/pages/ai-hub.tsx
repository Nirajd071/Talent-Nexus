/**
 * AI Automation Hub - Central dashboard for all AI features
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Brain,
    Sparkles,
    FileText,
    Users,
    Target,
    Mail,
    Loader2,
    CheckCircle,
    AlertCircle,
    Zap,
    TrendingUp,
    Search,
    Tags,
    Workflow,
    Calendar,
    Building2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout/Layout";

export default function AIHub() {
    const [activeTab, setActiveTab] = useState("overview");
    const { toast } = useToast();

    // Resume Parser State
    const [resumeText, setResumeText] = useState("");
    const [parsedResume, setParsedResume] = useState<any>(null);
    const [isParsing, setIsParsing] = useState(false);

    // Skill Extraction State
    const [skillText, setSkillText] = useState("");
    const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
    const [isExtracting, setIsExtracting] = useState(false);

    // Email Generation State
    const [emailType, setEmailType] = useState("interview_invite");
    const [candidateName, setCandidateName] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [generatedEmail, setGeneratedEmail] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // JD Generation State
    const [jdTitle, setJdTitle] = useState("");
    const [jdDept, setJdDept] = useState("");
    const [jdReqs, setJdReqs] = useState("");
    const [generatedJD, setGeneratedJD] = useState<any>(null);
    const [isGeneratingJD, setIsGeneratingJD] = useState(false);

    // Smart Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any>(null);
    const [isSearching, setIsSearching] = useState(false);

    // AI Stats
    const [stats, setStats] = useState({
        resumesParsed: 0,
        candidatesScored: 0,
        emailsGenerated: 0,
        talentPoolSize: 0
    });

    useEffect(() => {
        // Fetch stats
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const [talentPool] = await Promise.all([
                fetch("/api/ai/talent-pool").then(r => r.json()).catch(() => [])
            ]);
            setStats(prev => ({
                ...prev,
                talentPoolSize: talentPool.length || 0
            }));
        } catch (err) {
            console.error("Stats fetch error:", err);
        }
    };

    // Parse Resume
    const handleParseResume = async () => {
        if (!resumeText.trim()) return;
        setIsParsing(true);
        setParsedResume(null);

        try {
            const response = await fetch("/api/ai/parse-resume", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resumeText })
            });
            const data = await response.json();
            if (data.success) {
                setParsedResume(data.data);
                toast({ title: "Resume Parsed!", description: "AI extracted candidate information" });
            } else {
                toast({ title: "Parsing Failed", description: data.error, variant: "destructive" });
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to parse resume", variant: "destructive" });
        } finally {
            setIsParsing(false);
        }
    };

    // Extract Skills
    const handleExtractSkills = async () => {
        if (!skillText.trim()) return;
        setIsExtracting(true);
        setExtractedSkills([]);

        try {
            const response = await fetch("/api/ai/extract-skills", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: skillText })
            });
            const data = await response.json();
            if (data.success && data.data) {
                setExtractedSkills(data.data.skills || []);
                toast({ title: "Skills Extracted!", description: `Found ${data.data.skills?.length || 0} skills` });
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to extract skills", variant: "destructive" });
        } finally {
            setIsExtracting(false);
        }
    };

    // Generate Email
    const handleGenerateEmail = async () => {
        if (!candidateName.trim()) return;
        setIsGenerating(true);
        setGeneratedEmail(null);

        try {
            const response = await fetch("/api/ai/generate-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: emailType,
                    candidateName,
                    details: { jobTitle: jobTitle || "the position" }
                })
            });
            const data = await response.json();
            if (data.success) {
                setGeneratedEmail(data.data);
                toast({ title: "Email Generated!", description: "AI created personalized email" });
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to generate email", variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    };

    // Generate JD
    const handleGenerateJD = async () => {
        if (!jdTitle.trim()) return;
        setIsGeneratingJD(true);
        setGeneratedJD(null);

        try {
            const response = await fetch("/api/ai/generate-job-description", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: jdTitle,
                    department: jdDept || "General",
                    requirements: jdReqs ? jdReqs.split(",").map(r => r.trim()) : []
                })
            });
            const data = await response.json();
            if (data.success) {
                setGeneratedJD(data.data);
                toast({ title: "JD Generated!", description: "AI created job description" });
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to generate JD", variant: "destructive" });
        } finally {
            setIsGeneratingJD(false);
        }
    };

    // Smart Search
    const handleSmartSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchResults(null);

        try {
            const response = await fetch("/api/ai/smart-search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: searchQuery })
            });
            const data = await response.json();
            if (data.success) {
                setSearchResults(data);
                toast({ title: "Search Complete!", description: `Found ${data.results?.length || 0} candidates` });
            }
        } catch (err) {
            toast({ title: "Error", description: "Search failed", variant: "destructive" });
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Brain className="w-7 h-7 text-primary" />
                            AI Automation Hub
                        </h1>
                        <p className="text-muted-foreground">Powered by NVIDIA NIM Models</p>
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="outline" className="gap-1">
                            <Sparkles className="w-3 h-3" /> 8 AI Models Active
                        </Badge>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Talent Pool</p>
                                    <p className="text-2xl font-bold">{stats.talentPoolSize}</p>
                                </div>
                                <Users className="w-8 h-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">AI Models</p>
                                    <p className="text-2xl font-bold">8</p>
                                </div>
                                <Brain className="w-8 h-8 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Automations</p>
                                    <p className="text-2xl font-bold">Active</p>
                                </div>
                                <Zap className="w-8 h-8 text-yellow-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Status</p>
                                    <p className="text-2xl font-bold text-green-600">Online</p>
                                </div>
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-6 w-full max-w-3xl">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="resume">Resume Parser</TabsTrigger>
                        <TabsTrigger value="skills">Skills</TabsTrigger>
                        <TabsTrigger value="email">Email Gen</TabsTrigger>
                        <TabsTrigger value="jd">JD Writer</TabsTrigger>
                        <TabsTrigger value="search">Smart Search</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("resume")}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <FileText className="w-5 h-5 text-blue-500" />
                                        Resume Parser
                                    </CardTitle>
                                    <CardDescription>Extract candidate info from resumes using AI</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("skills")}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Tags className="w-5 h-5 text-green-500" />
                                        Skill Extraction
                                    </CardTitle>
                                    <CardDescription>AI-powered skill identification</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("email")}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Mail className="w-5 h-5 text-purple-500" />
                                        Email Generator
                                    </CardTitle>
                                    <CardDescription>Generate personalized emails</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("jd")}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Building2 className="w-5 h-5 text-orange-500" />
                                        JD Writer
                                    </CardTitle>
                                    <CardDescription>AI-generated job descriptions</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("search")}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Search className="w-5 h-5 text-cyan-500" />
                                        Smart Search
                                    </CardTitle>
                                    <CardDescription>Natural language candidate search</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="cursor-pointer hover:border-primary transition-colors">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Target className="w-5 h-5 text-red-500" />
                                        Candidate Scoring
                                    </CardTitle>
                                    <CardDescription>AI-powered candidate evaluation</CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Resume Parser Tab */}
                    <TabsContent value="resume" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>AI Resume Parser</CardTitle>
                                <CardDescription>Paste resume text to extract structured data</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Resume Text</Label>
                                        <Textarea
                                            placeholder="Paste resume content here..."
                                            value={resumeText}
                                            onChange={(e) => setResumeText(e.target.value)}
                                            rows={12}
                                        />
                                        <Button onClick={handleParseResume} disabled={isParsing || !resumeText.trim()}>
                                            {isParsing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Parsing...</> : <><Sparkles className="w-4 h-4 mr-2" /> Parse with AI</>}
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Extracted Data</Label>
                                        <div className="border rounded-lg p-4 min-h-[300px] bg-muted/50">
                                            {parsedResume ? (
                                                <div className="space-y-2 text-sm">
                                                    {parsedResume.name && <div><strong>Name:</strong> {parsedResume.name}</div>}
                                                    {parsedResume.email && <div><strong>Email:</strong> {parsedResume.email}</div>}
                                                    {parsedResume.phone && <div><strong>Phone:</strong> {parsedResume.phone}</div>}
                                                    {parsedResume.skills?.length > 0 && (
                                                        <div><strong>Skills:</strong> {parsedResume.skills.join(", ")}</div>
                                                    )}
                                                    {parsedResume.experience?.length > 0 && (
                                                        <div><strong>Experience:</strong> {parsedResume.experience.length} positions</div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-muted-foreground text-center pt-20">
                                                    Parsed data will appear here
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Skills Tab */}
                    <TabsContent value="skills" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>AI Skill Extraction</CardTitle>
                                <CardDescription>Extract skills from any text</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Input Text</Label>
                                    <Textarea
                                        placeholder="Enter text containing skills (e.g., job description, resume)..."
                                        value={skillText}
                                        onChange={(e) => setSkillText(e.target.value)}
                                        rows={6}
                                    />
                                    <Button onClick={handleExtractSkills} disabled={isExtracting || !skillText.trim()}>
                                        {isExtracting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extracting...</> : <><Tags className="w-4 h-4 mr-2" /> Extract Skills</>}
                                    </Button>
                                </div>
                                {extractedSkills.length > 0 && (
                                    <div className="space-y-2">
                                        <Label>Extracted Skills ({extractedSkills.length})</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {extractedSkills.map((skill, i) => (
                                                <Badge key={i} variant="secondary">{skill}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Email Tab */}
                    <TabsContent value="email" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>AI Email Generator</CardTitle>
                                <CardDescription>Generate personalized recruitment emails</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Email Type</Label>
                                        <select
                                            className="w-full p-2 border rounded-md"
                                            value={emailType}
                                            onChange={(e) => setEmailType(e.target.value)}
                                        >
                                            <option value="interview_invite">Interview Invite</option>
                                            <option value="offer">Offer Letter</option>
                                            <option value="rejection">Rejection</option>
                                            <option value="follow_up">Follow Up</option>
                                            <option value="outreach">Outreach</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Candidate Name</Label>
                                        <Input
                                            placeholder="John Doe"
                                            value={candidateName}
                                            onChange={(e) => setCandidateName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Job Title</Label>
                                        <Input
                                            placeholder="Software Engineer"
                                            value={jobTitle}
                                            onChange={(e) => setJobTitle(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleGenerateEmail} disabled={isGenerating || !candidateName.trim()}>
                                    {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Mail className="w-4 h-4 mr-2" /> Generate Email</>}
                                </Button>
                                {generatedEmail && (
                                    <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                                        <div className="font-medium">Subject: {generatedEmail.subject}</div>
                                        <div className="whitespace-pre-wrap text-sm">{generatedEmail.body}</div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* JD Tab */}
                    <TabsContent value="jd" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>AI Job Description Writer</CardTitle>
                                <CardDescription>Generate compelling job descriptions</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Job Title</Label>
                                        <Input
                                            placeholder="Senior Software Engineer"
                                            value={jdTitle}
                                            onChange={(e) => setJdTitle(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Department</Label>
                                        <Input
                                            placeholder="Engineering"
                                            value={jdDept}
                                            onChange={(e) => setJdDept(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Key Requirements (comma-separated)</Label>
                                        <Input
                                            placeholder="React, Node.js, 5+ years"
                                            value={jdReqs}
                                            onChange={(e) => setJdReqs(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleGenerateJD} disabled={isGeneratingJD || !jdTitle.trim()}>
                                    {isGeneratingJD ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Building2 className="w-4 h-4 mr-2" /> Generate JD</>}
                                </Button>
                                {generatedJD && (
                                    <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                                        <div className="font-bold text-lg">{generatedJD.title}</div>
                                        <div className="whitespace-pre-wrap text-sm">{generatedJD.description}</div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Smart Search Tab */}
                    <TabsContent value="search" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>AI Smart Search</CardTitle>
                                <CardDescription>Search candidates using natural language</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="e.g., Find React developers with 3+ years experience in Bangalore"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button onClick={handleSmartSearch} disabled={isSearching || !searchQuery.trim()}>
                                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                    </Button>
                                </div>
                                {searchResults && (
                                    <div className="space-y-4">
                                        <div className="p-2 bg-blue-50 rounded text-sm">
                                            <strong>Interpreted:</strong> {JSON.stringify(searchResults.interpretedQuery)}
                                        </div>
                                        <div className="space-y-2">
                                            {searchResults.results?.length > 0 ? (
                                                searchResults.results.map((c: any) => (
                                                    <div key={c._id} className="p-3 border rounded flex justify-between items-center">
                                                        <div>
                                                            <div className="font-medium">{c.name}</div>
                                                            <div className="text-sm text-muted-foreground">{c.email}</div>
                                                        </div>
                                                        <Badge>{c.status || "active"}</Badge>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-center text-muted-foreground py-4">No candidates found</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </Layout>
    );
}
