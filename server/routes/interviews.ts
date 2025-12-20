/**
 * Interview Scheduling API Routes
 * Phase 2A.1: Interview Management
 */

import { Router, Request, Response } from "express";
import { Interview, InterviewKit, InterviewFeedback, Candidate, User, Job } from "../db";
import AI from "../services/ai";

const router = Router();

// ==========================================
// INTERVIEW CRUD
// ==========================================

// List interviews (with filters)
router.get("/", async (req: Request, res: Response) => {
    try {
        const { status, type, interviewerId, candidateId, from, to, limit = 50 } = req.query;

        const query: any = {};
        if (status) query.status = status;
        if (type) query.type = type;
        if (candidateId) query.candidateId = candidateId;
        if (interviewerId) query["interviewers.userId"] = interviewerId;
        if (from || to) {
            query.scheduledAt = {};
            if (from) query.scheduledAt.$gte = new Date(from as string);
            if (to) query.scheduledAt.$lte = new Date(to as string);
        }

        const interviews = await Interview.find(query)
            .sort({ scheduledAt: 1 })
            .limit(Number(limit))
            .lean();

        res.json(interviews);
    } catch (error) {
        console.error("List interviews error:", error);
        res.status(500).json({ error: "Failed to fetch interviews" });
    }
});

// Get interview by ID
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const interview = await Interview.findById(req.params.id)
            .populate("kitId")
            .lean();

        if (!interview) {
            return res.status(404).json({ error: "Interview not found" });
        }
        res.json(interview);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch interview" });
    }
});

// Schedule new interview
router.post("/", async (req: Request, res: Response) => {
    try {
        const {
            candidateId,
            candidateEmail,
            candidateName,
            jobId,
            jobTitle,
            type,
            round,
            scheduledAt,
            duration,
            timezone,
            meetingLink,
            location,
            interviewers,
            kitId,
            notes,
            allowReschedule,
            sendCalendarInvite = true
        } = req.body;

        if (!candidateId || !scheduledAt) {
            return res.status(400).json({ error: "candidateId and scheduledAt are required" });
        }

        // Create interview
        const interview = new Interview({
            candidateId,
            candidateEmail,
            candidateName,
            jobId,
            jobTitle,
            type: type || "video",
            round: round || 1,
            scheduledAt: new Date(scheduledAt),
            duration: duration || 60,
            timezone: timezone || "Asia/Kolkata",
            meetingLink,
            location,
            interviewers: interviewers || [],
            kitId,
            notes,
            allowReschedule: allowReschedule !== false,
            status: "scheduled"
        });

        await interview.save();

        // Increment kit usage if selected
        if (kitId) {
            await InterviewKit.findByIdAndUpdate(kitId, { $inc: { usageCount: 1 } });
        }

        res.status(201).json({
            message: "Interview scheduled successfully",
            interview
        });
    } catch (error) {
        console.error("Schedule interview error:", error);
        res.status(500).json({ error: "Failed to schedule interview" });
    }
});

// Update interview
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const interview = await Interview.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: new Date() },
            { new: true }
        );

        if (!interview) {
            return res.status(404).json({ error: "Interview not found" });
        }
        res.json(interview);
    } catch (error) {
        res.status(500).json({ error: "Failed to update interview" });
    }
});

