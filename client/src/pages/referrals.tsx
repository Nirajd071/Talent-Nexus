import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
    Users,
    Plus,
    Gift,
    TrendingUp,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    UserPlus,
    Briefcase
} from "lucide-react";

interface Referral {
    _id: string;
    referrerName: string;
    candidateName: string;
    candidateEmail: string;
    jobTitle: string;
    status: string;
    createdAt: string;
    bonusAmount?: number;
}

interface Job {
    _id: string;
    title: string;
    department: string;
}

export default function Referrals() {
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const token = localStorage.getItem("token");
    const userEmail = localStorage.getItem("userEmail") || "";
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const [form, setForm] = useState({
        referrerName: "",
        referrerEmail: userEmail,
        referrerDepartment: "",
        candidateName: "",
        candidateEmail: "",
        candidatePhone: "",
        candidateLinkedIn: "",
        jobId: "",
        jobTitle: "",
        relationship: "colleague",
        howLongKnown: "",
        whyRecommend: ""
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [refRes, jobsRes, analyticsRes] = await Promise.all([
                fetch("/api/referrals", { headers }),
                fetch("/api/referrals/jobs/available", { headers }),
                fetch("/api/referrals/analytics/summary", { headers })
            ]);

            if (refRes.ok) setReferrals(await refRes.json());
            if (jobsRes.ok) setJobs(await jobsRes.json());
            if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
        } catch (error) {
            console.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!form.candidateName || !form.candidateEmail) {
            toast({ title: "Error", description: "Candidate name and email are required", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const selectedJob = jobs.find(j => j._id === form.jobId);
            const res = await fetch("/api/referrals", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    ...form,
                    jobTitle: selectedJob?.title || form.jobTitle
                })
            });

            if (res.ok) {
                toast({ title: "Referral Submitted! 🎉", description: "Thank you for your referral!" });
                setModalOpen(false);
                setForm({
                    referrerName: "",
                    referrerEmail: userEmail,
                    referrerDepartment: "",
                    candidateName: "",
                    candidateEmail: "",
                    candidatePhone: "",
                    candidateLinkedIn: "",
                    jobId: "",
                    jobTitle: "",
                    relationship: "colleague",
                    howLongKnown: "",
                    whyRecommend: ""
                });
                fetchData();
            } else {
                const err = await res.json();
                toast({ title: "Error", description: err.error, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to submit referral", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            submitted: "bg-blue-100 text-blue-700",
            reviewing: "bg-yellow-100 text-yellow-700",
            interviewing: "bg-purple-100 text-purple-700",
            offered: "bg-orange-100 text-orange-700",
            hired: "bg-green-100 text-green-700",
            rejected: "bg-red-100 text-red-700",
            withdrawn: "bg-gray-100 text-gray-700"
        };
        return <Badge className={styles[status] || "bg-gray-100"}>{status}</Badge>;
    };

    return (
        <Layout title="Employee Referrals">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Employee Referrals</h1>
                        <p className="text-muted-foreground">Refer great talent and earn rewards!</p>
                    </div>
                    <Button onClick={() => setModalOpen(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Refer Someone
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <Users className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{analytics?.total || 0}</p>
                                    <p className="text-sm text-muted-foreground">Total Referrals</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{analytics?.hired || 0}</p>
                                    <p className="text-sm text-muted-foreground">Hired</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <TrendingUp className="h-6 w-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{analytics?.conversionRate || 0}%</p>
                                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-100 rounded-lg">
                                    <Gift className="h-6 w-6 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">₹{((analytics?.hired || 0) * 25000).toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground">Bonuses Paid</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Referrals List */}
                <Card>
                    <CardHeader>
                        <CardTitle>All Referrals</CardTitle>
                        <CardDescription>Track the status of submitted referrals</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : referrals.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No referrals yet</p>
                                <Button variant="link" onClick={() => setModalOpen(true)}>
                                    Submit your first referral
                                </Button>
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="p-3 text-left">Candidate</th>
                                            <th className="p-3 text-left">Position</th>
                                            <th className="p-3 text-left">Referred By</th>
                                            <th className="p-3 text-left">Status</th>
                                            <th className="p-3 text-left">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {referrals.map(ref => (
                                            <tr key={ref._id} className="hover:bg-muted/30">
                                                <td className="p-3">
                                                    <div>
                                                        <p className="font-medium">{ref.candidateName}</p>
                                                        <p className="text-xs text-muted-foreground">{ref.candidateEmail}</p>
                                                    </div>
                                                </td>
                                                <td className="p-3">{ref.jobTitle || "General"}</td>
                                                <td className="p-3">{ref.referrerName}</td>
                                                <td className="p-3">{getStatusBadge(ref.status)}</td>
                                                <td className="p-3 text-muted-foreground">
                                                    {new Date(ref.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Submit Referral Modal */}
                <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Refer a Candidate</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Your Name</Label>
                                    <Input
                                        value={form.referrerName}
                                        onChange={e => setForm({ ...form, referrerName: e.target.value })}
                                        placeholder="Your Name"
                                    />
                                </div>
                                <div>
                                    <Label>Your Email</Label>
                                    <Input
                                        value={form.referrerEmail}
                                        onChange={e => setForm({ ...form, referrerEmail: e.target.value })}
                                        placeholder="your@email.com"
                                    />
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-3">Candidate Information</h4>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Candidate Name *</Label>
                                            <Input
                                                value={form.candidateName}
                                                onChange={e => setForm({ ...form, candidateName: e.target.value })}
                                                placeholder="John Doe"
                                            />
                                        </div>
                                        <div>
                                            <Label>Candidate Email *</Label>
                                            <Input
                                                value={form.candidateEmail}
                                                onChange={e => setForm({ ...form, candidateEmail: e.target.value })}
                                                placeholder="john@email.com"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Position</Label>
                                        <Select
                                            value={form.jobId}
                                            onValueChange={v => setForm({ ...form, jobId: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a position" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {jobs.map(job => (
                                                    <SelectItem key={job._id} value={job._id}>
                                                        {job.title} - {job.department}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>How do you know this person?</Label>
                                        <Select
                                            value={form.relationship}
                                            onValueChange={v => setForm({ ...form, relationship: v })}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="colleague">Current Colleague</SelectItem>
                                                <SelectItem value="former_colleague">Former Colleague</SelectItem>
                                                <SelectItem value="friend">Friend</SelectItem>
                                                <SelectItem value="family">Family</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Why do you recommend this person?</Label>
                                        <Textarea
                                            value={form.whyRecommend}
                                            onChange={e => setForm({ ...form, whyRecommend: e.target.value })}
                                            placeholder="What makes them a great fit for our company?"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Referral"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
