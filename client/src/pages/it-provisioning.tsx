/**
 * IT Provisioning Page - FULLY FUNCTIONAL
 * ITSM integration for new hire equipment, accounts, and access provisioning
 */
import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Laptop, Monitor, Key, Shield, Mail, MessageSquare, GitBranch,
    CheckCircle2, Clock, AlertCircle, Plus, Search, Users, RefreshCw,
    Package, HardDrive, Loader2, Zap, Edit, Trash2, Settings, ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Interfaces
interface AssetRequest {
    _id: string;
    candidateId: string;
    candidateName: string;
    candidateEmail: string;
    role: string;
    department: string;
    startDate: string;
    laptop: { status: string };
    monitor: { status: string };
    email: { status: string };
    slack: { status: string };
    github: { status: string };
    vpn: { status: string };
    badge: { status: string };
    overallProgress: number;
    completedAt?: string;
}

interface Template {
    _id: string;
    name: string;
    description?: string;
    items: string[];
    estimatedDays: string;
    department?: string;
    isDefault?: boolean;
}

interface InventoryItem {
    _id: string;
    name: string;
    category: string;
    stock: number;
    minStock: number;
    status: string;
    location?: string;
    unitCost?: number;
}

interface ITSMIntegration {
    _id: string;
    name: string;
    provider: string;
    status: "connected" | "pending" | "disconnected" | "error";
    icon: string;
    config?: { apiKey?: string; clientId?: string; baseUrl?: string };
    connectedAt?: string;
}

const provisioningItems = [
    { key: "laptop", label: "Laptop", icon: Laptop },
    { key: "email", label: "Email", icon: Mail },
    { key: "slack", label: "Slack", icon: MessageSquare },
    { key: "github", label: "GitHub", icon: GitBranch },
    { key: "vpn", label: "VPN", icon: Shield },
    { key: "badge", label: "Badge", icon: Key }
];

const categoryIcons: Record<string, any> = { laptop: Laptop, monitor: Monitor, peripheral: HardDrive, badge: Key, other: Package };