// Cancel interview
router.post("/:id/cancel", async (req: Request, res: Response) => {
    try {
        const { reason } = req.body;

        const interview = await Interview.findByIdAndUpdate(
            req.params.id,
            {
                status: "cancelled",
                notes: reason ? `Cancelled: ${reason}` : undefined,
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!interview) {
            return res.status(404).json({ error: "Interview not found" });
        }

        res.json({ message: "Interview cancelled", interview });
    } catch (error) {
        res.status(500).json({ error: "Failed to cancel interview" });
    }
});

// Reschedule interview
router.post("/:id/reschedule", async (req: Request, res: Response) => {
    try {
        const { newScheduledAt, reason } = req.body;

        if (!newScheduledAt) {
            return res.status(400).json({ error: "newScheduledAt is required" });
        }

        const interview = await Interview.findById(req.params.id);
        if (!interview) {
            return res.status(404).json({ error: "Interview not found" });
        }

        // Check if rescheduling is allowed
        if (!interview.allowReschedule) {
            return res.status(403).json({ error: "Rescheduling not allowed for this interview" });
        }

        if (interview.rescheduleCount >= interview.maxReschedules) {
            return res.status(403).json({ error: "Maximum reschedule limit reached" });
        }

        // Update interview
        interview.originalScheduledAt = interview.originalScheduledAt || interview.scheduledAt;
        interview.scheduledAt = new Date(newScheduledAt);
        interview.rescheduleCount += 1;
        interview.rescheduleReason = reason;
        interview.status = "rescheduled";
        interview.updatedAt = new Date();

        await interview.save();

        res.json({ message: "Interview rescheduled", interview });
    } catch (error) {
        res.status(500).json({ error: "Failed to reschedule interview" });
    }
});

// Complete interview
router.post("/:id/complete", async (req: Request, res: Response) => {
    try {
        const interview = await Interview.findByIdAndUpdate(
            req.params.id,
            {
                status: "completed",
                completedAt: new Date(),
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!interview) {
            return res.status(404).json({ error: "Interview not found" });
        }

        res.json({ message: "Interview marked as completed", interview });
    } catch (error) {
        res.status(500).json({ error: "Failed to complete interview" });
    }
});

// ==========================================
// INTERVIEW KITS
// ==========================================

// List interview kits
router.get("/kits", async (req: Request, res: Response) => {
    try {
        const { type, isTemplate } = req.query;
        const query: any = { isActive: true };
        if (type) query.type = type;
        if (isTemplate !== undefined) query.isTemplate = isTemplate === "true";

        const kits = await InterviewKit.find(query).sort({ createdAt: -1 });
        res.json(kits);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch interview kits" });
    }
});

// Create interview kit
router.post("/kits", async (req: Request, res: Response) => {
    try {
        const kit = new InterviewKit(req.body);
        await kit.save();
        res.status(201).json(kit);
    } catch (error) {
        res.status(500).json({ error: "Failed to create interview kit" });
    }
});

// AI Generate interview kit
router.post("/kits/generate", async (req: Request, res: Response) => {
    try {
        const { role, level, type, questionCount = 5 } = req.body;

        const prompt = `Generate an interview kit for a ${level} ${role} position.
Interview type: ${type || "behavioral"}
Number of questions: ${questionCount}

Return a JSON object with:
{
    "name": "Kit name",
    "description": "Brief description",
    "questions": [
        {
            "question": "The interview question",
            "category": "Category like Technical/Behavioral/Problem-Solving",
            "expectedAnswer": "What a good answer should include",
            "timeAllocation": 5,
            "scoringCriteria": "How to evaluate the answer"
        }
    ],
    "rubric": {
        "criteria": [
            { "name": "Criterion name", "description": "What to look for", "weight": 1 }
        ]
    }
}

Return ONLY valid JSON, no markdown.`;

        const response = await AI.callAI("email", prompt);

        // Parse JSON from response
        let parsed;
        try {
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("No JSON found");
            }
        } catch (parseError) {
            return res.status(500).json({ error: "Failed to parse AI response" });
        }

        res.json({
            ...parsed,
            type: type || "behavioral",
            targetRole: role,
            targetLevel: level,
            isTemplate: false
        });
    } catch (error) {
        console.error("AI generate kit error:", error);
        res.status(500).json({ error: "Failed to generate interview kit" });
    }
});

// Get kit by ID
router.get("/kits/:id", async (req: Request, res: Response) => {
    try {
        const kit = await InterviewKit.findById(req.params.id);
        if (!kit) {
            return res.status(404).json({ error: "Interview kit not found" });
        }
        res.json(kit);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch interview kit" });
    }
});

// Update kit
router.put("/kits/:id", async (req: Request, res: Response) => {
    try {
        const kit = await InterviewKit.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!kit) {
            return res.status(404).json({ error: "Interview kit not found" });
        }
        res.json(kit);
    } catch (error) {
        res.status(500).json({ error: "Failed to update interview kit" });
    }
});

// Delete kit
router.delete("/kits/:id", async (req: Request, res: Response) => {
    try {
        await InterviewKit.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ message: "Interview kit deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete interview kit" });
    }
});

