import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Bot,
    CheckCircle2,
    XCircle,
    ThumbsUp,
    ThumbsDown,
    TrendingUp,
    AlertTriangle,
    Star,
    MessageSquare,
    FileText,
    Clock,
    Users,
    Sparkles,
    Brain,
    Target,
    Zap,
    ClipboardCheck,
    ShieldCheck,
    Eye,
    Loader2
} from "lucide-react";
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ResponsiveContainer,
    Tooltip
} from "recharts";
import { jsPDF } from "jspdf";
import AssessmentResultDetails from "@/components/assessment-result-details";

// Types
interface Candidate {
    _id: string;
    email: string;
    role: string;
    profile?: {
        firstName?: string;
        lastName?: string;
    };
}

interface AssessmentResult {
    _id: string;
    assessmentId: {
        _id: string;
        title: string;
        type: string;
        timeLimit: number;
        questions: any[];
    };
    candidateId: string;
    candidateEmail: string;
    candidateName: string;
    status: string;
    score?: number;
    integrityScore?: number;
    startedAt?: string;
    completedAt?: string;
    proctoringReport?: {
        flags: any[];
        overallIntegrity: number;
    };
}

// Interview type for real data
interface CandidateInterview {
    _id: string;
    round?: number;
    type: string;
    scheduledAt: string;
    interviewers?: Array<{ name: string; email: string }>;
    status: string;
    feedback?: { overallScore?: number; recommendation?: string; notes?: string; strengths?: string[]; concerns?: string[] };
}

