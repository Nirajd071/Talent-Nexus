/**
 * Tags Management Page
 * Manage candidate tags for organization
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Tags,
    Plus,
    Trash2,
    Edit,
    Loader2,
    Palette
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout/Layout";

interface TagItem {
    _id: string;
    name: string;
    color: string;
    category?: string;
    usageCount: number;
}

const TAG_COLORS = [
    "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
    "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280", "#0ea5e9"
];

export default function TagsPage() {
    const [tags, setTags] = useState<TagItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const { toast } = useToast();

    // Form
    const [formName, setFormName] = useState("");
    const [formColor, setFormColor] = useState(TAG_COLORS[0]);
    const [formCategory, setFormCategory] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchTags();
    }, []);

    const fetchTags = async () => {
        try {
            const response = await fetch("/api/automation/tags");
            if (response.ok) {
                const data = await response.json();
                setTags(data);
            }
        } catch (err) {
            console.error("Fetch tags error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formName.trim()) return;
        setIsSaving(true);

        try {
            const response = await fetch("/api/automation/tags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formName,
                    color: formColor,
                    category: formCategory || undefined
                })
            });
            if (response.ok) {
                const newTag = await response.json();
                setTags(prev => [...prev, newTag]);
                toast({ title: "Tag Created!" });
                setCreateOpen(false);
                setFormName("");
                setFormCategory("");
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to create tag", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this tag?")) return;
        try {
            await fetch(`/api/automation/tags/${id}`, { method: "DELETE" });
            setTags(prev => prev.filter(t => t._id !== id));
            toast({ title: "Tag Deleted" });
        } catch (err) {
            toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
        }
    };

    // Group by category
    const grouped = tags.reduce((acc, tag) => {
        const cat = tag.category || "Uncategorized";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(tag);
        return acc;
    }, {} as Record<string, TagItem[]>);

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Tags className="w-7 h-7 text-primary" />
                            Tag Management
                        </h1>
                        <p className="text-muted-foreground">Organize candidates with custom tags</p>
                    </div>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Create Tag
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold">{tags.length}</p>
                                <p className="text-sm text-muted-foreground">Total Tags</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold">{Object.keys(grouped).length}</p>
                                <p className="text-sm text-muted-foreground">Categories</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold">{tags.reduce((sum, t) => sum + t.usageCount, 0)}</p>
                                <p className="text-sm text-muted-foreground">Total Uses</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tags List */}
                {isLoading ? (
                    <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                    </div>
                ) : tags.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Tags className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No tags yet. Create your first tag!</p>
                        </CardContent>
                    </Card>
                ) : (
                    Object.entries(grouped).map(([category, categoryTags]) => (
                        <Card key={category}>
                            <CardHeader>
                                <CardTitle className="text-lg">{category}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {categoryTags.map((tag) => (
                                        <div
                                            key={tag._id}
                                            className="flex items-center gap-2 px-3 py-2 rounded-full border group"
                                            style={{ borderColor: tag.color }}
                                        >
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            <span className="font-medium">{tag.name}</span>
                                            <Badge variant="secondary" className="text-xs">{tag.usageCount}</Badge>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                                                onClick={() => handleDelete(tag._id)}
                                            >
                                                <Trash2 className="w-3 h-3 text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}

                {/* Create Dialog */}
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Tag</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Tag Name</Label>
                                <Input
                                    placeholder="e.g., High Priority"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Category (optional)</Label>
                                <Input
                                    placeholder="e.g., Priority, Skills, Status"
                                    value={formCategory}
                                    onChange={(e) => setFormCategory(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Color</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {TAG_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            className={`w-8 h-8 rounded-full transition-transform ${formColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setFormColor(color)}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="p-3 bg-muted rounded-lg">
                                <Label className="text-xs text-muted-foreground">Preview</Label>
                                <div className="flex items-center gap-2 mt-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: formColor }}
                                    />
                                    <span className="font-medium">{formName || "Tag Name"}</span>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={isSaving || !formName.trim()}>
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Tag"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