// ==========================================
// FEEDBACK
// ==========================================

// Submit feedback
router.post("/:id/feedback", async (req: Request, res: Response) => {
    try {
        const interviewId = req.params.id;
        const {
            interviewerId,
            interviewerName,
            interviewerEmail,
            scores,
            overallScore,
            recommendation,
            strengths,
            concerns,
            technicalNotes,
            culturalFitNotes,
            generalNotes,
            recommendNextRound,
            suggestedNextRoundType
        } = req.body;

        // Check interview exists
        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ error: "Interview not found" });
        }

        // Create feedback
        const feedback = new InterviewFeedback({
            interviewId,
            interviewerId,
            interviewerName,
            interviewerEmail,
            candidateId: interview.candidateId,
            scores,
            overallScore,
            recommendation,
            strengths,
            concerns,
            technicalNotes,
            culturalFitNotes,
            generalNotes,
            recommendNextRound,
            suggestedNextRoundType
        });

        await feedback.save();

        // Update interview with feedback reference
        interview.feedback = feedback._id;
        interview.status = "completed";
        interview.completedAt = new Date();
        await interview.save();

        res.status(201).json({
            message: "Feedback submitted successfully",
            feedback
        });
    } catch (error) {
        console.error("Submit feedback error:", error);
        res.status(500).json({ error: "Failed to submit feedback" });
    }
});

// Get feedback for interview
router.get("/:id/feedback", async (req: Request, res: Response) => {
    try {
        const feedback = await InterviewFeedback.findOne({ interviewId: req.params.id });
        if (!feedback) {
            return res.status(404).json({ error: "Feedback not found" });
        }
        res.json(feedback);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch feedback" });
    }
});

// ==========================================
// CALENDAR INVITE
// ==========================================

// Generate ICS calendar file
router.get("/:id/calendar.ics", async (req: Request, res: Response) => {
    try {
        const interview = await Interview.findById(req.params.id);
        if (!interview) {
            return res.status(404).json({ error: "Interview not found" });
        }

        const startDate = new Date(interview.scheduledAt);
        const endDate = new Date(startDate.getTime() + interview.duration * 60000);

        const formatICSDate = (date: Date) => {
            return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        };

        const interviewerEmails = interview.interviewers
            .map((i: any) => `ATTENDEE:mailto:${i.email}`)
            .join("\n");

        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TalentOS//Interview Scheduling//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${interview._id}@talentos.com
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${interview.type.charAt(0).toUpperCase() + interview.type.slice(1)} Interview - ${interview.candidateName} (${interview.jobTitle || "Position"})
DESCRIPTION:Interview with ${interview.candidateName}\\n\\nMeeting Link: ${interview.meetingLink || "TBD"}\\n\\nRound: ${interview.round}
LOCATION:${interview.meetingLink || interview.location || "Online"}
${interviewerEmails}
ATTENDEE:mailto:${interview.candidateEmail}
STATUS:CONFIRMED
SEQUENCE:${interview.rescheduleCount || 0}
END:VEVENT
END:VCALENDAR`;

        res.setHeader("Content-Type", "text/calendar; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="interview-${interview._id}.ics"`);
        res.send(icsContent);
    } catch (error) {
        console.error("Calendar generation error:", error);
        res.status(500).json({ error: "Failed to generate calendar invite" });
    }
});

// ==========================================
// CANDIDATE-FACING
// ==========================================

// Get interviews for candidate
router.get("/candidate/:candidateId", async (req: Request, res: Response) => {
    try {
        const interviews = await Interview.find({
            candidateId: req.params.candidateId,
            status: { $in: ["scheduled", "confirmed", "rescheduled"] }
        })
            .sort({ scheduledAt: 1 })
            .lean();

        res.json(interviews);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch interviews" });
    }
});

// ==========================================
// AI INTERVIEW SUMMARIZER
// ==========================================

