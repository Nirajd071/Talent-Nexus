/**
 * Job Board Integration Page
 * Manage job board connections and postings
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Globe,
    Plus,
    ExternalLink,
    Settings,
    CheckCircle,
    AlertCircle,
    Loader2,
    Briefcase,
    Eye,
    Users,
    TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout/Layout";

interface JobBoard {
    platform: string;
    name: string;
    logo?: string;
    features: string[];
    isConnected?: boolean;
}

interface Posting {
    _id: string;
    jobId: string;
    jobTitle: string;
    platform: string;
    externalId?: string;
    status: string;
    postedAt: string;
    expiresAt?: string;
    stats?: { views: number; applications: number };
}

export default function JobBoardsPage() {
    const [platforms, setPlatforms] = useState<JobBoard[]>([]);
    const [postings, setPostings] = useState<Posting[]>([]);
    const [jobs, setJobs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [postOpen, setPostOpen] = useState(false);
    const { toast } = useToast();

    // Post form
    const [selectedJob, setSelectedJob] = useState("");
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
    const [isPosting, setIsPosting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [platformsRes, postingsRes, jobsRes] = await Promise.all([
                fetch("/api/job-boards/platforms"),
                fetch("/api/job-boards/postings"),
                fetch("/api/jobs?status=active")
            ]);

            if (platformsRes.ok) {
                const data = await platformsRes.json();
                setPlatforms(data);
            }
            if (postingsRes.ok) {
                const data = await postingsRes.json();
                setPostings(data);
            }
            if (jobsRes.ok) {
                const data = await jobsRes.json();
                setJobs(data);
            }
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePost = async () => {
        if (!selectedJob || selectedPlatforms.length === 0) return;
        setIsPosting(true);

        try {
            const response = await fetch("/api/job-boards/post", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jobId: selectedJob,
                    platforms: selectedPlatforms
                })
            });
            if (response.ok) {
                const data = await response.json();
                toast({
                    title: "Jobs Posted!",
                    description: `Posted to ${data.results?.filter((r: any) => r.success).length || 0} platforms`
                });
                setPostOpen(false);
                setSelectedJob("");
                setSelectedPlatforms([]);
                fetchData();
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to post jobs", variant: "destructive" });
        } finally {
            setIsPosting(false);
        }
    };

    const handleSync = async (platform: string) => {
        try {
            const response = await fetch(`/api/job-boards/sync/${platform}`, { method: "POST" });
            if (response.ok) {
                toast({ title: "Sync Complete", description: `Synced applications from ${platform}` });
                fetchData();
            }
        } catch (err) {
            toast({ title: "Error", description: "Sync failed", variant: "destructive" });
        }
    };

    const togglePlatform = (platform: string) => {
        setSelectedPlatforms(prev =>
            prev.includes(platform)
                ? prev.filter(p => p !== platform)
                : [...prev, platform]
        );
    };

    const getPlatformIcon = (platform: string) => {
        const icons: Record<string, string> = {
            linkedin: "🔗",
            indeed: "📋",
            glassdoor: "🚪",
            naukri: "🇮🇳",
            internshala: "🎓",
            website: "🌐"
        };
        return icons[platform] || "📝";
    };

    // Stats
    const totalViews = postings.reduce((sum, p) => sum + (p.stats?.views || 0), 0);
    const totalApps = postings.reduce((sum, p) => sum + (p.stats?.applications || 0), 0);

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Globe className="w-7 h-7 text-primary" />
                            Job Board Integration
                        </h1>
                        <p className="text-muted-foreground">Post to multiple job boards at once</p>
                    </div>
                    <Button onClick={() => setPostOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Post Job
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Platforms</p>
                                    <p className="text-2xl font-bold">{platforms.length}</p>
                                </div>
                                <Globe className="w-8 h-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Active Postings</p>
                                    <p className="text-2xl font-bold">{postings.filter(p => p.status === "active").length}</p>
                                </div>
                                <Briefcase className="w-8 h-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Views</p>
                                    <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
                                </div>
                                <Eye className="w-8 h-8 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Applications</p>
                                    <p className="text-2xl font-bold">{totalApps}</p>
                                </div>
                                <Users className="w-8 h-8 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Platforms */}
                <Card>
                    <CardHeader>
                        <CardTitle>Connected Platforms</CardTitle>
                        <CardDescription>Click to sync applications from each platform</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                        ) : (
                            <div className="grid grid-cols-3 gap-4">
                                {platforms.map((platform) => (
                                    <div
                                        key={platform.platform}
                                        className="p-4 border rounded-lg hover:border-primary transition-colors cursor-pointer"
                                        onClick={() => handleSync(platform.platform)}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">{getPlatformIcon(platform.platform)}</span>
                                                <div>
                                                    <div className="font-medium">{platform.name}</div>
                                                    <div className="text-xs text-muted-foreground">{platform.platform}</div>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="text-green-600">
                                                <CheckCircle className="w-3 h-3 mr-1" /> Ready
                                            </Badge>
                                        </div>
                                        <div className="flex gap-1 flex-wrap">
                                            {platform.features?.slice(0, 3).map((f, i) => (
                                                <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Active Postings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Active Postings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {postings.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                No active postings. Post a job to get started!
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {postings.map((posting) => (
                                    <div key={posting._id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">{getPlatformIcon(posting.platform)}</span>
                                            <div>
                                                <div className="font-medium">{posting.jobTitle}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {posting.platform} • Posted {new Date(posting.postedAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right text-sm">
                                                <div className="flex items-center gap-1">
                                                    <Eye className="w-3 h-3" /> {posting.stats?.views || 0}
                                                </div>
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <Users className="w-3 h-3" /> {posting.stats?.applications || 0}
                                                </div>
                                            </div>
                                            <Badge variant={posting.status === "active" ? "default" : "secondary"}>
                                                {posting.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Post Dialog */}
                <Dialog open={postOpen} onOpenChange={setPostOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Post Job to Boards</DialogTitle>
                            <DialogDescription>Select a job and platforms to post to</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Select Job</Label>
                                <select
                                    className="w-full p-2 border rounded-md"
                                    value={selectedJob}
                                    onChange={(e) => setSelectedJob(e.target.value)}
                                >
                                    <option value="">Choose a job...</option>
                                    {jobs.map((job) => (
                                        <option key={job._id} value={job._id}>{job.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Select Platforms</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {platforms.map((platform) => (
                                        <div
                                            key={platform.platform}
                                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedPlatforms.includes(platform.platform)
                                                    ? 'border-primary bg-primary/5'
                                                    : 'hover:border-muted-foreground'
                                                }`}
                                            onClick={() => togglePlatform(platform.platform)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span>{getPlatformIcon(platform.platform)}</span>
                                                <span className="font-medium">{platform.name}</span>
                                                {selectedPlatforms.includes(platform.platform) && (
                                                    <CheckCircle className="w-4 h-4 text-primary ml-auto" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setPostOpen(false)}>Cancel</Button>
                            <Button
                                onClick={handlePost}
                                disabled={isPosting || !selectedJob || selectedPlatforms.length === 0}
                            >
                                {isPosting ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Posting...</>
                                ) : (
                                    <><ExternalLink className="w-4 h-4 mr-2" /> Post to {selectedPlatforms.length} Platforms</>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
