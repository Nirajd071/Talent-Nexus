import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
    Search, Plus, Trash2, GripVertical, Code, CheckCircle, Brain, Heart,
    Briefcase, FileText, Clock, Loader2, Save, ArrowUp, ArrowDown
} from "lucide-react";

interface Question {
    _id: string;
    type: "coding" | "mcq" | "aptitude" | "soft_skills" | "case_study";
    title: string;
    description: string;
    difficulty: "easy" | "medium" | "hard";
    points: number;
    timeLimit?: number;
    skills: string[];
}

interface TestBuilderModalProps {
    open: boolean;
    onClose: () => void;
    testId: string;
    testTitle: string;
    existingQuestions?: Question[];
    onSave: (questions: Question[]) => void;
}

const typeIcons: Record<string, any> = {
    coding: Code,
    mcq: CheckCircle,
    aptitude: Brain,
    soft_skills: Heart,
    case_study: Briefcase,
};

const typeColors: Record<string, string> = {
    coding: "bg-blue-500",
    mcq: "bg-green-500",
    aptitude: "bg-purple-500",
    soft_skills: "bg-pink-500",
    case_study: "bg-orange-500",
};

const difficultyColors: Record<string, string> = {
    easy: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    hard: "bg-red-100 text-red-700",
};

export default function TestBuilderModal({
    open,
    onClose,
    testId,
    testTitle,
    existingQuestions = [],
    onSave
}: TestBuilderModalProps) {
    const [allQuestions, setAllQuestions] = useState<Question[]>([]);
    const [selectedQuestions, setSelectedQuestions] = useState<Question[]>(existingQuestions);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeType, setActiveType] = useState("all");
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const token = localStorage.getItem("token");

    useEffect(() => {
        if (open) {
            fetchQuestions();
            setSelectedQuestions(existingQuestions);
        }
    }, [open]);

    const fetchQuestions = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/questions?isActive=true", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setAllQuestions(data);
            }
        } catch (error) {
            console.error("Failed to fetch questions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredQuestions = allQuestions.filter(q => {
        const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = activeType === "all" || q.type === activeType;
        return matchesSearch && matchesType;
    });

    const isQuestionSelected = (id: string) => selectedQuestions.some(q => q._id === id);

    const addQuestion = (question: Question) => {
        if (!isQuestionSelected(question._id)) {
            setSelectedQuestions(prev => [...prev, question]);
        }
    };

    const removeQuestion = (id: string) => {
        setSelectedQuestions(prev => prev.filter(q => q._id !== id));
    };

    const moveQuestion = (index: number, direction: "up" | "down") => {
        const newIndex = direction === "up" ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= selectedQuestions.length) return;

        const newQuestions = [...selectedQuestions];
        [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
        setSelectedQuestions(newQuestions);
    };

    const totalPoints = selectedQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
    const totalTime = selectedQuestions.reduce((sum, q) => sum + (q.timeLimit || 5), 0);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const questionIds = selectedQuestions.map(q => q._id);
            console.log("Saving questions to test:", testId, "Questions:", questionIds);

            const res = await fetch(`/api/assessments/${testId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ questions: questionIds }),
            });

            const data = await res.json();
            console.log("Save response:", res.status, data);

            if (res.ok) {
                toast({ title: "Questions Saved!", description: `Added ${selectedQuestions.length} questions to the test` });
                onSave(selectedQuestions);
                onClose();
            } else {
                console.error("Save failed:", data);
                toast({ title: "Error", description: data.error || "Failed to save questions", variant: "destructive" });
            }
        } catch (error: any) {
            console.error("Save error:", error);
            toast({ title: "Error", description: error.message || "Failed to save questions", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Test Builder: {testTitle}
                    </DialogTitle>
                    <DialogDescription>
                        Add questions from your Question Bank to build this assessment
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 flex gap-4 overflow-hidden">
                    {/* Left Panel: Question Bank */}
                    <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
                        <div className="p-3 bg-muted/50 border-b space-y-2">
                            <h3 className="font-semibold text-sm">Question Bank</h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search questions..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-8"
                                />
                            </div>
                            <Tabs value={activeType} onValueChange={setActiveType}>
                                <TabsList className="h-8">
                                    <TabsTrigger value="all" className="text-xs px-2">All</TabsTrigger>
                                    <TabsTrigger value="coding" className="text-xs px-2">Coding</TabsTrigger>
                                    <TabsTrigger value="mcq" className="text-xs px-2">MCQ</TabsTrigger>
                                    <TabsTrigger value="aptitude" className="text-xs px-2">Aptitude</TabsTrigger>
                                    <TabsTrigger value="soft_skills" className="text-xs px-2">Soft</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        <ScrollArea className="flex-1 p-2">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-32">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : filteredQuestions.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Brain className="h-8 w-8 mx-auto mb-2" />
                                    <p className="text-sm">No questions found</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredQuestions.map(question => {
                                        const TypeIcon = typeIcons[question.type] || FileText;
                                        const isSelected = isQuestionSelected(question._id);
                                        return (
                                            <Card
                                                key={question._id}
                                                className={`cursor-pointer transition-all ${isSelected
                                                    ? "border-primary bg-primary/5 opacity-60"
                                                    : "hover:border-primary/50"
                                                    }`}
                                                onClick={() => !isSelected && addQuestion(question)}
                                            >
                                                <CardContent className="p-3">
                                                    <div className="flex items-start gap-2">
                                                        <div className={`p-1.5 rounded ${typeColors[question.type]} text-white shrink-0`}>
                                                            <TypeIcon className="h-3 w-3" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm truncate">{question.title}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="outline" className="text-xs">
                                                                    {question.points} pts
                                                                </Badge>
                                                                <Badge className={`text-xs ${difficultyColors[question.difficulty]}`}>
                                                                    {question.difficulty}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        {isSelected ? (
                                                            <Badge variant="secondary" className="text-xs">Added</Badge>
                                                        ) : (
                                                            <Plus className="h-4 w-4 text-primary shrink-0" />
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Right Panel: Selected Questions */}
                    <div className="w-80 flex flex-col border rounded-lg overflow-hidden">
                        <div className="p-3 bg-muted/50 border-b">
                            <h3 className="font-semibold text-sm">Selected Questions ({selectedQuestions.length})</h3>
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" /> {totalPoints} pts
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> ~{totalTime} min
                                </span>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 p-2">
                            {selectedQuestions.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Click questions on the left to add them</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {selectedQuestions.map((question, idx) => {
                                        const TypeIcon = typeIcons[question.type] || FileText;
                                        return (
                                            <Card key={question._id} className="group">
                                                <CardContent className="p-2 flex items-center gap-2">
                                                    <div className="flex flex-col gap-0.5">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5"
                                                            onClick={() => moveQuestion(idx, "up")}
                                                            disabled={idx === 0}
                                                        >
                                                            <ArrowUp className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5"
                                                            onClick={() => moveQuestion(idx, "down")}
                                                            disabled={idx === selectedQuestions.length - 1}
                                                        >
                                                            <ArrowDown className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                    <div className={`p-1 rounded ${typeColors[question.type]} text-white`}>
                                                        <TypeIcon className="h-3 w-3" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium truncate">{question.title}</p>
                                                        <p className="text-xs text-muted-foreground">{question.points} pts</p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                                        onClick={() => removeQuestion(question._id)}
                                                    >
                                                        <Trash2 className="h-3 w-3 text-destructive" />
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>

                <DialogFooter className="border-t pt-4">
                    <div className="flex items-center justify-between w-full">
                        <div className="text-sm text-muted-foreground">
                            {selectedQuestions.length} questions • {totalPoints} total points • ~{totalTime} min
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={onClose}>Cancel</Button>
                            <Button onClick={handleSave} disabled={isSaving || selectedQuestions.length === 0}>
                                {isSaving ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                                ) : (
                                    <><Save className="h-4 w-4 mr-2" /> Save Questions</>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
