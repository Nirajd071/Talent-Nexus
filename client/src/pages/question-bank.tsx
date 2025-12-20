import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Plus, Search, Code, FileText, Brain, Heart, Briefcase,
    Edit, Trash2, Copy, Filter, MoreVertical, ChevronRight,
    CheckCircle, XCircle, Clock, Tag, Zap, Sparkles, Loader2
} from "lucide-react";

interface Question {
    _id: string;
    type: "coding" | "mcq" | "aptitude" | "soft_skills" | "case_study";
    category: string;
    difficulty: "easy" | "medium" | "hard";
    skills: string[];
    title: string;
    description: string;
    points: number;
    timeLimit?: number;
    options?: { text: string; isCorrect: boolean }[];
    testCases?: { input: string; expectedOutput: string; isHidden: boolean }[];
    allowedLanguages?: string[];
    tags: string[];
    isActive: boolean;
    usageCount: number;
    createdAt: string;
}

const questionTypes = [
    { value: "coding", label: "Coding", icon: Code, color: "bg-blue-500" },
    { value: "mcq", label: "MCQ", icon: CheckCircle, color: "bg-green-500" },
    { value: "aptitude", label: "Aptitude", icon: Brain, color: "bg-purple-500" },
    { value: "soft_skills", label: "Soft Skills", icon: Heart, color: "bg-pink-500" },
    { value: "case_study", label: "Case Study", icon: Briefcase, color: "bg-orange-500" },
];

const difficultyColors = {
    easy: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    hard: "bg-red-100 text-red-700",
};

