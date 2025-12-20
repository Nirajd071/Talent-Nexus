import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import {
    Users, Mail, Send, Calendar as CalendarIcon, CheckCircle,
    Loader2, Search, User, Clock, Copy, ChevronRight
} from "lucide-react";
import { format } from "date-fns";

interface Candidate {
    _id: string;
    name: string;
    email: string;
    jobId?: string;
    matchScore?: number;
    shortlisted?: boolean;
}

interface AssignTestModalProps {
    open: boolean;
    onClose: () => void;
    testId: string;
    testTitle: string;
}

export default function AssignTestModal({ open, onClose, testId, testTitle }: AssignTestModalProps) {
    const [step, setStep] = useState(1);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [deadline, setDeadline] = useState<Date | undefined>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const [generatedCodes, setGeneratedCodes] = useState<any[]>([]);
    const [sendingEmails, setSendingEmails] = useState(false);
    const { toast } = useToast();

    const token = localStorage.getItem("token");

    useEffect(() => {
        if (open) {
            fetchCandidates();
            setStep(1);
            setSelectedCandidates(new Set());
            setGeneratedCodes([]);
        }
    }, [open]);

    const fetchCandidates = async () => {
        setIsLoading(true);
        try {
            // Fetch shortlisted candidates
            const res = await fetch("/api/candidates?shortlisted=true", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setCandidates(data);
            }
        } catch (error) {
            console.error("Failed to fetch candidates:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredCandidates = candidates.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleCandidate = (id: string) => {
        const newSelected = new Set(selectedCandidates);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedCandidates(newSelected);
    };

    const selectAll = () => {
        if (selectedCandidates.size === filteredCandidates.length) {
            setSelectedCandidates(new Set());
        } else {
            setSelectedCandidates(new Set(filteredCandidates.map(c => c._id)));
        }
    };

    const handleGenerateCodes = async () => {
        if (selectedCandidates.size === 0) {
            toast({ title: "No candidates selected", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            const selectedData = candidates.filter(c => selectedCandidates.has(c._id));

            const res = await fetch("/api/access-codes/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    testId,
                    candidates: selectedData,
                    deadline: deadline?.toISOString(),
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setGeneratedCodes(data.codes);
                setStep(3);
                toast({ title: "Access Codes Generated", description: `Created ${data.codes.length} unique codes` });
            } else {
                throw new Error("Failed to generate codes");
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to generate access codes", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendEmails = async () => {
        setSendingEmails(true);
        try {
            // Send email to each candidate
            for (const code of generatedCodes) {
                await fetch("/api/email/send", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        to: code.candidateEmail,
                        subject: `Your Assessment Access Code - ${testTitle}`,
                        template: "assessment_invite",
                        data: {
                            candidateName: code.candidateName,
                            testTitle,
                            accessCode: code.code,
                            deadline: deadline ? format(deadline, "PPP") : "7 days from now",
                            portalUrl: `${window.location.origin}/candidate`
                        }
                    }),
                });
            }

            toast({
                title: "✉️ Emails Sent!",
                description: `Sent ${generatedCodes.length} invitation emails`
            });
            onClose();
        } catch (error) {
            toast({ title: "Error", description: "Some emails failed to send", variant: "destructive" });
        } finally {
            setSendingEmails(false);
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({ title: "Copied!", description: code });
    };

    const copyAllCodes = () => {
        const text = generatedCodes.map(c => `${c.candidateName}: ${c.code}`).join("\n");
        navigator.clipboard.writeText(text);
        toast({ title: "All codes copied!" });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        Assign Test to Candidates
                    </DialogTitle>
                    <DialogDescription>
                        {testTitle} - {step === 1 ? "Select candidates" : step === 2 ? "Set deadline" : "Send invitations"}
                    </DialogDescription>
                </DialogHeader>

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2 py-4">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                                }`}>
                                {step > s ? <CheckCircle className="h-4 w-4" /> : s}
                            </div>
                            {s < 3 && <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />}
                        </div>
                    ))}
                </div>

                {/* Step 1: Select Candidates */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search candidates..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Button variant="outline" size="sm" onClick={selectAll}>
                                {selectedCandidates.size === filteredCandidates.length ? "Deselect All" : "Select All"}
                            </Button>
                        </div>

                        <ScrollArea className="h-64 border rounded-lg p-2">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : filteredCandidates.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="h-8 w-8 mx-auto mb-2" />
                                    <p>No shortlisted candidates found</p>
                                    <p className="text-sm">Shortlist candidates from Jobs → View Candidates first</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredCandidates.map(candidate => (
                                        <div
                                            key={candidate._id}
                                            onClick={() => toggleCandidate(candidate._id)}
                                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedCandidates.has(candidate._id)
                                                    ? "bg-primary/10 border border-primary/30"
                                                    : "hover:bg-muted border border-transparent"
                                                }`}
                                        >
                                            <Checkbox checked={selectedCandidates.has(candidate._id)} />
                                            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                                                <User className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium">{candidate.name}</p>
                                                <p className="text-sm text-muted-foreground">{candidate.email}</p>
                                            </div>
                                            {candidate.matchScore && (
                                                <Badge variant="secondary">{candidate.matchScore}% match</Badge>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{selectedCandidates.size} candidate(s) selected</span>
                        </div>
                    </div>
                )}

                {/* Step 2: Set Deadline */}
                {step === 2 && (
                    <div className="space-y-6 py-4">
                        <div className="text-center">
                            <h3 className="font-semibold mb-2">Set Assessment Deadline</h3>
                            <p className="text-sm text-muted-foreground">
                                Candidates must complete the assessment before this date
                            </p>
                        </div>

                        <div className="flex justify-center">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-64 justify-start gap-2">
                                        <CalendarIcon className="h-4 w-4" />
                                        {deadline ? format(deadline, "PPP") : "Pick a date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={deadline}
                                        onSelect={setDeadline}
                                        disabled={(date) => date < new Date()}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <Card className="bg-muted/50">
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <span>{selectedCandidates.size} candidates</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span>{deadline ? `${Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days` : "No deadline"}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Step 3: Review & Send */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Generated Access Codes</h3>
                            <Button variant="outline" size="sm" onClick={copyAllCodes}>
                                <Copy className="h-4 w-4 mr-1" /> Copy All
                            </Button>
                        </div>

                        <ScrollArea className="h-48 border rounded-lg">
                            <div className="p-2 space-y-2">
                                {generatedCodes.map((code, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                        <div>
                                            <p className="font-medium">{code.candidateName}</p>
                                            <p className="text-xs text-muted-foreground">{code.candidateEmail}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <code className="px-2 py-1 bg-background rounded text-sm font-mono">
                                                {code.code}
                                            </code>
                                            <Button variant="ghost" size="icon" onClick={() => copyCode(code.code)}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        <Card className="border-blue-200 bg-blue-50">
                            <CardContent className="pt-4">
                                <div className="flex items-start gap-3">
                                    <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium text-blue-800">Ready to send invitations</p>
                                        <p className="text-blue-700">
                                            Each candidate will receive an email with their unique access code
                                            and instructions to access the assessment.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <DialogFooter className="gap-2">
                    {step > 1 && (
                        <Button variant="outline" onClick={() => setStep(step - 1)}>
                            Back
                        </Button>
                    )}

                    {step === 1 && (
                        <Button onClick={() => setStep(2)} disabled={selectedCandidates.size === 0}>
                            Next: Set Deadline
                        </Button>
                    )}

                    {step === 2 && (
                        <Button onClick={handleGenerateCodes} disabled={isLoading}>
                            {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : "Generate Codes"}
                        </Button>
                    )}

                    {step === 3 && (
                        <Button onClick={handleSendEmails} disabled={sendingEmails} className="gap-2">
                            {sendingEmails ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                            ) : (
                                <><Send className="h-4 w-4" /> Send Email Invitations</>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
