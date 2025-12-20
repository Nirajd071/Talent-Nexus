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
    Mail,
    Plus,
    Send,
    FileText,
    Users,
    BarChart3,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    Sparkles,
    Trash2
} from "lucide-react";

interface Template {
    _id: string;
    name: string;
    subject: string;
    body: string;
    category: string;
    variables: string[];
    usageCount: number;
}

interface Campaign {
    _id: string;
    name: string;
    status: string;
    stats: {
        total: number;
        sent: number;
        failed: number;
    };
    createdAt: string;
}

export default function EmailCampaigns() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [campaignModalOpen, setCampaignModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const [newTemplate, setNewTemplate] = useState({
        name: "",
        subject: "",
        body: "",
        category: "outreach"
    });

    const [newCampaign, setNewCampaign] = useState({
        name: "",
        templateId: "",
        subject: "",
        body: "",
        recipientEmails: ""
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [templatesRes, campaignsRes, statsRes] = await Promise.all([
                fetch("/api/emails/templates", { headers }),
                fetch("/api/emails/campaigns", { headers }),
                fetch("/api/emails/stats", { headers })
            ]);

            if (templatesRes.ok) setTemplates(await templatesRes.json());
            if (campaignsRes.ok) setCampaigns(await campaignsRes.json());
            if (statsRes.ok) setStats(await statsRes.json());
        } catch (error) {
            console.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTemplate = async () => {
        if (!newTemplate.name || !newTemplate.subject) {
            toast({ title: "Error", description: "Name and subject are required", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/emails/templates", {
                method: "POST",
                headers,
                body: JSON.stringify(newTemplate)
            });

            if (res.ok) {
                toast({ title: "Template Created! ✨" });
                setTemplateModalOpen(false);
                setNewTemplate({ name: "", subject: "", body: "", category: "outreach" });
                fetchData();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to create template", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateCampaign = async () => {
        if (!newCampaign.name || !newCampaign.recipientEmails) {
            toast({ title: "Error", description: "Name and recipients are required", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const emails = newCampaign.recipientEmails.split(",").map(e => e.trim()).filter(Boolean);

            const res = await fetch("/api/emails/campaigns", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    ...newCampaign,
                    recipientEmails: emails
                })
            });

            if (res.ok) {
                toast({ title: "Campaign Created! 🚀" });
                setCampaignModalOpen(false);
                setNewCampaign({ name: "", templateId: "", subject: "", body: "", recipientEmails: "" });
                fetchData();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to create campaign", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSendCampaign = async (campaignId: string) => {
        try {
            const res = await fetch(`/api/emails/campaigns/${campaignId}/send`, {
                method: "POST",
                headers
            });

            if (res.ok) {
                toast({ title: "Campaign sending started! 📧" });
                fetchData();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to send campaign", variant: "destructive" });
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            draft: "bg-gray-100 text-gray-700",
            sending: "bg-blue-100 text-blue-700",
            completed: "bg-green-100 text-green-700",
            failed: "bg-red-100 text-red-700"
        };
        return <Badge className={styles[status] || "bg-gray-100"}>{status}</Badge>;
    };

    return (
        <Layout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Email Campaigns</h1>
                        <p className="text-muted-foreground">Create templates and send bulk emails to candidates</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setTemplateModalOpen(true)}>
                            <FileText className="h-4 w-4 mr-2" />
                            New Template
                        </Button>
                        <Button onClick={() => setCampaignModalOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Campaign
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <FileText className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stats?.templates || 0}</p>
                                    <p className="text-sm text-muted-foreground">Templates</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <Mail className="h-6 w-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stats?.campaigns || 0}</p>
                                    <p className="text-sm text-muted-foreground">Campaigns</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <Send className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stats?.totalEmailsSent || 0}</p>
                                    <p className="text-sm text-muted-foreground">Emails Sent</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-100 rounded-lg">
                                    <CheckCircle className="h-6 w-6 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stats?.completedCampaigns || 0}</p>
                                    <p className="text-sm text-muted-foreground">Completed</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="campaigns" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                        <TabsTrigger value="templates">Templates</TabsTrigger>
                    </TabsList>

                    <TabsContent value="campaigns">
                        <Card>
                            <CardHeader>
                                <CardTitle>Email Campaigns</CardTitle>
                                <CardDescription>Manage your bulk email campaigns</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin" />
                                    </div>
                                ) : campaigns.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>No campaigns yet</p>
                                        <Button variant="link" onClick={() => setCampaignModalOpen(true)}>
                                            Create your first campaign
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {campaigns.map(campaign => (
                                            <div key={campaign._id} className="flex items-center justify-between p-4 border rounded-lg">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-muted rounded-lg">
                                                        <Mail className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{campaign.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {campaign.stats?.total || 0} recipients
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {getStatusBadge(campaign.status)}
                                                    <div className="text-sm text-muted-foreground">
                                                        {campaign.stats?.sent || 0} sent
                                                    </div>
                                                    {campaign.status === "draft" && (
                                                        <Button size="sm" onClick={() => handleSendCampaign(campaign._id)}>
                                                            <Send className="h-4 w-4 mr-1" /> Send
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="templates">
                        <Card>
                            <CardHeader>
                                <CardTitle>Email Templates</CardTitle>
                                <CardDescription>Reusable email templates with variable support</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {templates.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>No templates yet</p>
                                        <Button variant="link" onClick={() => setTemplateModalOpen(true)}>
                                            Create your first template
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {templates.map(template => (
                                            <Card key={template._id} className="hover:shadow-md transition-shadow">
                                                <CardContent className="pt-6">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <h3 className="font-semibold">{template.name}</h3>
                                                        <Badge variant="outline">{template.category}</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-2">{template.subject}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Used {template.usageCount} times
                                                    </p>
                                                    {template.variables.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {template.variables.map(v => (
                                                                <Badge key={v} variant="secondary" className="text-xs">
                                                                    {`{{${v}}}`}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Create Template Modal */}
                <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Create Email Template</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label>Template Name</Label>
                                <Input
                                    value={newTemplate.name}
                                    onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                                    placeholder="e.g., Initial Outreach"
                                />
                            </div>
                            <div>
                                <Label>Category</Label>
                                <Select
                                    value={newTemplate.category}
                                    onValueChange={v => setNewTemplate({ ...newTemplate, category: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="outreach">Outreach</SelectItem>
                                        <SelectItem value="follow_up">Follow Up</SelectItem>
                                        <SelectItem value="interview">Interview</SelectItem>
                                        <SelectItem value="offer">Offer</SelectItem>
                                        <SelectItem value="rejection">Rejection</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Subject Line</Label>
                                <Input
                                    value={newTemplate.subject}
                                    onChange={e => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                                    placeholder="Hi {{candidateName}}, exciting opportunity!"
                                />
                            </div>
                            <div>
                                <Label>Body (use {"{{variableName}}"} for variables)</Label>
                                <Textarea
                                    value={newTemplate.body}
                                    onChange={e => setNewTemplate({ ...newTemplate, body: e.target.value })}
                                    rows={6}
                                    placeholder="Dear {{candidateName}},\n\nWe found your profile..."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setTemplateModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateTemplate} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Template"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Create Campaign Modal */}
                <Dialog open={campaignModalOpen} onOpenChange={setCampaignModalOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Create Email Campaign</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label>Campaign Name</Label>
                                <Input
                                    value={newCampaign.name}
                                    onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                    placeholder="e.g., Q4 Developer Outreach"
                                />
                            </div>
                            <div>
                                <Label>Subject</Label>
                                <Input
                                    value={newCampaign.subject}
                                    onChange={e => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                                    placeholder="Email subject line"
                                />
                            </div>
                            <div>
                                <Label>Body</Label>
                                <Textarea
                                    value={newCampaign.body}
                                    onChange={e => setNewCampaign({ ...newCampaign, body: e.target.value })}
                                    rows={4}
                                    placeholder="Email content..."
                                />
                            </div>
                            <div>
                                <Label>Recipients (comma-separated emails)</Label>
                                <Textarea
                                    value={newCampaign.recipientEmails}
                                    onChange={e => setNewCampaign({ ...newCampaign, recipientEmails: e.target.value })}
                                    rows={3}
                                    placeholder="john@example.com, jane@example.com"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCampaignModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateCampaign} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Campaign"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
