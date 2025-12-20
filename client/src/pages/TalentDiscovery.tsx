/**
 * Talent Discovery Page
 * Recruiters can view and engage with candidate leads
 * Features AI-powered multi-platform discovery
 */
import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
    Users,
    Search,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    Loader2,
    ChevronDown,
    ChevronUp,
    Eye,
    Send,
    Linkedin,
    Github,
    Globe,
    Clock,
    Star,
    Sparkles,
    ExternalLink
} from "lucide-react";

interface CandidateLead {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
    professionalSummary?: string;
    primarySkills: string[];
    interests: string[];
    expectedJobRoles: string[];
    preferredLocation?: string;
    yearsOfExperience?: number;
    linkedIn?: string;
    github?: string;
    portfolio?: string;
    resumeUrl?: string;
    resumeFilename?: string;
    profileUrl?: string;
    source?: string;
    contacted: boolean;
    contactedAt?: string;
    status: string;
    createdAt: string;
}

// Platform configurations
const PLATFORMS = [
    { id: "github", name: "GitHub", icon: Github, color: "bg-gray-900", description: "Developers" },
    { id: "behance", name: "Behance", icon: Globe, color: "bg-blue-600", description: "Designers" },
    { id: "stackoverflow", name: "Stack Overflow", icon: Briefcase, color: "bg-orange-500", description: "Senior Devs" },
    { id: "devto", name: "Dev.to", icon: Globe, color: "bg-black", description: "Tech Writers" }
];