export default function ITProvisioning() {
    const [searchQuery, setSearchQuery] = useState("");
    const [requests, setRequests] = useState<AssetRequest[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [itsmIntegrations, setItsmIntegrations] = useState<ITSMIntegration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dialog states
    const [newRequestOpen, setNewRequestOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<AssetRequest | null>(null);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
    const [itsmConfigOpen, setItsmConfigOpen] = useState(false);
    const [selectedItsm, setSelectedItsm] = useState<ITSMIntegration | null>(null);
    const [itsmConfig, setItsmConfig] = useState({ apiKey: "", clientId: "", baseUrl: "" });

    // Forms
    const [newRequest, setNewRequest] = useState({ candidateName: "", candidateEmail: "", role: "", department: "", startDate: "" });
    const [newTemplate, setNewTemplate] = useState({ name: "", items: "", estimatedDays: "3-5 days", department: "" });
    const [newInventory, setNewInventory] = useState({ name: "", category: "laptop", stock: 10, minStock: 5, location: "" });

    const { toast } = useToast();
    const token = localStorage.getItem("token");

    useEffect(() => {
        fetchAll();
    }, []);

    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchAll = async () => {
        setIsLoading(true);
        setIsRefreshing(true);
        try {
            await Promise.all([fetchRequests(), fetchTemplates(), fetchInventory(), fetchItsm()]);
            toast({ title: "✅ Refreshed", description: "All data reloaded" });
        } catch (e) {
            toast({ title: "Error", description: "Failed to refresh", variant: "destructive" });
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const fetchRequests = async () => {
        try {
            const res = await fetch("/api/provisioning/requests", { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setRequests(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchTemplates = async () => {
        try {
            const res = await fetch("/api/provisioning/templates", { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setTemplates(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchInventory = async () => {
        try {
            const res = await fetch("/api/inventory", { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setInventory(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchItsm = async () => {
        try {
            const res = await fetch("/api/itsm/integrations", { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setItsmIntegrations(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleCreateRequest = async () => {
        if (!newRequest.candidateName || !newRequest.candidateEmail) {
            toast({ title: "Error", description: "Name and email required", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/provisioning/requests", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(newRequest)
            });
            if (res.ok) {
                const created = await res.json();
                setRequests(prev => [...prev, created]);
                setNewRequestOpen(false);
                setNewRequest({ candidateName: "", candidateEmail: "", role: "", department: "", startDate: "" });
                toast({ title: "✅ Request Created", description: `Provisioning started for ${created.candidateName}` });
            }
        } catch (e) { toast({ title: "Error", description: "Failed to create", variant: "destructive" }); }
        finally { setIsSubmitting(false); }
    };

    const handleCreateTemplate = async () => {
        if (!newTemplate.name) return;
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/provisioning/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ...newTemplate, items: newTemplate.items.split(",").map(s => s.trim()) })
            });
            if (res.ok) {
                const created = await res.json();
                setTemplates(prev => [...prev, created]);
                setTemplateDialogOpen(false);
                setNewTemplate({ name: "", items: "", estimatedDays: "3-5 days", department: "" });
                toast({ title: "✅ Template Created" });
            }
        } catch (e) { toast({ title: "Error", variant: "destructive" }); }
        finally { setIsSubmitting(false); }
    };

    const handleDeleteTemplate = async (id: string) => {
        try {
            await fetch(`/api/provisioning/templates/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
            setTemplates(prev => prev.filter(t => t._id !== id));
            toast({ title: "Deleted" });
        } catch (e) { toast({ title: "Error", variant: "destructive" }); }
    };

    const handleCreateInventory = async () => {
        if (!newInventory.name) return;
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/inventory", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(newInventory)
            });
            if (res.ok) {
                const created = await res.json();
                setInventory(prev => [...prev, created]);
                setInventoryDialogOpen(false);
                setNewInventory({ name: "", category: "laptop", stock: 10, minStock: 5, location: "" });
                toast({ title: "✅ Item Added" });
            }
        } catch (e) { toast({ title: "Error", variant: "destructive" }); }
        finally { setIsSubmitting(false); }
    };

    const handleUpdateStock = async (id: string, delta: number) => {
        const item = inventory.find(i => i._id === id);
        if (!item) return;
        const newStock = Math.max(0, item.stock + delta);
        try {
            const res = await fetch(`/api/inventory/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ stock: newStock })
            });
            if (res.ok) {
                const updated = await res.json();
                setInventory(prev => prev.map(i => i._id === id ? updated : i));
            }
        } catch (e) { console.error(e); }
    };

    const handleItsmConnect = async () => {
        if (!selectedItsm) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/itsm/integrations/${selectedItsm._id}/connect`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ config: itsmConfig })
            });
            if (res.ok) {
                const { integration } = await res.json();
                setItsmIntegrations(prev => prev.map(i => i._id === integration._id ? integration : i));
                setItsmConfigOpen(false);
                toast({ title: "✅ Connected", description: `${integration.name} connected` });
            }
        } catch (e) { toast({ title: "Error", variant: "destructive" }); }
        finally { setIsSubmitting(false); }
    };

    const handleItsmDisconnect = async (itsm: ITSMIntegration) => {
        try {
            const res = await fetch(`/api/itsm/integrations/${itsm._id}/disconnect`, {
                method: "POST", headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const { integration } = await res.json();
                setItsmIntegrations(prev => prev.map(i => i._id === integration._id ? integration : i));
                toast({ title: "Disconnected" });
            }
        } catch (e) { toast({ title: "Error", variant: "destructive" }); }
    };

    const handleUpdateItem = async (requestId: string, item: string, status: string) => {
        try {
            const res = await fetch(`/api/provisioning/requests/${requestId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ item, status })
            });
            if (res.ok) {
                const updated = await res.json();
                setRequests(prev => prev.map(r => r._id === requestId ? updated : r));
                if (selectedRequest?._id === requestId) setSelectedRequest(updated);
                toast({ title: "✅ Updated" });
            }
        } catch (e) { toast({ title: "Error", variant: "destructive" }); }
    };

    const handleAutoProvision = async (requestId: string) => {
        setIsSubmitting(true);
        try {
            await fetch(`/api/provisioning/requests/${requestId}/auto`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
            toast({ title: "🚀 Auto-Provisioning Started" });
            setTimeout(fetchRequests, 1000);
        } catch (e) { toast({ title: "Error", variant: "destructive" }); }
        finally { setIsSubmitting(false); }
    };

    const getStatusIcon = (status: string) => {
        if (["completed", "delivered", "active", "issued", "configured", "setup", "created"].includes(status)) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        if (["ordered", "in-progress", "invited", "printed"].includes(status)) return <Clock className="h-4 w-4 text-yellow-500" />;
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    };

    const getStatusBadgeColor = (status: string) => {
        if (["completed", "delivered", "active", "issued", "configured", "setup", "created"].includes(status)) return "bg-green-100 text-green-700";
        if (["ordered", "in-progress", "invited", "printed"].includes(status)) return "bg-yellow-100 text-yellow-700";
        return "bg-gray-100 text-gray-600";
    };

    const getInitials = (name: string) => name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "NH";

    const pendingSetups = requests.filter(r => r.overallProgress < 100).length;
    const completedThisWeek = requests.filter(r => r.completedAt && new Date(r.completedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
    const avgProgress = requests.length > 0 ? Math.round(requests.reduce((acc, r) => acc + (r.overallProgress || 0), 0) / requests.length) : 0;
    const filteredRequests = requests.filter(r => r.candidateName?.toLowerCase().includes(searchQuery.toLowerCase()) || r.role?.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <Layout title="IT Provisioning">
            <Tabs defaultValue="queue" className="space-y-6">
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="queue">Provisioning Queue</TabsTrigger>
                        <TabsTrigger value="templates">Templates</TabsTrigger>
                        <TabsTrigger value="inventory">Inventory</TabsTrigger>
                        <TabsTrigger value="integrations">ITSM Integrations</TabsTrigger>
                    </TabsList>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 w-64" />
                        </div>
                        <Button variant="outline" onClick={fetchAll} disabled={isRefreshing}>{isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}Refresh</Button>
                        <Button onClick={() => setNewRequestOpen(true)}><Plus className="h-4 w-4 mr-2" />New Request</Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                    <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-blue-100 rounded-lg"><Users className="h-6 w-6 text-blue-600" /></div><div><p className="text-2xl font-bold">{pendingSetups}</p><p className="text-sm text-muted-foreground">Pending</p></div></div></CardContent></Card>
                    <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-green-100 rounded-lg"><CheckCircle2 className="h-6 w-6 text-green-600" /></div><div><p className="text-2xl font-bold">{completedThisWeek}</p><p className="text-sm text-muted-foreground">Completed</p></div></div></CardContent></Card>
                    <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-yellow-100 rounded-lg"><Clock className="h-6 w-6 text-yellow-600" /></div><div><p className="text-2xl font-bold">{avgProgress}%</p><p className="text-sm text-muted-foreground">Avg Progress</p></div></div></CardContent></Card>
                    <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-purple-100 rounded-lg"><Package className="h-6 w-6 text-purple-600" /></div><div><p className="text-2xl font-bold">{requests.length}</p><p className="text-sm text-muted-foreground">Total</p></div></div></CardContent></Card>
                </div>

                {/* Queue Tab */}
                <TabsContent value="queue" className="space-y-6">
                    {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div> : filteredRequests.length === 0 ? (
                        <Card><CardContent className="py-12 text-center"><Package className="h-12 w-12 mx-auto mb-4 opacity-50" /><p className="text-muted-foreground">No requests</p><Button className="mt-4" onClick={() => setNewRequestOpen(true)}>Create Request</Button></CardContent></Card>
                    ) : filteredRequests.map(r => (
                        <Card key={r._id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Avatar><AvatarFallback className="bg-primary/10 text-primary font-bold">{getInitials(r.candidateName)}</AvatarFallback></Avatar>
                                        <div><CardTitle className="text-lg">{r.candidateName}</CardTitle><CardDescription>{r.role} • {r.department}</CardDescription></div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right"><p className="text-2xl font-bold text-primary">{r.overallProgress || 0}%</p><p className="text-xs text-muted-foreground">Progress</p></div>
                                        <Button onClick={() => handleAutoProvision(r._id)} disabled={isSubmitting || r.overallProgress === 100}><Zap className="h-4 w-4 mr-2" />Auto-Provision</Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Progress value={r.overallProgress || 0} className="h-2 mb-4" />
                                <div className="grid grid-cols-6 gap-4">
                                    {provisioningItems.map(item => {
                                        const data = r[item.key as keyof AssetRequest] as { status: string } | undefined;
                                        const status = data?.status || "pending";
                                        const isComplete = ["completed", "delivered", "active", "issued", "configured"].includes(status);
                                        const isProgress = ["ordered", "in-progress", "invited"].includes(status);
                                        return (
                                            <div key={item.key} className={`p-4 border rounded-lg text-center cursor-pointer hover:shadow-md ${isComplete ? 'bg-green-50 border-green-200' : isProgress ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50'}`} onClick={() => { setSelectedRequest(r); setDetailsOpen(true); }}>
                                                <item.icon className={`h-6 w-6 mx-auto mb-2 ${isComplete ? 'text-green-600' : isProgress ? 'text-yellow-600' : 'text-gray-400'}`} />
                                                <p className="text-xs font-medium">{item.label}</p>
                                                <div className="flex justify-center mt-1">{getStatusIcon(status)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>

                {/* Templates Tab */}
                <TabsContent value="templates" className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Provisioning Templates</h3>
                        <Button onClick={() => setTemplateDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Template</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {templates.map(t => (
                            <Card key={t._id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div><CardTitle className="text-lg">{t.name}</CardTitle><CardDescription>Est. {t.estimatedDays}</CardDescription></div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(t._id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2 mb-4">{t.items.map((item, j) => <Badge key={j} variant="outline">{item}</Badge>)}</div>
                                    <Button size="sm" onClick={() => { setNewRequest(prev => ({ ...prev, role: t.name })); setNewRequestOpen(true); }}>Use Template</Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* Inventory Tab */}
                <TabsContent value="inventory" className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">IT Inventory</h3>
                        <Button onClick={() => setInventoryDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {inventory.map(item => {
                            const Icon = categoryIcons[item.category] || Package;
                            return (
                                <Card key={item._id}>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-muted rounded-lg"><Icon className="h-5 w-5" /></div>
                                                <div><p className="font-medium">{item.name}</p><p className="text-sm text-muted-foreground">{item.location || "Main Office"}</p></div>
                                            </div>
                                            <Badge className={item.status === "Low Stock" ? "bg-yellow-100 text-yellow-700" : item.status === "Out of Stock" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>{item.status}</Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleUpdateStock(item._id, -1)}>-</Button>
                                                <span className="font-bold text-xl w-12 text-center">{item.stock}</span>
                                                <Button variant="outline" size="sm" onClick={() => handleUpdateStock(item._id, 1)}>+</Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Min: {item.minStock}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                {/* ITSM Integrations Tab */}
                <TabsContent value="integrations" className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />ITSM Integrations</CardTitle><CardDescription>Connect IT service management tools for automated provisioning</CardDescription></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                {itsmIntegrations.map(itsm => (
                                    <div key={itsm._id} className={`p-4 border rounded-lg ${itsm.status === "connected" ? "border-green-200 bg-green-50/50" : ""}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <span className="text-3xl">{itsm.icon}</span>
                                                <div>
                                                    <p className="font-semibold">{itsm.name}</p>
                                                    <Badge className={itsm.status === "connected" ? "bg-green-100 text-green-700" : itsm.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}>{itsm.status}</Badge>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {itsm.status === "connected" ? (
                                                    <>
                                                        <Button variant="outline" size="sm" onClick={() => { setSelectedItsm(itsm); setItsmConfig({ apiKey: itsm.config?.apiKey || "", clientId: itsm.config?.clientId || "", baseUrl: itsm.config?.baseUrl || "" }); setItsmConfigOpen(true); }}>Configure</Button>
                                                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleItsmDisconnect(itsm)}>Disconnect</Button>
                                                    </>
                                                ) : (
                                                    <Button onClick={() => { setSelectedItsm(itsm); setItsmConfig({ apiKey: "", clientId: "", baseUrl: "" }); setItsmConfigOpen(true); }}>Connect</Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* New Request Dialog */}
            <Dialog open={newRequestOpen} onOpenChange={setNewRequestOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>New Provisioning Request</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div><Label>Name *</Label><Input value={newRequest.candidateName} onChange={(e) => setNewRequest(prev => ({ ...prev, candidateName: e.target.value }))} placeholder="John Doe" /></div>
                        <div><Label>Email *</Label><Input type="email" value={newRequest.candidateEmail} onChange={(e) => setNewRequest(prev => ({ ...prev, candidateEmail: e.target.value }))} placeholder="john@company.com" /></div>
                        <div className="grid grid-cols-2 gap-4"><div><Label>Role</Label><Input value={newRequest.role} onChange={(e) => setNewRequest(prev => ({ ...prev, role: e.target.value }))} /></div><div><Label>Department</Label><Input value={newRequest.department} onChange={(e) => setNewRequest(prev => ({ ...prev, department: e.target.value }))} /></div></div>
                        <div><Label>Start Date</Label><Input type="date" value={newRequest.startDate} onChange={(e) => setNewRequest(prev => ({ ...prev, startDate: e.target.value }))} /></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setNewRequestOpen(false)}>Cancel</Button><Button onClick={handleCreateRequest} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Create</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Details Dialog */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Provisioning - {selectedRequest?.candidateName}</DialogTitle></DialogHeader>
                    {selectedRequest && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-lg"><div className="flex justify-between mb-2"><span>Progress</span><span className="font-bold">{selectedRequest.overallProgress || 0}%</span></div><Progress value={selectedRequest.overallProgress || 0} className="h-3" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                {provisioningItems.map(item => {
                                    const data = selectedRequest[item.key as keyof AssetRequest] as { status: string } | undefined;
                                    const status = data?.status || "pending";
                                    return (
                                        <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center gap-3">{getStatusIcon(status)}<div><p className="font-medium">{item.label}</p><Badge className={getStatusBadgeColor(status)}>{status}</Badge></div></div>
                                            <Select value={status} onValueChange={(v) => handleUpdateItem(selectedRequest._id, item.key, v)}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="ordered">Ordered</SelectItem><SelectItem value="in-progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <DialogFooter><Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Template Dialog */}
            <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>New Template</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div><Label>Name *</Label><Input value={newTemplate.name} onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))} placeholder="Engineering - Frontend" /></div>
                        <div><Label>Items (comma-separated)</Label><Textarea value={newTemplate.items} onChange={(e) => setNewTemplate(prev => ({ ...prev, items: e.target.value }))} placeholder="MacBook Pro, Monitor, GitHub, Slack" /></div>
                        <div className="grid grid-cols-2 gap-4"><div><Label>Est. Time</Label><Input value={newTemplate.estimatedDays} onChange={(e) => setNewTemplate(prev => ({ ...prev, estimatedDays: e.target.value }))} /></div><div><Label>Department</Label><Input value={newTemplate.department} onChange={(e) => setNewTemplate(prev => ({ ...prev, department: e.target.value }))} /></div></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button><Button onClick={handleCreateTemplate} disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Inventory Dialog */}
            <Dialog open={inventoryDialogOpen} onOpenChange={setInventoryDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div><Label>Name *</Label><Input value={newInventory.name} onChange={(e) => setNewInventory(prev => ({ ...prev, name: e.target.value }))} placeholder="Dell Monitor 27 inch" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Category</Label><Select value={newInventory.category} onValueChange={(v) => setNewInventory(prev => ({ ...prev, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="laptop">Laptop</SelectItem><SelectItem value="monitor">Monitor</SelectItem><SelectItem value="peripheral">Peripheral</SelectItem><SelectItem value="badge">Badge</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                            <div><Label>Location</Label><Input value={newInventory.location} onChange={(e) => setNewInventory(prev => ({ ...prev, location: e.target.value }))} placeholder="Main Office" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4"><div><Label>Stock</Label><Input type="number" value={newInventory.stock} onChange={(e) => setNewInventory(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))} /></div><div><Label>Min Stock</Label><Input type="number" value={newInventory.minStock} onChange={(e) => setNewInventory(prev => ({ ...prev, minStock: parseInt(e.target.value) || 5 }))} /></div></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setInventoryDialogOpen(false)}>Cancel</Button><Button onClick={handleCreateInventory} disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Add</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ITSM Config Dialog */}
            <Dialog open={itsmConfigOpen} onOpenChange={setItsmConfigOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{selectedItsm?.status === "connected" ? "Configure" : "Connect"} {selectedItsm?.name}</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div><Label>API Key</Label><Input type="password" value={itsmConfig.apiKey} onChange={(e) => setItsmConfig(prev => ({ ...prev, apiKey: e.target.value }))} placeholder="Enter API key..." /></div>
                        <div><Label>Client ID</Label><Input value={itsmConfig.clientId} onChange={(e) => setItsmConfig(prev => ({ ...prev, clientId: e.target.value }))} placeholder="Enter client ID..." /></div>
                        <div><Label>Base URL</Label><Input value={itsmConfig.baseUrl} onChange={(e) => setItsmConfig(prev => ({ ...prev, baseUrl: e.target.value }))} placeholder="https://api.example.com" /></div>
                        <div className="p-3 bg-muted rounded-lg text-sm"><p className="font-medium">Provider: {selectedItsm?.provider}</p><p className="text-xs text-muted-foreground">Enter credentials to enable automated provisioning</p></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setItsmConfigOpen(false)}>Cancel</Button><Button onClick={handleItsmConnect} disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{selectedItsm?.status === "connected" ? "Update" : "Connect"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