export default function EvaluationDashboard() {
    const [, navigate] = useLocation();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
    const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([]);
    const [interviews, setInterviews] = useState<CandidateInterview[]>([]);
    const [candidateApplication, setCandidateApplication] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedResult, setSelectedResult] = useState<AssessmentResult | null>(null);
    const token = localStorage.getItem("token");

    // Schedule interview for current candidate
    const handleScheduleInterview = () => {
        const candidate = candidates.find(c => c._id === selectedCandidateId);
        if (candidate) {
            // Store candidate info for interview scheduler to pick up
            localStorage.setItem("scheduleInterviewFor", JSON.stringify({
                id: candidate._id,
                email: candidate.email,
                name: candidate.profile?.firstName
                    ? `${candidate.profile.firstName} ${candidate.profile.lastName || ""}`
                    : candidate.email
            }));
            navigate("/interviews");
        }
    };

    // Export candidate report as PDF - comprehensive and professional
    const handleExportReport = async () => {
        const candidate = candidates.find(c => c._id === selectedCandidateId);
        if (!candidate) return;

        const reportDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        // Create PDF document
        const doc = new jsPDF();
        let y = 20; // Current Y position
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        const contentWidth = pageWidth - 2 * margin;

        // Helper function to add new page if needed
        const checkPageBreak = (neededHeight: number) => {
            if (y + neededHeight > doc.internal.pageSize.getHeight() - 20) {
                doc.addPage();
                y = 20;
            }
        };

        // Helper function to draw a section header
        const drawSectionHeader = (title: string, color: [number, number, number] = [59, 130, 246]) => {
            checkPageBreak(15);
            doc.setFillColor(...color);
            doc.rect(margin, y, contentWidth, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(title, margin + 3, y + 5.5);
            doc.setTextColor(0, 0, 0);
            y += 12;
        };

        // Helper function to draw a table row with proper alignment
        const drawTableRow = (cols: string[], widths: number[], isHeader: boolean = false) => {
            checkPageBreak(8);
            let x = margin;
            doc.setFontSize(8);
            doc.setFont('helvetica', isHeader ? 'bold' : 'normal');

            if (isHeader) {
                doc.setFillColor(240, 240, 240);
                doc.rect(margin, y - 4, contentWidth, 7, 'F');
            }

            // Calculate actual widths based on content area
            const totalWidth = widths.reduce((a, b) => a + b, 0);
            const actualWidths = widths.map(w => (w / totalWidth) * contentWidth);

            cols.forEach((col, i) => {
                // Truncate text to fit column width (approximately 3.5 chars per mm)
                const maxChars = Math.floor(actualWidths[i] / 2.5);
                const text = col.length > maxChars ? col.substring(0, maxChars - 2) + '..' : col;
                doc.text(text, x + 2, y);
                x += actualWidths[i];
            });
            y += 6;
        };

        // ===== HEADER =====
        doc.setFillColor(30, 64, 175); // Blue header
        doc.rect(0, 0, pageWidth, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('CANDIDATE EVALUATION REPORT', pageWidth / 2, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('HireSphere - AI-Powered Talent Acquisition Platform', pageWidth / 2, 23, { align: 'center' });
        doc.text(`Generated: ${reportDate}`, pageWidth / 2, 30, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        y = 45;

        // ===== CANDIDATE INFORMATION =====
        drawSectionHeader('CANDIDATE INFORMATION');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${candidateName}`, margin, y); y += 5;
        doc.text(`Email: ${candidate.email}`, margin, y); y += 5;
        doc.text(`Status: ${candidateApplication?.status || 'Pending'}`, margin, y); y += 5;
        if (candidateApplication?.jobTitle) {
            doc.text(`Applied For: ${candidateApplication.jobTitle}`, margin, y); y += 5;
        }
        y += 5;

        // ===== OVERALL SCORES =====
        drawSectionHeader('OVERALL EVALUATION SCORES', [34, 197, 94]);

        // Score boxes
        const scoreBoxWidth = contentWidth / 4 - 3;
        const scores = [
            { label: 'Match Score', value: resumeScore, color: resumeScore >= 70 ? [34, 197, 94] : resumeScore >= 50 ? [234, 179, 8] : [239, 68, 68] },
            { label: 'Assessment', value: avgAssessmentScore, color: avgAssessmentScore >= 70 ? [34, 197, 94] : avgAssessmentScore >= 50 ? [234, 179, 8] : [239, 68, 68] },
            { label: 'Integrity', value: avgIntegrityScore, color: avgIntegrityScore >= 90 ? [34, 197, 94] : avgIntegrityScore >= 70 ? [234, 179, 8] : [239, 68, 68] },
            { label: 'Hire Score', value: predictedHireScore, color: predictedHireScore >= 70 ? [34, 197, 94] : predictedHireScore >= 50 ? [234, 179, 8] : [239, 68, 68] }
        ];

        checkPageBreak(30);
        scores.forEach((s, i) => {
            const x = margin + i * (scoreBoxWidth + 3);
            doc.setFillColor(245, 245, 245);
            doc.roundedRect(x, y, scoreBoxWidth, 25, 3, 3, 'F');
            doc.setFillColor(...(s.color as [number, number, number]));
            doc.roundedRect(x, y, scoreBoxWidth, 5, 3, 3, 'F');
            doc.rect(x, y + 3, scoreBoxWidth, 2, 'F');
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...(s.color as [number, number, number]));
            doc.text(`${s.value}%`, x + scoreBoxWidth / 2, y + 15, { align: 'center' });
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(s.label, x + scoreBoxWidth / 2, y + 22, { align: 'center' });
        });
        doc.setTextColor(0, 0, 0);
        y += 32;

        // ===== 5-FACTOR SCORING BREAKDOWN =====
        if (candidateApplication?.aiEvaluation?.breakdown) {
            drawSectionHeader('5-FACTOR SCORING BREAKDOWN', [124, 58, 237]);
            const breakdown = candidateApplication.aiEvaluation.breakdown;

            const factors = [
                { name: 'Skills Match', score: breakdown.skills?.split('/')[0] || '0', weight: '50%', desc: 'Technical skills alignment' },
                { name: 'Experience', score: breakdown.experience?.split('/')[0] || '0', weight: '20%', desc: 'Work history relevance' },
                { name: 'Education/Dept', score: breakdown.department?.split('/')[0] || '0', weight: '15%', desc: 'Academic background' },
                { name: 'Projects', score: breakdown.description?.split('/')[0] || '0', weight: '10%', desc: 'Portfolio & projects' },
                { name: 'Cultural Fit', score: 'N/A', weight: '5%', desc: 'Description match' }
            ];

            checkPageBreak(factors.length * 8 + 10);
            drawTableRow(['Factor', 'Score', 'Weight', 'Description'], [50, 25, 25, 80], true);
            factors.forEach(f => {
                drawTableRow([f.name, f.score, f.weight, f.desc], [50, 25, 25, 80]);
            });
            y += 5;
        }

        // ===== SKILLS ANALYSIS =====
        if (candidateApplication?.aiEvaluation) {
            drawSectionHeader('SKILLS ANALYSIS', [234, 88, 12]);

            const matchedSkills = candidateApplication?.aiEvaluation?.matchedSkills || [];
            const missingSkills = candidateApplication?.aiEvaluation?.missingSkills || [];
            const candidateSkills = candidateApplication?.aiEvaluation?.candidateSkillsDetected || [];

            // Matched Skills
            if (matchedSkills.length > 0) {
                checkPageBreak(15);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(34, 197, 94);
                doc.text(`MATCHED SKILLS (${matchedSkills.length}):`, margin, y);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);
                y += 5;
                const skillText = matchedSkills.join(', ');
                const lines = doc.splitTextToSize(skillText, contentWidth);
                checkPageBreak(lines.length * 4 + 5);
                doc.setFontSize(8);
                doc.text(lines, margin, y);
                y += lines.length * 4 + 3;
            }

            // Missing Skills
            if (missingSkills.length > 0) {
                checkPageBreak(15);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(239, 68, 68);
                doc.text(`MISSING SKILLS (${missingSkills.length}):`, margin, y);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);
                y += 5;
                const skillText = missingSkills.join(', ');
                const lines = doc.splitTextToSize(skillText, contentWidth);
                checkPageBreak(lines.length * 4 + 5);
                doc.setFontSize(8);
                doc.text(lines, margin, y);
                y += lines.length * 4 + 3;
            }

            // Full Skill Set
            if (candidateSkills.length > 0) {
                checkPageBreak(15);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(59, 130, 246);
                doc.text(`FULL SKILL SET (${candidateSkills.length}):`, margin, y);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);
                y += 5;
                const skillText = candidateSkills.join(', ');
                const lines = doc.splitTextToSize(skillText, contentWidth);
                checkPageBreak(lines.length * 4 + 5);
                doc.setFontSize(8);
                doc.text(lines, margin, y);
                y += lines.length * 4 + 5;
            }
        }

        // ===== WORK EXPERIENCE =====
        if (candidateApplication?.parsedResume?.experience?.length > 0) {
            drawSectionHeader('WORK EXPERIENCE', [107, 114, 128]);
            candidateApplication.parsedResume.experience.forEach((exp: any, i: number) => {
                checkPageBreak(20);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text(`${i + 1}. ${exp.title || 'Position'}`, margin, y);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                y += 5;
                doc.text(`Company: ${exp.company || 'N/A'} | Duration: ${exp.duration || 'N/A'}`, margin + 5, y);
                y += 7;
            });
        }

        // ===== EDUCATION =====
        if (candidateApplication?.parsedResume?.education?.length > 0) {
            drawSectionHeader('EDUCATION', [139, 92, 246]);
            candidateApplication.parsedResume.education.forEach((edu: any, i: number) => {
                checkPageBreak(12);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                // Show degree/institution on left, location/year on right
                const degree = (edu.degree || 'Degree').substring(0, 50);
                const institution = edu.institution ? edu.institution.substring(0, 30) : '';
                const location = edu.location || edu.year || '';

                doc.text(`${i + 1}. ${institution || degree}`, margin, y);
                if (location) {
                    doc.setFont('helvetica', 'normal');
                    doc.text(location.substring(0, 25), pageWidth - margin, y, { align: 'right' });
                }
                y += 5;

                if (institution && degree !== institution) {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.text(`   ${degree}`, margin, y);
                    y += 4;
                }
                y += 2;
            });
        }

        // ===== PROJECTS =====
        if (candidateApplication?.parsedResume?.projects?.length > 0) {
            drawSectionHeader('PROJECTS', [249, 115, 22]);

            const projects = candidateApplication.parsedResume.projects;

            // Smart grouping: Detect titles vs bullet points based on content characteristics
            // A TITLE is: short (<60 chars), no action verbs at start, no dates/numbers mid-sentence
            // A BULLET is: starts with verb, contains technical details, or continues previous thought
            const parsedProjects: { title: string; bullets: string[] }[] = [];
            let currentProject: { title: string; bullets: string[] } | null = null;

            const isProjectTitle = (text: string): boolean => {
                const lowerText = text.toLowerCase();
                // Title characteristics: short, doesn't start with action verb, often contains tech stack/domain words
                const startsWithVerb = /^(formulated|designed|implemented|interpreted|engineered|developed|created|built|integrated|utilized|applied|managed|led|conducted|analyzed|established|optimized|automated|reduced|improved)/i.test(text);
                const hasNumberedContinuation = /^(time|patterns|safety|code|standards|web|api|data|system)/i.test(text);
                const isShort = text.length < 60;
                const looksLikeTitle = !startsWithVerb && isShort && !hasNumberedContinuation && !text.includes('%');
                return looksLikeTitle;
            };

            projects.forEach((proj: any) => {
                const name = (proj.name || '').trim();
                const desc = (proj.description || '').trim();
                const text = name || desc;

                if (!text || text.length < 3) return;

                // Clean the text - remove leading numbers/bullets
                const cleanText = text.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•]\s*/, '').trim();

                if (isProjectTitle(cleanText)) {
                    // Start new project
                    if (currentProject && (currentProject.title !== 'Project' || currentProject.bullets.length > 0)) {
                        parsedProjects.push(currentProject);
                    }
                    currentProject = { title: cleanText, bullets: [] };
                } else if (currentProject) {
                    // Add as bullet to current project
                    currentProject.bullets.push(cleanText);
                } else {
                    // First item is not a title - create generic project
                    currentProject = { title: 'Project', bullets: [cleanText] };
                }
            });

            // Push last project
            if (currentProject !== null) {
                if (currentProject.title !== 'Project' || currentProject.bullets.length > 0) {
                    parsedProjects.push(currentProject);
                }
            }

            // Merge consecutive bullets that were split (sentences that continue)
            parsedProjects.forEach(proj => {
                const mergedBullets: string[] = [];
                let pendingBullet = '';

                proj.bullets.forEach((bullet, idx) => {
                    // Check if this is a continuation (starts with lowercase, short fragment)
                    const isContinuation = /^[a-z]/.test(bullet) && bullet.length < 30 && idx > 0;

                    if (isContinuation && pendingBullet) {
                        pendingBullet += ' ' + bullet;
                    } else {
                        if (pendingBullet) {
                            mergedBullets.push(pendingBullet);
                        }
                        pendingBullet = bullet;
                    }
                });

                if (pendingBullet) {
                    mergedBullets.push(pendingBullet);
                }

                proj.bullets = mergedBullets;
            });

            // Render projects
            if (parsedProjects.length === 0) {
                doc.setFontSize(9);
                doc.text('Project details available in resume', margin, y);
                y += 8;
            } else {
                parsedProjects.forEach((project, i) => {
                    checkPageBreak(35);

                    // Project title with number
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    const titleLines = doc.splitTextToSize(`${i + 1}. ${project.title}`, contentWidth - 5);
                    doc.text(titleLines[0], margin, y); // Only first line of title
                    y += 6;

                    // Render bullet points
                    if (project.bullets.length > 0) {
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(9);

                        project.bullets.slice(0, 5).forEach((bullet) => {
                            checkPageBreak(12);
                            // Proper text wrapping within content width
                            const wrappedBullet = doc.splitTextToSize(`• ${bullet}`, contentWidth - 20);
                            wrappedBullet.slice(0, 3).forEach((line: string, lineIdx: number) => {
                                doc.text(line, margin + 8, y);
                                y += 4;
                            });
                        });
                    }

                    y += 4; // Spacing between projects
                });
            }
        }

        // ===== ASSESSMENT RESULTS =====
        drawSectionHeader('ASSESSMENT RESULTS', [20, 184, 166]);
        if (assessmentResults.length === 0) {
            doc.setFontSize(10);
            doc.text('No completed assessments', margin, y);
            y += 8;
        } else {
            checkPageBreak(assessmentResults.length * 7 + 10);
            drawTableRow(['Assessment', 'Score', 'Integrity', 'Date'], [80, 30, 30, 40], true);
            assessmentResults.forEach(result => {
                const title = (result.assessmentId?.title || 'Assessment').substring(0, 35);
                const score = `${result.score || 0}%`;
                const integrity = `${result.integrityScore || 100}%`;
                const date = result.completedAt ? new Date(result.completedAt).toLocaleDateString() : 'N/A';
                drawTableRow([title, score, integrity, date], [80, 30, 30, 40]);
            });
            y += 3;
        }

        // ===== INTERVIEW HISTORY =====
        drawSectionHeader('INTERVIEW HISTORY', [236, 72, 153]);
        if (interviews.length === 0) {
            doc.setFontSize(10);
            doc.text('No interviews scheduled', margin, y);
            y += 8;
        } else {
            interviews.forEach((interview, i) => {
                checkPageBreak(20);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text(`Round ${interview.round || i + 1}: ${interview.type}`, margin, y);
                y += 5;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.text(`Date: ${new Date(interview.scheduledAt).toLocaleDateString()} | Status: ${interview.status}`, margin + 5, y);
                y += 5;
                if (interview.feedback?.overallScore) {
                    doc.text(`Score: ${interview.feedback.overallScore}/5`, margin + 5, y);
                    y += 5;
                }
                y += 3;
            });
        }

        // ===== AI RECOMMENDATION =====
        checkPageBreak(40);
        doc.setFillColor(30, 64, 175);
        doc.roundedRect(margin, y, contentWidth, 30, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('AI RECOMMENDATION', margin + 5, y + 8);
        doc.setFontSize(18);
        doc.text(`${recommendation.label.toUpperCase()}`, margin + 5, y + 20);
        doc.setFontSize(14);
        doc.text(`Hire Score: ${predictedHireScore}%`, pageWidth - margin - 50, y + 15);
        doc.setTextColor(0, 0, 0);
        y += 38;

        // AI Reasoning
        if (candidateApplication?.aiReasoning) {
            checkPageBreak(15);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100, 100, 100);
            const reasoningLines = doc.splitTextToSize(`AI Notes: ${candidateApplication.aiReasoning}`, contentWidth);
            doc.text(reasoningLines.slice(0, 2), margin, y);
            y += 10;
        }

        // ===== FOOTER =====
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
            doc.text('Generated by HireSphere', margin, doc.internal.pageSize.getHeight() - 10);
            doc.text(reportDate, pageWidth - margin, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
        }

        // Save PDF
        doc.save(`Candidate_Report_${candidateName.replace(/\s+/g, '_')}_${new Date().toISOString().split("T")[0]}.pdf`);
    };

    // Generate offer for candidate
    const handleGenerateOffer = () => {
        const candidate = candidates.find(c => c._id === selectedCandidateId);
        if (candidate) {
            // Store candidate info for offer management
            localStorage.setItem("generateOfferFor", JSON.stringify({
                id: candidate._id,
                email: candidate.email,
                name: candidateName,
                score: predictedHireScore
            }));
            navigate("/offer-management");
        }
    };

    // Move candidate to offer stage
    const handleMoveToOffer = async () => {
        const candidate = candidates.find(c => c._id === selectedCandidateId);
        if (!candidate) return;

        try {
            // Find application for this candidate and update status
            const response = await fetch(`/api/applications?candidateEmail=${encodeURIComponent(candidate.email)}`);
            if (response.ok) {
                const apps = await response.json();
                if (apps.length > 0) {
                    const appId = apps[0]._id;
                    await fetch(`/api/applications/${appId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ status: "offer" })
                    });
                }
            }
            // Navigate to offer management
            handleGenerateOffer();
        } catch (error) {
            console.error("Failed to move to offer:", error);
        }
    };

    // Reject candidate
    const handleRejectCandidate = async () => {
        const candidate = candidates.find(c => c._id === selectedCandidateId);
        if (!candidate) return;

        if (!confirm(`Are you sure you want to reject ${candidateName}? This will send a rejection email.`)) {
            return;
        }

        try {
            // Find application and reject
            const response = await fetch(`/api/applications?candidateEmail=${encodeURIComponent(candidate.email)}`);
            if (response.ok) {
                const apps = await response.json();
                if (apps.length > 0) {
                    const appId = apps[0]._id;
                    await fetch(`/api/applications/${appId}/reject`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ reason: "Did not meet requirements", sendEmail: true })
                    });
                    alert(`${candidateName} has been rejected and email sent.`);
                    // Refresh candidates
                    fetchCandidates();
                }
            }
        } catch (error) {
            console.error("Failed to reject:", error);
            alert("Failed to reject candidate");
        }
    };

    useEffect(() => {
        fetchCandidates();
    }, []);

    useEffect(() => {
        if (selectedCandidateId && candidates.length > 0) {
            fetchAssessmentResults(selectedCandidateId);
            fetchInterviews(selectedCandidateId);
            fetchCandidateApplication(selectedCandidateId);
        }
    }, [selectedCandidateId, candidates]);

    const fetchCandidates = async () => {
        try {
            const response = await fetch("/api/users?role=candidate", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setCandidates(data);
                if (data.length > 0) {
                    setSelectedCandidateId(data[0]._id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch candidates:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAssessmentResults = async (candidateId: string) => {
        try {
            const candidate = candidates.find(c => c._id === candidateId);
            if (!candidate) return;

            // Use the completed endpoint to get properly completed assessments
            const response = await fetch(`/api/assessments/candidate/completed?email=${encodeURIComponent(candidate.email)}`);
            if (response.ok) {
                const data = await response.json();
                setAssessmentResults(data);
            }
        } catch (error) {
            console.error("Failed to fetch assessment results:", error);
        }
    };

    const fetchInterviews = async (candidateId: string) => {
        try {
            const candidate = candidates.find(c => c._id === candidateId);
            if (!candidate) return;

            // Fetch real interviews for this candidate
            const response = await fetch(`/api/interviews?candidateEmail=${encodeURIComponent(candidate.email)}`);
            if (response.ok) {
                const data = await response.json();
                setInterviews(data || []);
            }
        } catch (error) {
            console.error("Failed to fetch interviews:", error);
            setInterviews([]);
        }
    };

    const fetchCandidateApplication = async (candidateId: string) => {
        try {
            const candidate = candidates.find(c => c._id === candidateId);
            if (!candidate) return;

            // Fetch application with resume/AI score
            const response = await fetch(`/api/applications?candidateEmail=${encodeURIComponent(candidate.email)}`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    // Get the most recent application with highest score (use matchScore which has the AI score)
                    const bestApp = data.sort((a: any, b: any) => (b.matchScore || b.aiScore || 0) - (a.matchScore || a.aiScore || 0))[0];
                    setCandidateApplication(bestApp);
                } else {
                    setCandidateApplication(null);
                }
            }
        } catch (error) {
            console.error("Failed to fetch candidate application:", error);
            setCandidateApplication(null);
        }
    };

    const selectedCandidate = candidates.find(c => c._id === selectedCandidateId);
    const candidateName = selectedCandidate?.profile?.firstName
        ? `${selectedCandidate.profile.firstName} ${selectedCandidate.profile.lastName || ""}`
        : selectedCandidate?.email || "Select Candidate";

    // Get resume score from candidate's application (AI match score)
    // matchScore has the real AI-generated score from application time
    const resumeScore = candidateApplication?.matchScore || candidateApplication?.aiScore || 0;

    // Calculate assessment scores - use actual completed assessments only
    const completedAssessments = assessmentResults.filter(r => r.status === 'completed' || r.status === 'evaluated');

    const avgAssessmentScore = completedAssessments.length > 0
        ? Math.round(completedAssessments.reduce((sum, r) => sum + (r.score || 0), 0) / completedAssessments.length)
        : 0;

    const avgIntegrityScore = completedAssessments.length > 0
        ? Math.round(completedAssessments.reduce((sum, r) => sum + (r.integrityScore || 100), 0) / completedAssessments.length)
        : 0;

    // Calculate hiring prediction: Resume Score (30%) + Assessment Score (70%)
    // This determines who goes to final interview
    const hasResumeScore = resumeScore > 0;
    const hasAssessmentData = completedAssessments.length > 0 && avgAssessmentScore > 0;

    let predictedHireScore = 0;
    let predictionBasis = "No data available";

    if (hasResumeScore && hasAssessmentData) {
        // Both available: Resume 30% + Assessment 70%
        predictedHireScore = Math.round(resumeScore * 0.3 + avgAssessmentScore * 0.7);
        predictionBasis = `Resume: ${resumeScore}% + Assessment: ${avgAssessmentScore}%`;
    } else if (hasAssessmentData) {
        // Only assessment available
        predictedHireScore = avgAssessmentScore;
        predictionBasis = `Assessment score: ${avgAssessmentScore}%`;
    } else if (hasResumeScore) {
        // Only resume score available - needs assessment
        predictedHireScore = resumeScore;
        predictionBasis = `Resume score only: ${resumeScore}% (awaiting assessment)`;
    }

    // Get recommendation for interview shortlisting
    const getRecommendation = () => {
        if (!hasResumeScore && !hasAssessmentData) return { label: "Pending Evaluation", color: "text-gray-600", bgColor: "bg-gray-50" };
        if (predictedHireScore >= 75) return { label: "Recommend for Interview", color: "text-green-600", bgColor: "bg-green-50" };
        if (predictedHireScore >= 60) return { label: "Consider for Interview", color: "text-blue-600", bgColor: "bg-blue-50" };
        if (predictedHireScore >= 45) return { label: "Review Needed", color: "text-yellow-600", bgColor: "bg-yellow-50" };
        return { label: "Not Recommended", color: "text-red-600", bgColor: "bg-red-50" };
    };

    const recommendation = getRecommendation();

    const skillsData = [
        { skill: "Resume Match", score: resumeScore || 0 },
        { skill: "Technical", score: avgAssessmentScore || 0 },
        { skill: "Problem Solving", score: avgAssessmentScore || 0 },
        { skill: "Integrity", score: avgIntegrityScore || 0 },
        { skill: "Combined", score: predictedHireScore || 0 },
    ];

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-600 bg-green-50";
        if (score >= 60) return "text-yellow-600 bg-yellow-50";
        return "text-red-600 bg-red-50";
    };

    const getRecommendationBadge = (rec: string) => {
        switch (rec) {
            case "strong_hire": return <Badge className="bg-green-600">Strong Hire</Badge>;
            case "hire": return <Badge className="bg-blue-600">Hire</Badge>;
            case "no_hire": return <Badge variant="destructive">No Hire</Badge>;
            default: return <Badge variant="secondary">{rec}</Badge>;
        }
    };

    if (isLoading) {
        return (
            <Layout title="Evaluation Hub">
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </Layout>
        );
    }

    if (candidates.length === 0) {
        return (
            <Layout title="Evaluation Hub">
                <Card className="p-12 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">No Candidates Yet</h3>
                    <p className="text-muted-foreground">Candidates who apply through the portal will appear here.</p>
                </Card>
            </Layout>
        );
    }

    return (
        <Layout title="Evaluation Hub">
            {/* Candidate Selector */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
                        <SelectTrigger className="w-[300px]">
                            <SelectValue placeholder="Select candidate" />
                        </SelectTrigger>
                        <SelectContent>
                            {candidates.map(c => (
                                <SelectItem key={c._id} value={c._id}>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarFallback className="text-xs">
                                                {(c.profile?.firstName?.[0] || c.email[0]).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span>
                                            {c.profile?.firstName
                                                ? `${c.profile.firstName} ${c.profile.lastName || ""}`
                                                : c.email}
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Badge variant="outline" className="text-primary border-primary">
                        {assessmentResults.length > 0 ? "Assessment Complete" : "Pending"}
                    </Badge>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportReport}>Export Report</Button>
                    <Button className="gap-2" onClick={handleGenerateOffer}>
                        <Sparkles className="h-4 w-4" />
                        Generate Offer
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                    {/* AI Prediction Card */}
                    <Card className={`bg-gradient-to-br ${recommendation.bgColor} border-primary/20`}>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Brain className="h-5 w-5 text-primary" />
                                    <span className="font-medium text-primary">AI Hiring Prediction</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className={`text-5xl font-bold ${recommendation.color}`}>
                                    {hasAssessmentData || hasResumeScore ? `${predictedHireScore}%` : "—"}
                                </div>
                                <div>
                                    <p className={`text-sm font-medium flex items-center gap-1 ${recommendation.color}`}>
                                        <TrendingUp className="h-4 w-4" />
                                        {recommendation.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {predictionBasis}
                                    </p>
                                </div>
                            </div>
                            {(hasAssessmentData || hasResumeScore) && (
                                <Progress value={predictedHireScore} className="mt-4 h-2" />
                            )}
                            {!hasAssessmentData && !hasResumeScore && (
                                <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                                    ⚠️ Complete assessments to get interview recommendation
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Assessment Results Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <ClipboardCheck className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">Assessment Results</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {assessmentResults.length === 0 ? (
                                <div className="text-center py-6 text-muted-foreground">
                                    <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                                    <p className="text-sm">No completed assessments</p>
                                </div>
                            ) : (
                                assessmentResults.map(result => (
                                    <div key={result._id} className="border rounded-lg p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium">{result.assessmentId?.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Completed {result.completedAt ? new Date(result.completedAt).toLocaleDateString() : 'N/A'}
                                                </p>
                                            </div>
                                            <Badge className={getScoreColor(result.score || 0)}>
                                                {result.score || 0}%
                                            </Badge>
                                        </div>

                                        {/* Score Breakdown */}
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Target className="h-4 w-4 text-blue-500" />
                                                <span className="text-muted-foreground">Score:</span>
                                                <span className="font-medium">{result.score || 0}%</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4 text-green-500" />
                                                <span className="text-muted-foreground">Integrity:</span>
                                                <span className="font-medium">{result.integrityScore || 100}%</span>
                                            </div>
                                        </div>

                                        {/* Proctoring Flags */}
                                        {result.proctoringReport?.flags && result.proctoringReport.flags.length > 0 && (
                                            <div className="pt-2 border-t">
                                                <p className="text-xs font-medium text-orange-600 mb-1 flex items-center gap-1">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    {result.proctoringReport.flags.length} Proctoring Flag(s)
                                                </p>
                                            </div>
                                        )}

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full gap-2"
                                            onClick={() => setSelectedResult(result)}
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            View Details
                                        </Button>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Skills Radar */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Skills Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={200}>
                                <RadarChart data={skillsData}>
                                    <PolarGrid stroke="hsl(var(--border))" />
                                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                                    <Radar
                                        name="Score"
                                        dataKey="score"
                                        stroke="hsl(var(--primary))"
                                        fill="hsl(var(--primary))"
                                        fillOpacity={0.3}
                                        strokeWidth={2}
                                    />
                                    <Tooltip />
                                </RadarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Center Column - Interview History */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Interview Scorecards</CardTitle>
                                <Badge variant="secondary">{interviews.length} Rounds</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[500px] pr-4">
                                <div className="space-y-4">
                                    {interviews.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <p>No interviews scheduled yet</p>
                                            <Button variant="outline" size="sm" className="mt-2" onClick={handleScheduleInterview}>
                                                Schedule Interview
                                            </Button>
                                        </div>
                                    ) : (
                                        interviews.map((interview: CandidateInterview) => (
                                            <div key={interview._id} className="border rounded-lg p-4 space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                                            {interview.round || 1}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium capitalize">{interview.type}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {new Date(interview.scheduledAt).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {interview.feedback?.recommendation && getRecommendationBadge(interview.feedback.recommendation)}
                                                    {!interview.feedback && <Badge variant="outline">{interview.status}</Badge>}
                                                </div>

                                                {interview.interviewers && interview.interviewers.length > 0 && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarFallback className="text-xs">
                                                                {interview.interviewers[0].name?.substring(0, 2).toUpperCase() || "??"}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-medium">{interview.interviewers[0].name}</span>
                                                    </div>
                                                )}

                                                {interview.feedback?.overallScore && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-muted-foreground">Score:</span>
                                                        <span className="text-lg font-bold text-green-600">
                                                            {interview.feedback.overallScore}/5
                                                        </span>
                                                        <div className="flex gap-0.5 ml-2">
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <Star
                                                                    key={star}
                                                                    className={`h-4 w-4 ${star <= (interview.feedback?.overallScore || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {interview.feedback?.notes && (
                                                    <div className="text-sm text-muted-foreground italic border-t pt-3">
                                                        "{interview.feedback.notes}"
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Actions */}
                <div className="space-y-6">
                    {/* Summary Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Bot className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">AI Summary</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className={`p-3 rounded-lg border ${recommendation.bgColor} border-opacity-50`}>
                                <p className={`text-sm font-medium ${recommendation.color}`}>
                                    {hasAssessmentData || hasResumeScore
                                        ? `${recommendation.label} (${predictedHireScore}% score)`
                                        : "Pending Evaluation - Complete assessments to proceed"}
                                </p>
                            </div>

                            {(hasAssessmentData || hasResumeScore) && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-green-600 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> STRENGTHS
                                    </p>
                                    <ul className="text-sm space-y-1 text-muted-foreground">
                                        {resumeScore >= 70 && (
                                            <li className="flex items-start gap-2">
                                                <span className="text-green-500">•</span>
                                                Strong resume match: {resumeScore}%
                                            </li>
                                        )}
                                        {avgAssessmentScore >= 70 && (
                                            <li className="flex items-start gap-2">
                                                <span className="text-green-500">•</span>
                                                High assessment score: {avgAssessmentScore}%
                                            </li>
                                        )}
                                        {avgIntegrityScore >= 90 && hasAssessmentData && (
                                            <li className="flex items-start gap-2">
                                                <span className="text-green-500">•</span>
                                                Excellent integrity: {avgIntegrityScore}%
                                            </li>
                                        )}
                                        {!resumeScore && !avgAssessmentScore && (
                                            <li className="text-muted-foreground italic">No strengths identified yet</li>
                                        )}
                                    </ul>
                                </div>
                            )}

                            {(hasAssessmentData || hasResumeScore) && (avgAssessmentScore < 50 || resumeScore < 50 || avgIntegrityScore < 80) && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                                        <XCircle className="h-3 w-3" /> CONCERNS
                                    </p>
                                    <ul className="text-sm space-y-1 text-muted-foreground">
                                        {resumeScore > 0 && resumeScore < 50 && (
                                            <li className="flex items-start gap-2">
                                                <span className="text-red-500">•</span>
                                                Low resume match: {resumeScore}%
                                            </li>
                                        )}
                                        {avgAssessmentScore > 0 && avgAssessmentScore < 50 && (
                                            <li className="flex items-start gap-2">
                                                <span className="text-red-500">•</span>
                                                Low assessment score: {avgAssessmentScore}%
                                            </li>
                                        )}
                                        {avgIntegrityScore < 80 && hasAssessmentData && (
                                            <li className="flex items-start gap-2">
                                                <span className="text-red-500">•</span>
                                                Integrity concerns: {avgIntegrityScore}%
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            )}

                            {!hasAssessmentData && !hasResumeScore && (
                                <div className="space-y-2 text-center py-4 text-muted-foreground">
                                    <p className="text-sm">📊 No evaluation data available</p>
                                    <p className="text-xs">Complete assessments to generate interview recommendation</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Decision Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Decision Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" onClick={handleMoveToOffer}>
                                <ThumbsUp className="h-4 w-4" />
                                Move to Offer
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                onClick={handleScheduleInterview}
                            >
                                <MessageSquare className="h-4 w-4" />
                                Schedule Interview
                            </Button>
                            <Button variant="outline" className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50" onClick={handleRejectCandidate}>
                                <ThumbsDown className="h-4 w-4" />
                                Reject Candidate
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Assessment Result Details Modal */}
            {selectedResult && (
                <AssessmentResultDetails
                    open={!!selectedResult}
                    onClose={() => setSelectedResult(null)}
                    result={selectedResult as any}
                />
            )}
        </Layout>
    );
}
