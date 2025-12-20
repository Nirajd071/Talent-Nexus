import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    ShieldCheck,
    Video,
    FileText,
    Brain,
    Mail,
    AlertTriangle
} from "lucide-react";

interface ConsentItem {
    id: string;
    type: "proctoring" | "recording" | "data_processing" | "ai_analysis" | "communication";
    label: string;
    description: string;
    required: boolean;
    icon: React.ReactNode;
}

interface ConsentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConsent: (consents: Record<string, boolean>) => void;
    context?: "assessment" | "interview" | "application";
}

const consentItems: ConsentItem[] = [
    {
        id: "proctoring",
        type: "proctoring",
        label: "Proctoring & Monitoring",
        description: `I understand this assessment will be proctored. This includes monitoring of tab switches, browser focus, and copy/paste activities. This data will be used to ensure assessment integrity.`,
        required: true,
        icon: <ShieldCheck className="w-5 h-5" />,
    },
    {
        id: "recording",
        type: "recording",
        label: "Session Recording",
        description: `I consent to video/audio recording via webcam and microphone during this session. Recordings are stored securely and used only for evaluation purposes.`,
        required: false,
        icon: <Video className="w-5 h-5" />,
    },
    {
        id: "data_processing",
        type: "data_processing",
        label: "Data Processing",
        description: `I consent to the processing of my personal data for recruitment purposes, including resume data, interview feedback, and assessment results. Data is handled per applicable privacy laws.`,
        required: true,
        icon: <FileText className="w-5 h-5" />,
    },
    {
        id: "ai_analysis",
        type: "ai_analysis",
        label: "AI-Assisted Analysis",
        description: `I consent to AI/ML technologies analyzing my application, including resume parsing, skill matching, and sentiment analysis. AI decisions are reviewed by human recruiters.`,
        required: false,
        icon: <Brain className="w-5 h-5" />,
    },
    {
        id: "communication",
        type: "communication",
        label: "Communication Consent",
        description: `I consent to receive communications via email and phone regarding my application status, interview scheduling, and offer details.`,
        required: false,
        icon: <Mail className="w-5 h-5" />,
    },
];

export default function ConsentModal({
    open,
    onOpenChange,
    onConsent,
    context = "assessment",
}: ConsentModalProps) {
    const [consents, setConsents] = useState<Record<string, boolean>>({});

    // Filter items based on context
    const relevantItems = consentItems.filter((item) => {
        if (context === "assessment") {
            return ["proctoring", "data_processing", "ai_analysis"].includes(item.type);
        }
        if (context === "interview") {
            return ["recording", "data_processing", "ai_analysis"].includes(item.type);
        }
        return true;
    });

    const requiredItems = relevantItems.filter((item) => item.required);
    const allRequiredConsented = requiredItems.every((item) => consents[item.id]);

    const handleConsentChange = (id: string, checked: boolean) => {
        setConsents((prev) => ({ ...prev, [id]: checked }));
    };

    const handleProceed = () => {
        onConsent(consents);
        onOpenChange(false);
    };

    const handleDecline = () => {
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                        Consent Required
                    </DialogTitle>
                    <DialogDescription>
                        Please review and accept the following consents before proceeding with your{" "}
                        {context === "assessment" ? "assessment" : context === "interview" ? "interview" : "application"}.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[400px] pr-4">
                    <div className="space-y-4">
                        {relevantItems.map((item) => (
                            <div
                                key={item.id}
                                className={`p-4 border rounded-lg transition-colors ${consents[item.id] ? "border-primary/50 bg-primary/5" : "border-border"
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <Checkbox
                                        id={item.id}
                                        checked={consents[item.id] || false}
                                        onCheckedChange={(checked) =>
                                            handleConsentChange(item.id, checked as boolean)
                                        }
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <label
                                            htmlFor={item.id}
                                            className="flex items-center gap-2 font-medium cursor-pointer"
                                        >
                                            {item.icon}
                                            {item.label}
                                            {item.required && (
                                                <span className="text-xs text-red-500 font-normal">
                                                    (Required)
                                                </span>
                                            )}
                                        </label>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                {!allRequiredConsented && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-500/10 text-yellow-600 rounded-lg text-sm">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>Please accept all required consents to proceed.</span>
                    </div>
                )}

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={handleDecline}>
                        Decline & Exit
                    </Button>
                    <Button onClick={handleProceed} disabled={!allRequiredConsented}>
                        I Agree & Proceed
                    </Button>
                </DialogFooter>

                <p className="text-xs text-muted-foreground text-center">
                    By clicking "I Agree", you confirm you have read and understood these consents.
                    You can withdraw consent at any time by contacting support.
                </p>
            </DialogContent>
        </Dialog>
    );
}