// Get AI summary for a candidate's all interviews
router.get("/candidate/:candidateId/summary", async (req: Request, res: Response) => {
    try {
        const { candidateId } = req.params;

        // Get all feedback for this candidate
        const feedback = await InterviewFeedback.find({ candidateId }).lean();

        if (feedback.length === 0) {
            return res.json({
                candidateId,
                summary: "No interview feedback available yet.",
                recommendation: "pending",
                score: 0,
                strengthsAggregated: [],
                concernsAggregated: []
            });
        }

        // Aggregate scores
        const scores = feedback.map((f: any) => f.overallScore || 0).filter(s => s > 0);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        // Aggregate strengths and concerns
        const allStrengths = feedback.flatMap((f: any) => f.strengths || []);
        const allConcerns = feedback.flatMap((f: any) => f.concerns || []);

        // Get recommendations count
        const recommendations = feedback.map((f: any) => f.recommendation).filter(Boolean);
        const hireCount = recommendations.filter(r => r === "strong_hire" || r === "hire").length;
        const noHireCount = recommendations.filter(r => r === "no_hire" || r === "strong_no_hire").length;

        // Determine overall recommendation
        let overallRecommendation = "pending";
        if (recommendations.length > 0) {
            if (hireCount > noHireCount) {
                overallRecommendation = avgScore >= 4 ? "strong_hire" : "hire";
            } else if (noHireCount > hireCount) {
                overallRecommendation = "no_hire";
            } else {
                overallRecommendation = "needs_discussion";
            }
        }

        res.json({
            candidateId,
            totalInterviews: feedback.length,
            averageScore: avgScore,
            recommendation: overallRecommendation,
            strengthsAggregated: Array.from(new Set(allStrengths)).slice(0, 5),
            concernsAggregated: Array.from(new Set(allConcerns)).slice(0, 5),
            interviewerVotes: {
                hire: hireCount,
                noHire: noHireCount,
                pending: recommendations.length - hireCount - noHireCount
            }
        });
    } catch (error) {
        console.error("Candidate summary error:", error);
        res.status(500).json({ error: "Failed to generate summary" });
    }
});

// AI-powered detailed analysis
router.post("/candidate/:candidateId/ai-analysis", async (req: Request, res: Response) => {
    try {
        const { candidateId } = req.params;

        // Get all feedback
        const feedback = await InterviewFeedback.find({ candidateId }).lean();
        const interviews = await Interview.find({ candidateId }).lean();

        if (feedback.length === 0) {
            return res.status(400).json({ error: "No feedback available for analysis" });
        }

        // Prepare data for AI
        const feedbackSummaries = feedback.map((f: any) => ({
            interviewer: f.interviewerName,
            score: f.overallScore,
            recommendation: f.recommendation,
            strengths: f.strengths?.join(", "),
            concerns: f.concerns?.join(", "),
            notes: f.generalNotes
        }));

        const prompt = `Analyze these interview feedbacks for a job candidate and provide a comprehensive hiring recommendation:

Interview Feedback:
${JSON.stringify(feedbackSummaries, null, 2)}

Please provide:
1. A brief summary (2-3 sentences) of the candidate's overall performance
2. Top 3 strengths consistently mentioned
3. Top 3 areas of concern
4. Your hiring recommendation (Strong Hire, Hire, Maybe, No Hire) with reasoning
5. Suggested next steps

Return as JSON:
{
    "summary": "...",
    "strengths": ["..."],
    "concerns": ["..."],
    "recommendation": "Hire/No Hire/Strong Hire/Maybe",
    "reasoning": "...",
    "nextSteps": "..."
}

Return ONLY valid JSON.`;

        const aiResponse = await AI.callAI("email", prompt);

        // Parse response
        let analysis;
        try {
            const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("No JSON found");
            }
        } catch (parseError) {
            // Fallback to basic analysis
            analysis = {
                summary: "Multiple interviews completed. See individual feedback for details.",
                strengths: feedback.flatMap((f: any) => f.strengths || []).slice(0, 3),
                concerns: feedback.flatMap((f: any) => f.concerns || []).slice(0, 3),
                recommendation: "Review Needed",
                reasoning: "AI analysis unavailable. Please review individual feedback.",
                nextSteps: "Discuss with hiring team."
            };
        }

        res.json({
            candidateId,
            generatedAt: new Date().toISOString(),
            interviewCount: feedback.length,
            ...analysis
        });
    } catch (error) {
        console.error("AI analysis error:", error);
        res.status(500).json({ error: "Failed to generate AI analysis" });
    }
});

export default router;
