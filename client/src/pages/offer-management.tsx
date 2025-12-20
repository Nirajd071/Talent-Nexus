import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import {
    FileSignature,
    DollarSign,
    Calendar,
    CheckCircle2,
    Clock,
    Send,
    Plus,
    Mail,
    ExternalLink,
    TrendingUp,
    ArrowRight,
    Sparkles,
    Loader2,
    RotateCcw,
    Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Approver {
    name: string;
    role: string;
    status: "waiting" | "pending" | "approved" | "rejected";
    date?: string;
}

interface Offer {
    _id: string;
    candidateId?: string;
    candidateName: string;
    candidateEmail: string;
    jobId?: string;
    role: string;
    department?: string;
    baseSalary: number;
    salary?: number; // Legacy field
    bonus: number;
    equity?: string;
    startDate?: string;
    expiresAt?: string;
    status: "draft" | "pending_approval" | "approved" | "sent" | "accepted" | "declined" | "negotiating";
    approvalChain?: Approver[];
    signedAt?: string;
    createdAt: string;
}

interface Candidate {
    _id: string;
    name: string;
    email: string;
    jobTitle?: string;
}

interface Analytics {
    total: number;
    accepted: number;
    declined: number;
    pending: number;
    negotiating: number;
    avgSalary: number;
    acceptanceRate: number;
    thisQuarter: number;
}

const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    pending_approval: "bg-yellow-100 text-yellow-700",
    approved: "bg-blue-100 text-blue-700",
    sent: "bg-purple-100 text-purple-700",
    accepted: "bg-green-100 text-green-700",
    declined: "bg-red-100 text-red-700",
    negotiating: "bg-orange-100 text-orange-700",
};

