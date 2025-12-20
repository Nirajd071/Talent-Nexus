/**
 * Leave Your Presence Form Component
 * Allows candidates to submit their profile for recruiters to discover
 */
import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    Sparkles,
    X,
    Plus,
    CheckCircle,
    User,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    Code,
    Linkedin,
    Github,
    Globe
} from "lucide-react";

interface LeavePresenceFormProps {
    open: boolean;
    onClose: () => void;
}

export function LeavePresenceForm({ open, onClose }: LeavePresenceFormProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [skillInput, setSkillInput] = useState("");
    const [interestInput, setInterestInput] = useState("");
    const [roleInput, setRoleInput] = useState("");
    const { toast } = useToast();

    // Form state
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        professionalSummary: "",
        primarySkills: [] as string[],
        interests: [] as string[],
        expectedJobRoles: [] as string[],
        preferredLocation: "",
        yearsOfExperience: "",
        linkedIn: "",
        github: "",
        portfolio: ""
    });

    // Pre-fill from user data if available
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.email) {
                    setFormData(prev => ({
                        ...prev,
                        email: payload.email
                    }));
                }
            } catch (e) {
                // Ignore token parsing errors
            }
        }

        // Check if user already has a profile
        checkExistingProfile();
    }, [open]);

    const checkExistingProfile = async () => {
        if (!formData.email) return;
        try {
            const response = await fetch(`/api/candidate-leads/check/${formData.email}`);
            const data = await response.json();
            if (data.exists && data.lead) {
                // Pre-fill with existing data
                setFormData({
                    fullName: data.lead.fullName || "",
                    email: data.lead.email || "",
                    phone: data.lead.phone || "",
                    professionalSummary: data.lead.professionalSummary || "",
                    primarySkills: data.lead.primarySkills || [],
                    interests: data.lead.interests || [],
                    expectedJobRoles: data.lead.expectedJobRoles || [],
                    preferredLocation: data.lead.preferredLocation || "",
                    yearsOfExperience: data.lead.yearsOfExperience?.toString() || "",
                    linkedIn: data.lead.linkedIn || "",
                    github: data.lead.github || "",
                    portfolio: data.lead.portfolio || ""
                });
            }
        } catch (error) {
            console.error("Error checking existing profile:", error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const addSkill = () => {
        if (skillInput.trim() && !formData.primarySkills.includes(skillInput.trim())) {
            setFormData(prev => ({
                ...prev,
                primarySkills: [...prev.primarySkills, skillInput.trim()]
            }));
            setSkillInput("");
        }
    };

    const removeSkill = (skill: string) => {
        setFormData(prev => ({
            ...prev,
            primarySkills: prev.primarySkills.filter(s => s !== skill)
        }));
    };

    const addInterest = () => {
        if (interestInput.trim() && !formData.interests.includes(interestInput.trim())) {
            setFormData(prev => ({
                ...prev,
                interests: [...prev.interests, interestInput.trim()]
            }));
            setInterestInput("");
        }
    };

    const removeInterest = (interest: string) => {
        setFormData(prev => ({
            ...prev,
            interests: prev.interests.filter(i => i !== interest)
        }));
    };

    const addRole = () => {
        if (roleInput.trim() && !formData.expectedJobRoles.includes(roleInput.trim())) {
            setFormData(prev => ({
                ...prev,
                expectedJobRoles: [...prev.expectedJobRoles, roleInput.trim()]
            }));
            setRoleInput("");
        }
    };

    const removeRole = (role: string) => {
        setFormData(prev => ({
            ...prev,
            expectedJobRoles: prev.expectedJobRoles.filter(r => r !== role)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.fullName || !formData.email) {
            toast({
                title: "Required Fields",
                description: "Please fill in your name and email",
                variant: "destructive"
            });
            return;
        }

        if (formData.primarySkills.length === 0) {
            toast({
                title: "Add Skills",
                description: "Please add at least one skill",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/candidate-leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : undefined
                })
            });

            const result = await response.json();

            if (response.ok) {
                setSuccess(true);
                toast({
                    title: result.updated ? "Profile Updated!" : "Profile Created!",
                    description: result.updated
                        ? "Your profile has been updated successfully."
                        : "Recruiters can now discover your profile!"
                });
                setTimeout(() => {
                    onClose();
                    setSuccess(false);
                }, 2000);
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to save profile",
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to connect to server",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className="max-w-md">
                    <div className="flex flex-col items-center justify-center py-8">
                        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Success!</h2>
                        <p className="text-muted-foreground text-center">
                            Your profile is now visible to recruiters
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Leave Your Presence
                    </DialogTitle>
                    <DialogDescription>
                        Create your profile so recruiters can discover you for opportunities
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Full Name *
                            </Label>
                            <Input
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                placeholder="John Doe"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Email *
                            </Label>
                            <Input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="john@example.com"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                Phone
                            </Label>
                            <Input
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                placeholder="+91 9876543210"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Preferred Location
                            </Label>
                            <Input
                                name="preferredLocation"
                                value={formData.preferredLocation}
                                onChange={handleInputChange}
                                placeholder="Bangalore, India"
                            />
                        </div>
                    </div>

                    {/* Professional Summary */}
                    <div className="space-y-2">
                        <Label>Professional Summary</Label>
                        <Textarea
                            name="professionalSummary"
                            value={formData.professionalSummary}
                            onChange={handleInputChange}
                            placeholder="Brief description of your background, experience, and what you're looking for..."
                            rows={3}
                        />
                    </div>

                    {/* Skills */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Code className="h-4 w-4" />
                            Primary Skills *
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                value={skillInput}
                                onChange={(e) => setSkillInput(e.target.value)}
                                placeholder="Add a skill (e.g., React, Python)"
                                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                            />
                            <Button type="button" onClick={addSkill} variant="outline">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {formData.primarySkills.map((skill) => (
                                <Badge key={skill} variant="secondary" className="gap-1">
                                    {skill}
                                    <X
                                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                                        onClick={() => removeSkill(skill)}
                                    />
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Expected Job Roles */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            Expected Job Roles
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                value={roleInput}
                                onChange={(e) => setRoleInput(e.target.value)}
                                placeholder="Add job role (e.g., Frontend Developer)"
                                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addRole())}
                            />
                            <Button type="button" onClick={addRole} variant="outline">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {formData.expectedJobRoles.map((role) => (
                                <Badge key={role} className="gap-1 bg-primary/10 text-primary">
                                    {role}
                                    <X
                                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                                        onClick={() => removeRole(role)}
                                    />
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Interests */}
                    <div className="space-y-2">
                        <Label>Interests / Domains</Label>
                        <div className="flex gap-2">
                            <Input
                                value={interestInput}
                                onChange={(e) => setInterestInput(e.target.value)}
                                placeholder="Add interest (e.g., AI, Cloud Computing)"
                                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addInterest())}
                            />
                            <Button type="button" onClick={addInterest} variant="outline">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {formData.interests.map((interest) => (
                                <Badge key={interest} variant="outline" className="gap-1">
                                    {interest}
                                    <X
                                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                                        onClick={() => removeInterest(interest)}
                                    />
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Experience */}
                    <div className="space-y-2">
                        <Label>Years of Experience</Label>
                        <Input
                            name="yearsOfExperience"
                            type="number"
                            min="0"
                            max="50"
                            value={formData.yearsOfExperience}
                            onChange={handleInputChange}
                            placeholder="2"
                            className="w-32"
                        />
                    </div>

                    {/* Social Links */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Linkedin className="h-4 w-4" />
                                LinkedIn
                            </Label>
                            <Input
                                name="linkedIn"
                                value={formData.linkedIn}
                                onChange={handleInputChange}
                                placeholder="linkedin.com/in/username"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Github className="h-4 w-4" />
                                GitHub
                            </Label>
                            <Input
                                name="github"
                                value={formData.github}
                                onChange={handleInputChange}
                                placeholder="github.com/username"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                Portfolio
                            </Label>
                            <Input
                                name="portfolio"
                                value={formData.portfolio}
                                onChange={handleInputChange}
                                placeholder="yourportfolio.com"
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            <Sparkles className="h-4 w-4 mr-2" />
                            Leave Your Presence
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