export function TalentDiscovery() {
    const [leads, setLeads] = useState<CandidateLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [expandedLead, setExpandedLead] = useState<string | null>(null);
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<CandidateLead | null>(null);
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [sendingEmail, setSendingEmail] = useState(false);

    // AI Discovery state
    const [aiDiscovering, setAiDiscovering] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState("github");
    const [profileCount, setProfileCount] = useState(10);
    const [searchQuery, setSearchQuery] = useState("fullstack developer");
    const [searchLocation, setSearchLocation] = useState("India");

    const { toast } = useToast();
    const token = localStorage.getItem("token");

    useEffect(() => {
        fetchLeads();
    }, [statusFilter]);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== "all") params.append("status", statusFilter);
            if (searchTerm) params.append("search", searchTerm);

            const response = await fetch(`/api/candidate-leads?${params}`);
            const result = await response.json();

            if (response.ok) {
                setLeads(result.leads || []);
            } else {
                toast({
                    title: "Error loading leads",
                    description: result.error || "Failed to fetch leads",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Fetch leads error:", error);
            toast({
                title: "Error",
                description: "Failed to load leads",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchLeads();
    };

    const toggleExpand = (leadId: string) => {
        setExpandedLead(expandedLead === leadId ? null : leadId);
    };

    const handleContactCandidate = (lead: CandidateLead) => {
        setSelectedLead(lead);
        setEmailSubject(`Exciting Opportunity - ${lead.expectedJobRoles[0] || "Job Opportunity"}`);
        setEmailBody(`Dear ${lead.fullName},

We came across your profile and are impressed with your background in ${lead.primarySkills.slice(0, 3).join(", ")}.

We have an exciting opportunity that aligns with your interests${lead.expectedJobRoles.length > 0 ? ` as a ${lead.expectedJobRoles[0]}` : ""} and would love to discuss it with you.

Please let us know a convenient time to connect.

Best regards,
[Your Name]
HireSphere Recruitment Team`);
        setEmailDialogOpen(true);
    };

    const handleSendEmail = async () => {
        if (!selectedLead || !token) return;

        setSendingEmail(true);
        try {
            // Get recruiter ID from token
            const payload = JSON.parse(atob(token.split('.')[1]));
            const recruiterId = payload.userId;

            console.log("Sending email to:", selectedLead.email);

            // Send email directly via nodemailer
            const emailResponse = await fetch("/api/email/outreach", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    to: selectedLead.email,
                    subject: emailSubject,
                    body: emailBody,
                    candidateName: selectedLead.fullName
                })
            });

            const emailResult = await emailResponse.json();
            console.log("Email response:", emailResult);

            if (!emailResponse.ok) {
                throw new Error(emailResult.error || "Failed to send email");
            }

            // Mark as contacted
            await fetch(`/api/candidate-leads/${selectedLead._id}/contact`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    recruiterId,
                    notes: `Sent outreach email: ${emailSubject}`
                })
            });

            toast({
                title: "📧 Email Sent!",
                description: `Outreach email sent to ${selectedLead.fullName}`
            });
            setEmailDialogOpen(false);
            fetchLeads();
        } catch (error: any) {
            console.error("Email send error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to send email. Check email configuration.",
                variant: "destructive"
            });
        } finally {
            setSendingEmail(false);
        }
    };

    const handleViewResume = (resumeUrl?: string) => {
        if (resumeUrl) {
            window.open(resumeUrl, "_blank");
        } else {
            toast({ title: "No resume available" });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "new": return "bg-blue-100 text-blue-700";
            case "contacted": return "bg-yellow-100 text-yellow-700";
            case "interviewing": return "bg-purple-100 text-purple-700";
            case "hired": return "bg-green-100 text-green-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    const getSourceBadge = (source?: string) => {
        const colors: Record<string, string> = {
            'GitHub': 'bg-gray-900 text-white',
            'Behance': 'bg-blue-600 text-white',
            'Stack Overflow': 'bg-orange-500 text-white',
            'Dev.to': 'bg-black text-white',
            'Manual': 'bg-green-600 text-white'
        };
        return colors[source || 'Manual'] || 'bg-gray-500 text-white';
    };

    // AI Discovery handler
    const handleAiDiscover = async () => {
        setAiDiscovering(true);
        const platformName = PLATFORMS.find(p => p.id === selectedPlatform)?.name || selectedPlatform;

        toast({
            title: `🔍 Discovering ${platformName} Profiles...`,
            description: `Searching for ${profileCount} profiles. This may take 1-2 minutes.`,
        });

        try {
            const response = await fetch("/api/candidate-leads/ai-discover", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    platform: selectedPlatform,
                    query: searchQuery,
                    location: searchLocation,
                    maxProfiles: profileCount
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                toast({
                    title: `✅ Discovered ${result.stats.saved} New Profiles!`,
                    description: `Scraped: ${result.stats.scraped}, Saved: ${result.stats.saved}, Duplicates: ${result.stats.duplicates}`,
                });
                fetchLeads();
            } else {
                throw new Error(result.error || "Discovery failed");
            }
        } catch (error: any) {
            toast({
                title: "Discovery Failed",
                description: error.message || "Failed to discover profiles. Check if Playwright is installed.",
                variant: "destructive"
            });
        } finally {
            setAiDiscovering(false);
        }
    };

    return (
        <Layout title="Talent Discovery">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Users className="h-8 w-8 text-primary" />
                            Talent Discovery
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Discover and engage with talented candidates who want to be found
                        </p>
                    </div>
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                        {leads.length} Candidates
                    </Badge>
                </div>

                {/* AI Discovery Section */}
                <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-purple-700">
                                <Sparkles className="h-5 w-5" />
                                <h3 className="font-semibold">AI Talent Discovery</h3>
                                <span className="text-sm text-muted-foreground">— Scrape profiles from developer platforms</span>
                            </div>

                            {/* Platform Tabs */}
                            <div className="flex flex-wrap gap-2">
                                {PLATFORMS.map((platform) => (
                                    <Button
                                        key={platform.id}
                                        variant={selectedPlatform === platform.id ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedPlatform(platform.id)}
                                        className={selectedPlatform === platform.id ? platform.color : ""}
                                    >
                                        <platform.icon className="h-4 w-4 mr-1" />
                                        {platform.name}
                                        <span className="ml-1 text-xs opacity-70">({platform.description})</span>
                                    </Button>
                                ))}
                            </div>

                            {/* Search Options */}
                            <div className="flex flex-wrap gap-3 items-end">
                                <div className="flex-1 min-w-[200px]">
                                    <Label className="text-xs text-muted-foreground">Search Query</Label>
                                    <Input
                                        placeholder="e.g., react developer, UI designer"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="w-32">
                                    <Label className="text-xs text-muted-foreground">Location</Label>
                                    <Input
                                        placeholder="India"
                                        value={searchLocation}
                                        onChange={(e) => setSearchLocation(e.target.value)}
                                    />
                                </div>
                                <div className="w-28">
                                    <Label className="text-xs text-muted-foreground">Profiles</Label>
                                    <Select value={String(profileCount)} onValueChange={(v) => setProfileCount(Number(v))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5">5</SelectItem>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="25">25</SelectItem>
                                            <SelectItem value="50">50</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    onClick={handleAiDiscover}
                                    disabled={aiDiscovering}
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all ai-discover-btn"
                                >
                                    {aiDiscovering ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Discovering...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            AI Discover ({PLATFORMS.find(p => p.id === selectedPlatform)?.name})
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Filters */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 flex gap-2">
                                <Input
                                    placeholder="Search by name, email, or skills..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                                    className="flex-1"
                                />
                                <Button onClick={handleSearch}>
                                    <Search className="h-4 w-4 mr-2" />
                                    Search
                                </Button>
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full md:w-48">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Leads</SelectItem>
                                    <SelectItem value="new">New</SelectItem>
                                    <SelectItem value="contacted">Contacted</SelectItem>
                                    <SelectItem value="interviewing">Interviewing</SelectItem>
                                    <SelectItem value="hired">Hired</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Leads List */}
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : leads.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No candidates found</h3>
                            <p className="text-muted-foreground">
                                No candidates have submitted their profiles yet
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <ScrollArea className="h-[600px]">
                        <div className="space-y-4">
                            {leads.map((lead) => (
                                <Card key={lead._id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/50">
                                    <CardContent className="p-6">
                                        {/* Summary View */}
                                        <div className="flex items-start gap-4">
                                            <Avatar className="h-14 w-14">
                                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-bold text-lg">
                                                    {lead.fullName.split(" ").map(n => n[0]).join("").toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <h3
                                                        className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors"
                                                        onClick={() => toggleExpand(lead._id)}
                                                    >
                                                        {lead.fullName}
                                                    </h3>
                                                    {lead.contacted && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            ✓ Contacted
                                                        </Badge>
                                                    )}
                                                    <Badge className={`text-xs ${getStatusColor(lead.status)}`}>
                                                        {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                                                    </Badge>
                                                    {lead.yearsOfExperience && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {lead.yearsOfExperience} yrs exp
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Contact Info */}
                                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="h-3 w-3" />
                                                        {lead.email}
                                                    </span>
                                                    {lead.phone && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone className="h-3 w-3" />
                                                            {lead.phone}
                                                        </span>
                                                    )}
                                                    {lead.preferredLocation && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="h-3 w-3" />
                                                            {lead.preferredLocation}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(lead.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                {/* Expected Roles */}
                                                {lead.expectedJobRoles.length > 0 && (
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                                                        <div className="flex flex-wrap gap-1">
                                                            {lead.expectedJobRoles.slice(0, 3).map((role) => (
                                                                <Badge key={role} className="bg-primary/10 text-primary text-xs">
                                                                    {role}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Skills */}
                                                <div className="flex flex-wrap gap-1 mb-3">
                                                    {lead.primarySkills.slice(0, 6).map((skill) => (
                                                        <Badge key={skill} variant="secondary" className="text-xs">
                                                            {skill}
                                                        </Badge>
                                                    ))}
                                                    {lead.primarySkills.length > 6 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            +{lead.primarySkills.length - 6} more
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex gap-2 flex-wrap">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => toggleExpand(lead._id)}
                                                    >
                                                        {expandedLead === lead._id ? (
                                                            <>
                                                                <ChevronUp className="h-4 w-4 mr-1" />
                                                                Hide Details
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ChevronDown className="h-4 w-4 mr-1" />
                                                                View More
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleContactCandidate(lead)}
                                                        className="bg-primary hover:bg-primary/90"
                                                    >
                                                        <Send className="h-4 w-4 mr-1" />
                                                        {lead.contacted ? "Contact Again" : "Contact"}
                                                    </Button>
                                                    {lead.resumeUrl && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleViewResume(lead.resumeUrl)}
                                                        >
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            Profile
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {expandedLead === lead._id && (
                                            <div className="mt-6 pt-6 border-t space-y-4 animate-in slide-in-from-top-2">
                                                {lead.professionalSummary && (
                                                    <div className="bg-muted/50 p-4 rounded-lg">
                                                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                                                            <Star className="h-4 w-4 text-yellow-500" />
                                                            Professional Summary
                                                        </h4>
                                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                                            {lead.professionalSummary}
                                                        </p>
                                                    </div>
                                                )}

                                                {lead.interests.length > 0 && (
                                                    <div>
                                                        <h4 className="font-semibold mb-2">Interests & Domains</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {lead.interests.map((interest) => (
                                                                <Badge key={interest} variant="outline">
                                                                    {interest}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {lead.expectedJobRoles.length > 0 && (
                                                    <div>
                                                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                                                            <Briefcase className="h-4 w-4" />
                                                            Expected Job Roles
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {lead.expectedJobRoles.map((role) => (
                                                                <Badge key={role} className="bg-primary/10 text-primary">
                                                                    {role}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div>
                                                    <h4 className="font-semibold mb-2">All Skills</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {lead.primarySkills.map((skill) => (
                                                            <Badge key={skill} variant="secondary">
                                                                {skill}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Social Links */}
                                                {(lead.linkedIn || lead.github || lead.portfolio) && (
                                                    <div>
                                                        <h4 className="font-semibold mb-2">Social Links</h4>
                                                        <div className="flex gap-3">
                                                            {lead.linkedIn && (
                                                                <a
                                                                    href={lead.linkedIn.startsWith('http') ? lead.linkedIn : `https://${lead.linkedIn}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-1 text-blue-600 hover:underline"
                                                                >
                                                                    <Linkedin className="h-4 w-4" />
                                                                    LinkedIn
                                                                </a>
                                                            )}
                                                            {lead.github && (
                                                                <a
                                                                    href={lead.github.startsWith('http') ? lead.github : `https://${lead.github}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-1 text-gray-700 hover:underline"
                                                                >
                                                                    <Github className="h-4 w-4" />
                                                                    GitHub
                                                                </a>
                                                            )}
                                                            {lead.portfolio && (
                                                                <a
                                                                    href={lead.portfolio.startsWith('http') ? lead.portfolio : `https://${lead.portfolio}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-1 text-green-600 hover:underline"
                                                                >
                                                                    <Globe className="h-4 w-4" />
                                                                    Portfolio
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                )}

                {/* Email Dialog */}
                <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Send className="h-5 w-5" />
                                Contact Candidate
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label>To</Label>
                                <Input value={selectedLead?.email || ""} disabled className="bg-muted" />
                            </div>
                            <div>
                                <Label>Subject</Label>
                                <Input
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Message</Label>
                                <Textarea
                                    value={emailBody}
                                    onChange={(e) => setEmailBody(e.target.value)}
                                    rows={10}
                                    className="font-mono text-sm"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSendEmail} disabled={sendingEmail}>
                                    {sendingEmail && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    <Send className="h-4 w-4 mr-2" />
                                    Send Email
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