export default function OfferManagement() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Create offer form state
    const [selectedCandidate, setSelectedCandidate] = useState("");
    const [offerRole, setOfferRole] = useState("");
    const [offerDepartment, setOfferDepartment] = useState("");
    const [salaryValue, setSalaryValue] = useState([150000]);
    const [bonusValue, setBonusValue] = useState("");
    const [equityValue, setEquityValue] = useState("");
    const [startDate, setStartDate] = useState("");
    const [expiresAt, setExpiresAt] = useState("");

    const { toast } = useToast();
    const token = localStorage.getItem("token");

    // Fetch offers and candidates on mount
    useEffect(() => {
        fetchOffers();
        fetchCandidates();
        fetchAnalytics();
    }, []);

    const fetchOffers = async () => {
        try {
            const response = await fetch("/api/offers", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setOffers(data);
            }
        } catch (error) {
            console.error("Failed to fetch offers:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCandidates = async () => {
        try {
            const response = await fetch("/api/candidates", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setCandidates(data);
            }
        } catch (error) {
            console.error("Failed to fetch candidates:", error);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const response = await fetch("/api/offers/analytics/summary", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setAnalytics(data);
            }
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
        }
    };

    const handleCreateOffer = async () => {
        const candidate = candidates.find(c => c._id === selectedCandidate);
        if (!candidate || !offerRole) {
            toast({ title: "Missing Information", description: "Please select a candidate and enter a role.", variant: "destructive" });
            return;
        }

        setIsCreating(true);
        try {
            const response = await fetch("/api/offers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    candidateId: candidate._id,
                    candidateName: candidate.name,
                    candidateEmail: candidate.email,
                    role: offerRole,
                    department: offerDepartment,
                    baseSalary: salaryValue[0],
                    bonus: parseInt(bonusValue) || 0,
                    equity: equityValue || "0%",
                    startDate,
                    expiresAt
                })
            });

            if (response.ok) {
                const newOffer = await response.json();
                setOffers(prev => [newOffer, ...prev]);
                toast({ title: "Offer Created", description: `Offer for ${candidate.name} has been created.` });
                // Reset form
                setSelectedCandidate("");
                setOfferRole("");
                setOfferDepartment("");
                setSalaryValue([150000]);
                setBonusValue("");
                setEquityValue("");
                setStartDate("");
                setExpiresAt("");
                fetchAnalytics();
            } else {
                throw new Error("Failed to create offer");
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to create offer.", variant: "destructive" });
        } finally {
            setIsCreating(false);
        }
    };

    const handleApprove = async (offerId: string) => {
        try {
            const response = await fetch(`/api/offers/${offerId}/approve`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const updatedOffer = await response.json();
                setOffers(prev => prev.map(o => o._id === offerId ? updatedOffer : o));
                toast({ title: "Offer Approved", description: updatedOffer.status === "approved" ? "All approvals complete. Ready to send!" : "Moved to next approver." });
                fetchAnalytics();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to approve offer.", variant: "destructive" });
        }
    };

    const handleSendOffer = async (offerId: string) => {
        setIsSending(offerId);
        try {
            const response = await fetch(`/api/offers/${offerId}/send`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                setOffers(prev => prev.map(o => o._id === offerId ? result.offer : o));
                toast({ title: "Offer Sent!", description: "The offer has been sent to the candidate." });
                fetchAnalytics();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to send offer.", variant: "destructive" });
        } finally {
            setIsSending(null);
        }
    };

    const handleSendReminder = async (offer: Offer) => {
        setIsSending(offer._id);
        try {
            await fetch("/api/email/status-update", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    candidateEmail: offer.candidateEmail,
                    candidateName: offer.candidateName,
                    status: "Reminder",
                    jobTitle: offer.role,
                    nextSteps: `Your offer expires on ${offer.expiresAt}. Please review and respond.`
                }),
            });
            toast({ title: "Reminder Sent", description: `Reminder sent to ${offer.candidateName}` });
        } catch {
            toast({ title: "Reminder Sent (Demo)", description: "Email service in demo mode" });
        } finally {
            setIsSending(null);
        }
    };

    const handleDeleteOffer = async (offerId: string) => {
        try {
            const response = await fetch(`/api/offers/${offerId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                setOffers(prev => prev.filter(o => o._id !== offerId));
                toast({ title: "Offer Deleted", description: "The offer has been removed." });
                fetchAnalytics();
            }
        } catch {
            toast({ title: "Error", description: "Failed to delete offer.", variant: "destructive" });
        }
    };

    const handleMarkResponse = async (offerId: string, response: "accepted" | "declined") => {
        try {
            const res = await fetch(`/api/offers/${offerId}/respond`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ response })
            });
            if (res.ok) {
                const updated = await res.json();
                setOffers(prev => prev.map(o => o._id === offerId ? updated : o));
                toast({ title: response === "accepted" ? "Offer Accepted! 🎉" : "Offer Declined", description: `Status updated for the offer.` });
                fetchAnalytics();
            }
        } catch {
            toast({ title: "Error", description: "Failed to update response.", variant: "destructive" });
        }
    };

    const renderOfferCard = (offer: Offer) => (
        <Card key={offer._id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {offer.candidateName.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">{offer.candidateName}</h3>
                                <Badge className={statusColors[offer.status]}>
                                    {offer.status.replace("_", " ")}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground">{offer.role} • {offer.department || "General"}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                                <span className="flex items-center gap-1">
                                    <DollarSign className="h-3.5 w-3.5" />
                                    ${(offer.baseSalary || offer.salary || 0)?.toLocaleString()} base
                                </span>
                                {offer.bonus > 0 && (
                                    <span className="flex items-center gap-1">
                                        <TrendingUp className="h-3.5 w-3.5" />
                                        ${offer.bonus?.toLocaleString()} bonus
                                    </span>
                                )}
                                {offer.startDate && (
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        Start: {offer.startDate}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {offer.status === "draft" && (
                            <Button variant="outline" size="sm" onClick={() => {
                                // Submit for approval - just update status to pending_approval
                                fetch(`/api/offers/${offer._id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ status: "pending_approval" })
                                }).then(() => fetchOffers());
                            }}>
                                Submit for Approval
                            </Button>
                        )}
                        {offer.status === "pending_approval" && (
                            <Button variant="outline" size="sm" onClick={() => handleApprove(offer._id)}>
                                Approve
                            </Button>
                        )}
                        {offer.status === "approved" && (
                            <Button size="sm" className="gap-2" onClick={() => handleSendOffer(offer._id)} disabled={isSending === offer._id}>
                                {isSending === offer._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                Send to Candidate
                            </Button>
                        )}
                        {offer.status === "sent" && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={async () => {
                                        try {
                                            const res = await fetch(`/api/offers/${offer._id}/generate-signing-link`, {
                                                method: "POST",
                                                headers: { Authorization: `Bearer ${token}` }
                                            });
                                            const data = await res.json();
                                            if (data.signingLink) {
                                                await navigator.clipboard.writeText(data.signingLink);
                                                toast({ title: "Signing Link Copied! 📋", description: "Share this link with the candidate" });
                                            }
                                        } catch {
                                            toast({ title: "Error", description: "Failed to generate link", variant: "destructive" });
                                        }
                                    }}
                                >
                                    <ExternalLink className="h-3.5 w-3.5" /> Get Signing Link
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2" onClick={() => handleMarkResponse(offer._id, "accepted")}>
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark Accepted
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleMarkResponse(offer._id, "declined")}>
                                    Declined
                                </Button>
                            </>
                        )}
                        {offer.status === "accepted" && (
                            <Badge className="bg-green-100 text-green-700 h-8 px-3">
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                Signed {offer.signedAt}
                            </Badge>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteOffer(offer._id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                </div>

                {/* Approval Chain Progress */}
                {offer.approvalChain && offer.approvalChain.length > 0 && offer.status === "pending_approval" && (
                    <div className="mt-6 pt-4 border-t">
                        <p className="text-xs font-semibold text-muted-foreground mb-3">APPROVAL PROGRESS</p>
                        <div className="flex items-center gap-2">
                            {offer.approvalChain.map((approver, i) => (
                                <div key={i} className="flex items-center">
                                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${approver.status === 'approved' ? 'bg-green-50 border-green-200' :
                                        approver.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
                                            'bg-muted border-border'
                                        }`}>
                                        {approver.status === 'approved' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                        {approver.status === 'pending' && <Clock className="h-4 w-4 text-yellow-600" />}
                                        {approver.status === 'waiting' && <Clock className="h-4 w-4 text-muted-foreground" />}
                                        <div>
                                            <p className="text-xs font-medium">{approver.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{approver.role}</p>
                                        </div>
                                    </div>
                                    {i < offer.approvalChain!.length - 1 && (
                                        <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    if (isLoading) {
        return (
            <Layout title="Offer Management">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Offer Management">
            <Tabs defaultValue="all" className="space-y-6">
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="all">All Offers ({offers.length})</TabsTrigger>
                        <TabsTrigger value="pending">Pending Approval</TabsTrigger>
                        <TabsTrigger value="sent">Awaiting Response</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    </TabsList>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Create Offer
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Create New Offer</DialogTitle>
                                <DialogDescription>
                                    Generate an offer letter with compensation details.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-6 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Candidate *</Label>
                                        <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select candidate" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {candidates.map(c => (
                                                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Position/Role *</Label>
                                        <Input
                                            placeholder="e.g., Senior Developer"
                                            value={offerRole}
                                            onChange={(e) => setOfferRole(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Department</Label>
                                    <Input
                                        placeholder="e.g., Engineering"
                                        value={offerDepartment}
                                        onChange={(e) => setOfferDepartment(e.target.value)}
                                    />
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <Label className="text-base font-semibold">Compensation Package</Label>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <Label>Base Salary</Label>
                                            <span className="text-xl font-bold text-primary">
                                                ${salaryValue[0].toLocaleString()}
                                            </span>
                                        </div>
                                        <Slider
                                            value={salaryValue}
                                            onValueChange={setSalaryValue}
                                            max={300000}
                                            min={50000}
                                            step={5000}
                                            className="py-2"
                                        />
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>$50k</span>
                                            <span>$300k</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Signing Bonus</Label>
                                            <Input
                                                type="number"
                                                placeholder="25000"
                                                value={bonusValue}
                                                onChange={(e) => setBonusValue(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Equity (%)</Label>
                                            <Input
                                                placeholder="0.05%"
                                                value={equityValue}
                                                onChange={(e) => setEquityValue(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Start Date</Label>
                                            <Input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Offer Expires</Label>
                                            <Input
                                                type="date"
                                                value={expiresAt}
                                                onChange={(e) => setExpiresAt(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                    <Button onClick={handleCreateOffer} disabled={isCreating}>
                                        {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        Create Offer
                                    </Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* All Offers Tab */}
                <TabsContent value="all" className="space-y-4">
                    {offers.length === 0 ? (
                        <Card>
                            <CardContent className="p-12 text-center">
                                <FileSignature className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Offers Yet</h3>
                                <p className="text-muted-foreground mb-4">Create your first offer to get started.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        offers.map(renderOfferCard)
                    )}
                </TabsContent>

                {/* Pending Approval Tab */}
                <TabsContent value="pending" className="space-y-4">
                    {offers.filter(o => o.status === "pending_approval").map(renderOfferCard)}
                    {offers.filter(o => o.status === "pending_approval").length === 0 && (
                        <Card><CardContent className="p-8 text-center text-muted-foreground">No offers pending approval.</CardContent></Card>
                    )}
                </TabsContent>

                {/* Awaiting Response Tab */}
                <TabsContent value="sent" className="space-y-4">
                    {offers.filter(o => o.status === "sent").map(offer => (
                        <Card key={offer._id}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Avatar>
                                            <AvatarFallback>{offer.candidateName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h3 className="font-semibold">{offer.candidateName}</h3>
                                            <p className="text-sm text-muted-foreground">{offer.role}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground">Expires</p>
                                            <p className="font-medium text-orange-600">{offer.expiresAt || "N/A"}</p>
                                        </div>
                                        <Button variant="outline" size="sm" className="gap-2" onClick={() => handleSendReminder(offer)} disabled={isSending === offer._id}>
                                            {isSending === offer._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                            Send Reminder
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => handleMarkResponse(offer._id, "accepted")}>
                                            <CheckCircle2 className="h-4 w-4 mr-1" /> Accepted
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {offers.filter(o => o.status === "sent").length === 0 && (
                        <Card><CardContent className="p-8 text-center text-muted-foreground">No offers awaiting response.</CardContent></Card>
                    )}
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{analytics?.acceptanceRate || 0}%</p>
                                        <p className="text-sm text-muted-foreground">Acceptance Rate</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <DollarSign className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">${((analytics?.avgSalary || 0) / 1000).toFixed(0)}k</p>
                                        <p className="text-sm text-muted-foreground">Avg. Salary Offered</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <FileSignature className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{analytics?.thisQuarter || 0}</p>
                                        <p className="text-sm text-muted-foreground">Offers This Quarter</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 rounded-lg">
                                        <RotateCcw className="h-5 w-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{analytics?.pending || 0}</p>
                                        <p className="text-sm text-muted-foreground">Pending Responses</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                <CardTitle>Offer Summary</CardTitle>
                            </div>
                            <CardDescription>Overview of all offers</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                                <div className="p-4 bg-muted rounded-lg">
                                    <p className="text-2xl font-bold">{analytics?.total || 0}</p>
                                    <p className="text-sm text-muted-foreground">Total Offers</p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg">
                                    <p className="text-2xl font-bold text-green-600">{analytics?.accepted || 0}</p>
                                    <p className="text-sm text-muted-foreground">Accepted</p>
                                </div>
                                <div className="p-4 bg-red-50 rounded-lg">
                                    <p className="text-2xl font-bold text-red-600">{analytics?.declined || 0}</p>
                                    <p className="text-sm text-muted-foreground">Declined</p>
                                </div>
                                <div className="p-4 bg-yellow-50 rounded-lg">
                                    <p className="text-2xl font-bold text-yellow-600">{analytics?.pending || 0}</p>
                                    <p className="text-sm text-muted-foreground">Pending</p>
                                </div>
                                <div className="p-4 bg-orange-50 rounded-lg">
                                    <p className="text-2xl font-bold text-orange-600">{analytics?.negotiating || 0}</p>
                                    <p className="text-sm text-muted-foreground">Negotiating</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </Layout>
    );
}