export default function QuestionBank() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [stats, setStats] = useState<any>(null);

    // Form state for creating/editing
    const [formData, setFormData] = useState({
        type: "mcq" as Question["type"],
        category: "",
        difficulty: "medium" as Question["difficulty"],
        skills: [] as string[],
        title: "",
        description: "",
        points: 10,
        timeLimit: 5,
        options: [
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
        ],
        testCases: [{ input: "", expectedOutput: "", isHidden: false }],
        allowedLanguages: ["python", "javascript"],
        codeTemplate: { python: "", javascript: "" },
        expectedAnswer: "",
        evaluationRubric: "",
        tags: [] as string[],
    });
    const [newSkill, setNewSkill] = useState("");
    const [newTag, setNewTag] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    const token = localStorage.getItem("token");

    useEffect(() => {
        fetchQuestions();
        fetchStats();
    }, [activeTab]);

    const fetchQuestions = async () => {
        try {
            const typeFilter = activeTab !== "all" ? `?type=${activeTab}` : "";
            const res = await fetch(`/api/questions${typeFilter}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setQuestions(data);
            }
        } catch (error) {
            console.error("Failed to fetch questions:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch("/api/questions/stats/summary", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Failed to fetch stats:", error);
        }
    };

    const handleCreateQuestion = async () => {
        try {
            const res = await fetch("/api/questions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setShowCreateModal(false);
                resetForm();
                fetchQuestions();
                fetchStats();
            }
        } catch (error) {
            console.error("Failed to create question:", error);
        }
    };

    const handleUpdateQuestion = async () => {
        if (!editingQuestion) return;
        try {
            const res = await fetch(`/api/questions/${editingQuestion._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setEditingQuestion(null);
                setShowCreateModal(false);
                resetForm();
                fetchQuestions();
            }
        } catch (error) {
            console.error("Failed to update question:", error);
        }
    };

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm("Are you sure you want to delete this question?")) return;
        try {
            await fetch(`/api/questions/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchQuestions();
            fetchStats();
        } catch (error) {
            console.error("Failed to delete question:", error);
        }
    };

    const resetForm = () => {
        setFormData({
            type: "mcq",
            category: "",
            difficulty: "medium",
            skills: [],
            title: "",
            description: "",
            points: 10,
            timeLimit: 5,
            options: [
                { text: "", isCorrect: false },
                { text: "", isCorrect: false },
                { text: "", isCorrect: false },
                { text: "", isCorrect: false },
            ],
            testCases: [{ input: "", expectedOutput: "", isHidden: false }],
            allowedLanguages: ["python", "javascript"],
            codeTemplate: { python: "", javascript: "" },
            expectedAnswer: "",
            evaluationRubric: "",
            tags: [],
        });
    };

    const openEditModal = (question: Question) => {
        setEditingQuestion(question);
        setFormData({
            ...formData,
            type: question.type,
            category: question.category || "",
            difficulty: question.difficulty,
            skills: question.skills || [],
            title: question.title,
            description: question.description,
            points: question.points,
            timeLimit: question.timeLimit || 5,
            options: question.options || formData.options,
            testCases: question.testCases || formData.testCases,
            allowedLanguages: question.allowedLanguages || ["python", "javascript"],
            tags: question.tags || [],
        });
        setShowCreateModal(true);
    };

    const addSkill = () => {
        if (newSkill && !formData.skills.includes(newSkill)) {
            setFormData({ ...formData, skills: [...formData.skills, newSkill] });
            setNewSkill("");
        }
    };

    const addTag = () => {
        if (newTag && !formData.tags.includes(newTag)) {
            setFormData({ ...formData, tags: [...formData.tags, newTag] });
            setNewTag("");
        }
    };

    // AI Generate question content
    const handleAIGenerate = async () => {
        if (!formData.title && !formData.category) {
            alert("Please enter a title or category first");
            return;
        }

        setIsGenerating(true);
        try {
            const res = await fetch("/api/questions/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    type: formData.type,
                    title: formData.title,
                    category: formData.category,
                    difficulty: formData.difficulty,
                    skills: formData.skills,
                }),
            });

            if (res.ok) {
                const generated = await res.json();
                setFormData({
                    ...formData,
                    description: generated.description || formData.description,
                    options: generated.options || formData.options,
                    testCases: generated.testCases || formData.testCases,
                    expectedAnswer: generated.expectedAnswer || formData.expectedAnswer,
                    skills: generated.skills?.length ? generated.skills : formData.skills,
                    tags: generated.tags?.length ? generated.tags : formData.tags,
                    points: generated.points || formData.points,
                    timeLimit: generated.timeLimit || formData.timeLimit,
                });
            } else {
                const error = await res.json();
                alert(error.error || "Failed to generate content");
            }
        } catch (error) {
            console.error("AI generate error:", error);
            alert("Failed to generate content. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const filteredQuestions = questions.filter(q =>
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getTypeIcon = (type: string) => {
        const typeConfig = questionTypes.find(t => t.value === type);
        return typeConfig ? typeConfig.icon : FileText;
    };

    const getTypeColor = (type: string) => {
        const typeConfig = questionTypes.find(t => t.value === type);
        return typeConfig ? typeConfig.color : "bg-gray-500";
    };

    return (
        <Layout title="Question Bank">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Question Bank</h1>
                        <p className="text-muted-foreground">Manage assessment questions across all types</p>
                    </div>
                    <Button onClick={() => { resetForm(); setEditingQuestion(null); setShowCreateModal(true); }} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Question
                    </Button>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
                            <CardContent className="pt-4">
                                <div className="text-2xl font-bold">{stats.total || 0}</div>
                                <div className="text-xs text-muted-foreground">Total Questions</div>
                            </CardContent>
                        </Card>
                        {questionTypes.map(type => {
                            const count = stats.byType?.find((t: any) => t._id === type.value)?.count || 0;
                            return (
                                <Card key={type.value} className="bg-gradient-to-br from-slate-50 to-slate-100">
                                    <CardContent className="pt-4 flex items-center gap-2">
                                        <div className={`p-2 rounded-lg ${type.color} text-white`}>
                                            <type.icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="text-xl font-bold">{count}</div>
                                            <div className="text-xs text-muted-foreground">{type.label}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Tabs & Search */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="coding">Coding</TabsTrigger>
                            <TabsTrigger value="mcq">MCQ</TabsTrigger>
                            <TabsTrigger value="aptitude">Aptitude</TabsTrigger>
                            <TabsTrigger value="soft_skills">Soft Skills</TabsTrigger>
                            <TabsTrigger value="case_study">Case Study</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search questions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* Questions List */}
                <div className="grid gap-4">
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading questions...</div>
                    ) : filteredQuestions.length === 0 ? (
                        <Card className="p-8 text-center">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="font-semibold mb-2">No Questions Found</h3>
                            <p className="text-muted-foreground mb-4">
                                {searchQuery ? "Try a different search term" : "Create your first question to get started"}
                            </p>
                            <Button onClick={() => setShowCreateModal(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Question
                            </Button>
                        </Card>
                    ) : (
                        filteredQuestions.map(question => {
                            const TypeIcon = getTypeIcon(question.type);
                            return (
                                <Card key={question._id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-3 rounded-lg ${getTypeColor(question.type)} text-white shrink-0`}>
                                                <TypeIcon className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold truncate">{question.title}</h3>
                                                    <Badge className={difficultyColors[question.difficulty]}>
                                                        {question.difficulty}
                                                    </Badge>
                                                    <Badge variant="outline">{question.points} pts</Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                                    {question.description}
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    {question.skills?.slice(0, 3).map(skill => (
                                                        <Badge key={skill} variant="secondary" className="text-xs">
                                                            {skill}
                                                        </Badge>
                                                    ))}
                                                    {question.skills?.length > 3 && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            +{question.skills.length - 3}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Button variant="ghost" size="icon" onClick={() => openEditModal(question)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(question._id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>

                {/* Create/Edit Modal */}
                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingQuestion ? "Edit Question" : "Create New Question"}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            {/* Type Selection */}
                            <div className="grid grid-cols-5 gap-2">
                                {questionTypes.map(type => (
                                    <Button
                                        key={type.value}
                                        variant={formData.type === type.value ? "default" : "outline"}
                                        className={`flex flex-col h-auto py-3 ${formData.type === type.value ? type.color : ""}`}
                                        onClick={() => setFormData({ ...formData, type: type.value as any })}
                                    >
                                        <type.icon className="h-5 w-5 mb-1" />
                                        <span className="text-xs">{type.label}</span>
                                    </Button>
                                ))}
                            </div>

                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label>Question Title</Label>
                                    <Input
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g., Implement a rate limiting algorithm"
                                    />
                                </div>
                                <div>
                                    <Label>Category</Label>
                                    <Input
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        placeholder="e.g., Backend Development"
                                    />
                                </div>
                                <div>
                                    <Label>Difficulty</Label>
                                    <Select value={formData.difficulty} onValueChange={(v: any) => setFormData({ ...formData, difficulty: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="easy">Easy</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="hard">Hard</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Points</Label>
                                    <Input
                                        type="number"
                                        value={formData.points}
                                        onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <Label>Time Limit (minutes)</Label>
                                    <Input
                                        type="number"
                                        value={formData.timeLimit}
                                        onChange={(e) => setFormData({ ...formData, timeLimit: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <Label>Question Description</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleAIGenerate}
                                        disabled={isGenerating}
                                        className="h-7 text-xs gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                    >
                                        {isGenerating ? (
                                            <><Loader2 className="h-3 w-3 animate-spin" /> Generating...</>
                                        ) : (
                                            <><Sparkles className="h-3 w-3" /> Generate with AI</>
                                        )}
                                    </Button>
                                </div>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe the problem in detail..."
                                    rows={4}
                                />
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Sparkles className="h-3 w-3 text-purple-500" />
                                    <span className="text-purple-600">Pro Tip:</span> Use AI to auto-generate description, options, and test cases based on title
                                </p>
                            </div>

                            {/* Skills */}
                            <div>
                                <Label>Skills</Label>
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        value={newSkill}
                                        onChange={(e) => setNewSkill(e.target.value)}
                                        placeholder="Add skill..."
                                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                                    />
                                    <Button type="button" onClick={addSkill}>Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {formData.skills.map(skill => (
                                        <Badge key={skill} variant="secondary" className="gap-1">
                                            {skill}
                                            <XCircle
                                                className="h-3 w-3 cursor-pointer"
                                                onClick={() => setFormData({
                                                    ...formData,
                                                    skills: formData.skills.filter(s => s !== skill)
                                                })}
                                            />
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* MCQ Options */}
                            {formData.type === "mcq" && (
                                <div>
                                    <Label>Answer Options</Label>
                                    <div className="space-y-2 mt-2">
                                        {formData.options.map((option, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={option.isCorrect}
                                                    onCheckedChange={(checked) => {
                                                        const newOptions = [...formData.options];
                                                        newOptions[idx].isCorrect = !!checked;
                                                        setFormData({ ...formData, options: newOptions });
                                                    }}
                                                />
                                                <Input
                                                    value={option.text}
                                                    onChange={(e) => {
                                                        const newOptions = [...formData.options];
                                                        newOptions[idx].text = e.target.value;
                                                        setFormData({ ...formData, options: newOptions });
                                                    }}
                                                    placeholder={`Option ${idx + 1}`}
                                                    className={option.isCorrect ? "border-green-500" : ""}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Check the correct answer(s)</p>
                                </div>
                            )}

                            {/* Coding - Languages & Template */}
                            {formData.type === "coding" && (
                                <>
                                    <div>
                                        <Label>Allowed Languages</Label>
                                        <div className="flex gap-2 mt-2">
                                            {["python", "javascript", "java", "cpp"].map(lang => (
                                                <Button
                                                    key={lang}
                                                    type="button"
                                                    variant={formData.allowedLanguages?.includes(lang) ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => {
                                                        const langs = formData.allowedLanguages || [];
                                                        setFormData({
                                                            ...formData,
                                                            allowedLanguages: langs.includes(lang)
                                                                ? langs.filter(l => l !== lang)
                                                                : [...langs, lang]
                                                        });
                                                    }}
                                                >
                                                    {lang === "cpp" ? "C++" : lang.charAt(0).toUpperCase() + lang.slice(1)}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Test Cases</Label>
                                        <div className="space-y-2 mt-2">
                                            {formData.testCases.map((tc, idx) => (
                                                <div key={idx} className="grid grid-cols-3 gap-2">
                                                    <Input
                                                        value={tc.input}
                                                        onChange={(e) => {
                                                            const newTCs = [...formData.testCases];
                                                            newTCs[idx].input = e.target.value;
                                                            setFormData({ ...formData, testCases: newTCs });
                                                        }}
                                                        placeholder="Input"
                                                    />
                                                    <Input
                                                        value={tc.expectedOutput}
                                                        onChange={(e) => {
                                                            const newTCs = [...formData.testCases];
                                                            newTCs[idx].expectedOutput = e.target.value;
                                                            setFormData({ ...formData, testCases: newTCs });
                                                        }}
                                                        placeholder="Expected Output"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox
                                                            checked={tc.isHidden}
                                                            onCheckedChange={(checked) => {
                                                                const newTCs = [...formData.testCases];
                                                                newTCs[idx].isHidden = !!checked;
                                                                setFormData({ ...formData, testCases: newTCs });
                                                            }}
                                                        />
                                                        <Label className="text-xs">Hidden</Label>
                                                    </div>
                                                </div>
                                            ))}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setFormData({
                                                    ...formData,
                                                    testCases: [...formData.testCases, { input: "", expectedOutput: "", isHidden: false }]
                                                })}
                                            >
                                                + Add Test Case
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Expected Answer / Rubric */}
                            {(formData.type === "soft_skills" || formData.type === "case_study") && (
                                <div>
                                    <Label>Expected Answer / Rubric (for AI evaluation)</Label>
                                    <Textarea
                                        value={formData.expectedAnswer}
                                        onChange={(e) => setFormData({ ...formData, expectedAnswer: e.target.value })}
                                        placeholder="Describe the ideal answer structure..."
                                        rows={3}
                                    />
                                </div>
                            )}

                            {/* Tags */}
                            <div>
                                <Label>Tags</Label>
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        placeholder="Add tag..."
                                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                                    />
                                    <Button type="button" onClick={addTag}>Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {formData.tags.map(tag => (
                                        <Badge key={tag} variant="outline" className="gap-1">
                                            <Tag className="h-3 w-3" />
                                            {tag}
                                            <XCircle
                                                className="h-3 w-3 cursor-pointer"
                                                onClick={() => setFormData({
                                                    ...formData,
                                                    tags: formData.tags.filter(t => t !== tag)
                                                })}
                                            />
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </Button>
                            <Button onClick={editingQuestion ? handleUpdateQuestion : handleCreateQuestion}>
                                {editingQuestion ? "Update Question" : "Create Question"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
