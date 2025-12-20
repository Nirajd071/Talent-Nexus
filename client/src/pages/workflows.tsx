/**
 * Workflow Automation Page
 * Create and manage automated workflows
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
    Workflow,
    Plus,
    Zap,
    Play,
    Pause,
    Trash2,
    Edit,
    Clock,
    Mail,
    Bell,
    Tag,
    Send,
    Loader2,
    CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout/Layout";

interface WorkflowItem {
    _id: string;
    name: string;
    description?: string;
    trigger: { event: string; conditions?: any[] };
    actions: { type: string; config: any; order: number }[];
    isActive: boolean;
    timesTriggered: number;
    lastTriggeredAt?: string;
}

const TRIGGER_EVENTS = [
    { value: "application_received", label: "New Application", icon: Mail },
    { value: "status_changed", label: "Status Changed", icon: Zap },
    { value: "interview_scheduled", label: "Interview Scheduled", icon: Clock },
    { value: "interview_completed", label: "Interview Completed", icon: CheckCircle },
    { value: "offer_sent", label: "Offer Sent", icon: Send },
    { value: "offer_accepted", label: "Offer Accepted", icon: CheckCircle },
    { value: "offer_declined", label: "Offer Declined", icon: Pause }
];

const ACTION_TYPES = [
    { value: "send_email", label: "Send Email", icon: Mail },
    { value: "send_notification", label: "Send Notification", icon: Bell },
    { value: "add_tag", label: "Add Tag", icon: Tag },
    { value: "update_status", label: "Update Status", icon: Zap },
    { value: "send_slack", label: "Send to Slack", icon: Send }
];

export default function WorkflowsPage() {
    const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
    const [presets, setPresets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const { toast } = useToast();

    // New workflow form
    const [formName, setFormName] = useState("");
    const [formDesc, setFormDesc] = useState("");
    const [formTrigger, setFormTrigger] = useState("application_received");
    const [formActions, setFormActions] = useState<{ type: string; config: any }[]>([
        { type: "send_notification", config: { message: "New workflow triggered!" } }
    ]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchWorkflows();
        fetchPresets();
    }, []);

    const fetchWorkflows = async () => {
        try {
            const response = await fetch("/api/automation/workflows");
            if (response.ok) {
                const data = await response.json();
                setWorkflows(data);
            }
        } catch (err) {
            console.error("Fetch workflows error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPresets = async () => {
        try {
            const response = await fetch("/api/automation/workflows/presets");
            if (response.ok) {
                const data = await response.json();
                setPresets(data);
            }
        } catch (err) {
            console.error("Fetch presets error:", err);
        }
    };

    const handleToggle = async (id: string) => {
        try {
            const response = await fetch(`/api/automation/workflows/${id}/toggle`, {
                method: "POST"
            });
            if (response.ok) {
                const data = await response.json();
                setWorkflows(prev => prev.map(w =>
                    w._id === id ? { ...w, isActive: data.isActive } : w
                ));
                toast({ title: data.isActive ? "Workflow Activated" : "Workflow Paused" });
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to toggle workflow", variant: "destructive" });
        }
    };

    const handleTrigger = async (id: string) => {
        try {
            const response = await fetch(`/api/automation/workflows/${id}/trigger`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetType: "candidate", targetId: "test" })
            });
            if (response.ok) {
                toast({ title: "Workflow Triggered!", description: "Actions executed successfully" });
                fetchWorkflows();
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to trigger workflow", variant: "destructive" });
        }
    };

    const handleCreate = async () => {
        if (!formName.trim()) return;
        setIsSaving(true);

        try {
            const response = await fetch("/api/automation/workflows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formName,
                    description: formDesc,
                    trigger: { event: formTrigger },
                    actions: formActions.map((a, i) => ({ ...a, order: i }))
                })
            });
            if (response.ok) {
                toast({ title: "Workflow Created!" });
                setCreateOpen(false);
                setFormName("");
                setFormDesc("");
                fetchWorkflows();
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to create workflow", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this workflow?")) return;
        try {
            await fetch(`/api/automation/workflows/${id}`, { method: "DELETE" });
            setWorkflows(prev => prev.filter(w => w._id !== id));
            toast({ title: "Workflow Deleted" });
        } catch (err) {
            toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
        }
    };

    const usePreset = (preset: any) => {
        setFormName(preset.name);
        setFormDesc(preset.description || "");
        setFormTrigger(preset.trigger?.event || "application_received");
        setFormActions(preset.actions || []);
        setCreateOpen(true);
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Workflow className="w-7 h-7 text-primary" />
                            Workflow Automation
                        </h1>
                        <p className="text-muted-foreground">Automate your hiring pipeline</p>
                    </div>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Create Workflow
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Workflows</p>
                                    <p className="text-2xl font-bold">{workflows.length}</p>
                                </div>
                                <Workflow className="w-8 h-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Active</p>
                                    <p className="text-2xl font-bold">{workflows.filter(w => w.isActive).length}</p>
                                </div>
                                <Zap className="w-8 h-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Triggers</p>
                                    <p className="text-2xl font-bold">{workflows.reduce((sum, w) => sum + w.timesTriggered, 0)}</p>
                                </div>
                                <Play className="w-8 h-8 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Presets */}
                {presets.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Quick Start Templates</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2 flex-wrap">
                                {presets.map((preset, i) => (
                                    <Button key={i} variant="outline" size="sm" onClick={() => usePreset(preset)}>
                                        <Plus className="w-3 h-3 mr-1" /> {preset.name}
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Workflows List */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="text-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                        </div>
                    ) : workflows.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Workflow className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">No workflows yet. Create one or use a template!</p>
                            </CardContent>
                        </Card>
                    ) : (
                        workflows.map((workflow) => (
                            <Card key={workflow._id}>
                                <CardContent className="py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <Switch
                                                checked={workflow.isActive}
                                                onCheckedChange={() => handleToggle(workflow._id)}
                                            />
                                            <div>
                                                <div className="font-medium flex items-center gap-2">
                                                    {workflow.name}
                                                    <Badge variant={workflow.isActive ? "default" : "secondary"}>
                                                        {workflow.isActive ? "Active" : "Paused"}
                                                    </Badge>
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    Trigger: {workflow.trigger?.event} → {workflow.actions?.length || 0} actions
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{workflow.timesTriggered} runs</Badge>
                                            <Button variant="ghost" size="sm" onClick={() => handleTrigger(workflow._id)}>
                                                <Play className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(workflow._id)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* Create Dialog */}
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Create Workflow</DialogTitle>
                            <DialogDescription>Set up automated actions for hiring events</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Workflow Name</Label>
                                <Input
                                    placeholder="e.g., Welcome New Applicants"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description (optional)</Label>
                                <Input
                                    placeholder="What this workflow does"
                                    value={formDesc}
                                    onChange={(e) => setFormDesc(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Trigger Event</Label>
                                <select
                                    className="w-full p-2 border rounded-md"
                                    value={formTrigger}
                                    onChange={(e) => setFormTrigger(e.target.value)}
                                >
                                    {TRIGGER_EVENTS.map(e => (
                                        <option key={e.value} value={e.value}>{e.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Actions</Label>
                                {formActions.map((action, i) => (
                                    <div key={i} className="flex gap-2 items-center">
                                        <select
                                            className="flex-1 p-2 border rounded-md"
                                            value={action.type}
                                            onChange={(e) => {
                                                const updated = [...formActions];
                                                updated[i].type = e.target.value;
                                                setFormActions(updated);
                                            }}
                                        >
                                            {ACTION_TYPES.map(t => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setFormActions(prev => prev.filter((_, j) => j !== i))}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFormActions(prev => [...prev, { type: "send_notification", config: {} }])}
                                >
                                    <Plus className="w-4 h-4 mr-1" /> Add Action
                                </Button>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={isSaving || !formName.trim()}>
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Workflow"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout >
    );
}
