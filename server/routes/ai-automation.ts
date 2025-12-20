/**
 * AI Automation API Routes
 * Comprehensive AI-powered automation using NVIDIA NIM
 */

import { Router, Request, Response } from "express";
import AI from "../services/ai";
import { Candidate, Job, Application } from "../db";
import mongoose from "mongoose";

const router = Router();

// ==========================================
// TALENT POOL SCHEMA
// ==========================================

const talentPoolSchema = new mongoose.Schema({
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
    candidateName: String,
    candidateEmail: String,
    skills: [String],
    experience: Number,
    notes: String,
    tags: [String],
    addedBy: String,
    matchedJobs: [{ jobId: mongoose.Schema.Types.ObjectId, score: Number, matchedAt: Date }],
    createdAt: { type: Date, default: Date.now }
});

const TalentPool = mongoose.models.TalentPool || mongoose.model("TalentPool", talentPoolSchema);

// ==========================================
// RESUME PARSING
// ==========================================

// Parse resume text with AI
router.post("/parse-resume", async (req: Request, res: Response) => {
    try {
        const { resumeText, userId } = req.body;

        if (!resumeText) {
            return res.status(400).json({ error: "Resume text is required" });
        }

        const parsed = await AI.parseResume(resumeText, userId);
        res.json({ success: true, data: parsed });
    } catch (error: any) {
        console.error("Parse resume error:", error);
        res.status(500).json({ error: "Failed to parse resume", details: error.message });
    }
});

// ==========================================
// SKILLS EXTRACTION
// ==========================================

router.post("/extract-skills", async (req: Request, res: Response) => {
    try {
        const { text, userId } = req.body;

        if (!text) {
            return res.status(400).json({ error: "Text is required" });
        }

        const skills = await AI.extractSkills(text, userId);
        res.json({ success: true, data: skills });
    } catch (error: any) {
        console.error("Extract skills error:", error);
        res.status(500).json({ error: "Failed to extract skills", details: error.message });
    }
});

// ==========================================
// CANDIDATE SCORING & MATCHING
// ==========================================

// Score candidate against job
router.post("/score-candidate", async (req: Request, res: Response) => {
    try {
        const { candidateId, jobId, userId } = req.body;

        // Fetch candidate and job
        const candidate = await Candidate.findById(candidateId).lean();
        const job = await Job.findById(jobId).lean();

        if (!candidate || !job) {
            return res.status(404).json({ error: "Candidate or job not found" });
        }

        const resumeData = {
            name: candidate.name,
            skills: candidate.skills || [],
            experienceYears: candidate.experienceYears,
            education: candidate.education || []
        };

        const jobRequirements = {
            title: job.title,
            skills: job.skills || [],
            experience: job.experience,
            description: job.description
        };

        const score = await AI.scoreCandidate(resumeData, jobRequirements, userId);

        // Update application with score if exists
        await Application.findOneAndUpdate(
            { candidateId, jobId },
            { aiScore: score.overallScore, aiAnalysis: score },
            { upsert: false }
        );

        res.json({ success: true, data: score });
    } catch (error: any) {
        console.error("Score candidate error:", error);
        res.status(500).json({ error: "Failed to score candidate", details: error.message });
    }
});

// Bulk score all candidates for a job
router.post("/bulk-score/:jobId", async (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;
        const { userId } = req.body;

        const job = await Job.findById(jobId).lean();
        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }

        // Get all applications for this job
        const applications = await Application.find({ jobId }).populate("candidateId").lean();

        const results: any[] = [];

        for (const app of applications) {
            try {
                const candidate = app.candidateId as any;
                if (!candidate) continue;

                const resumeData = {
                    name: candidate.name,
                    skills: candidate.skills || [],
                    experienceYears: candidate.experienceYears
                };

                const jobRequirements = {
                    title: job.title,
                    skills: (job as any).skills || [],
                    experience: (job as any).experience
                };

                const score = await AI.scoreCandidate(resumeData, jobRequirements, userId);

                // Update application
                await Application.findByIdAndUpdate(app._id, {
                    aiScore: score.overallScore,
                    aiAnalysis: score
                });

                results.push({
                    candidateId: candidate._id,
                    name: candidate.name,
                    score: score.overallScore,
                    strengths: score.strengths,
                    redFlags: score.redFlags
                });
            } catch (err) {
                console.error(`Scoring error for ${app._id}:`, err);
            }
        }

        // Sort by score descending
        results.sort((a, b) => b.score - a.score);

        res.json({ success: true, scored: results.length, results });
    } catch (error: any) {
        console.error("Bulk score error:", error);
        res.status(500).json({ error: "Failed to bulk score", details: error.message });
    }
});

// ==========================================
// CANDIDATE RANKING
// ==========================================

router.post("/rank-candidates/:jobId", async (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;
        const { userId } = req.body;

        const job = await Job.findById(jobId).lean();
        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }

        // Get top candidates with scores
        const applications = await Application.find({ jobId, aiScore: { $exists: true } })
            .populate("candidateId")
            .sort({ aiScore: -1 })
            .limit(20)
            .lean();

        const candidates = applications.map((app: any) => ({
            id: app.candidateId?._id?.toString(),
            name: app.candidateId?.name,
            score: app.aiScore || 0,
            skills: app.candidateId?.skills || []
        })).filter(c => c.id);

        if (candidates.length === 0) {
            return res.json({ success: true, rankings: [], message: "No scored candidates found" });
        }

        const jobRequirements = {
            skills: (job as any).skills || [],
            experience: (job as any).experience || ""
        };

        const rankings = await AI.rankCandidates(candidates, jobRequirements, userId);

        res.json({ success: true, rankings });
    } catch (error: any) {
        console.error("Rank candidates error:", error);
        res.status(500).json({ error: "Failed to rank candidates", details: error.message });
    }
});

// ==========================================
// JOB DESCRIPTION GENERATION
// ==========================================

router.post("/generate-job-description", async (req: Request, res: Response) => {
    try {
        const { title, department, requirements, userId } = req.body;

        if (!title) {
            return res.status(400).json({ error: "Job title is required" });
        }

        const result = await AI.generateJobDescription({
            title,
            department: department || "General",
            requirements: requirements || []
        }, userId);

        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error("Generate JD error:", error);
        res.status(500).json({ error: "Failed to generate job description", details: error.message });
    }
});

// ==========================================
// EMAIL GENERATION
// ==========================================

router.post("/generate-email", async (req: Request, res: Response) => {
    try {
        const { type, candidateName, details, userId } = req.body;

        if (!type || !candidateName) {
            return res.status(400).json({ error: "Type and candidateName are required" });
        }

        const validTypes = ["interview_invite", "offer", "rejection", "follow_up", "outreach"];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` });
        }

        const email = await AI.generateEmail(type, candidateName, details || {}, userId);
        res.json({ success: true, data: email });
    } catch (error: any) {
        console.error("Generate email error:", error);
        res.status(500).json({ error: "Failed to generate email", details: error.message });
    }
});

// ==========================================
// INTERVIEW SUMMARY
// ==========================================

router.post("/summarize-interview", async (req: Request, res: Response) => {
    try {
        const { transcript, userId } = req.body;

        if (!transcript) {
            return res.status(400).json({ error: "Interview transcript is required" });
        }

        const summary = await AI.generateInterviewSummary(transcript, userId);
        res.json({ success: true, data: summary });
    } catch (error: any) {
        console.error("Summarize interview error:", error);
        res.status(500).json({ error: "Failed to summarize interview", details: error.message });
    }
});

// ==========================================
// TALENT POOL
// ==========================================

// Add to talent pool
router.post("/talent-pool", async (req: Request, res: Response) => {
    try {
        const { candidateId, notes, tags, addedBy } = req.body;

        const candidate = await Candidate.findById(candidateId).lean();
        if (!candidate) {
            return res.status(404).json({ error: "Candidate not found" });
        }

        // Check if already in pool
        const existing = await TalentPool.findOne({ candidateId });
        if (existing) {
            return res.status(400).json({ error: "Candidate already in talent pool" });
        }

        const poolEntry = new TalentPool({
            candidateId,
            candidateName: candidate.name,
            candidateEmail: candidate.email,
            skills: candidate.skills || [],
            experience: candidate.experienceYears,
            notes,
            tags: tags || [],
            addedBy
        });

        await poolEntry.save();
        res.status(201).json({ success: true, data: poolEntry });
    } catch (error: any) {
        console.error("Add to talent pool error:", error);
        res.status(500).json({ error: "Failed to add to talent pool" });
    }
});

// Get talent pool
router.get("/talent-pool", async (req: Request, res: Response) => {
    try {
        const { skills, tags, limit = 50 } = req.query;
        const query: any = {};

        if (skills) {
            const skillList = (skills as string).split(",");
            query.skills = { $in: skillList };
        }
        if (tags) {
            const tagList = (tags as string).split(",");
            query.tags = { $in: tagList };
        }

        const pool = await TalentPool.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .lean();

        res.json(pool);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch talent pool" });
    }
});

// Auto-match talent pool to new job
router.post("/talent-pool/match/:jobId", async (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;
        const { userId } = req.body;

        const job = await Job.findById(jobId).lean();
        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }

        const poolCandidates = await TalentPool.find().lean();
        const matches: any[] = [];

        for (const poolEntry of poolCandidates) {
            try {
                const resumeData = {
                    name: poolEntry.candidateName,
                    skills: poolEntry.skills,
                    experienceYears: poolEntry.experience
                };

                const jobRequirements = {
                    title: job.title,
                    skills: (job as any).skills || [],
                    experience: (job as any).experience
                };

                const score = await AI.scoreCandidate(resumeData, jobRequirements, userId);

                if (score.overallScore >= 60) {
                    // Update pool entry with matched job
                    await TalentPool.findByIdAndUpdate(poolEntry._id, {
                        $push: {
                            matchedJobs: {
                                jobId,
                                score: score.overallScore,
                                matchedAt: new Date()
                            }
                        }
                    });

                    matches.push({
                        candidateId: poolEntry.candidateId,
                        name: poolEntry.candidateName,
                        email: poolEntry.candidateEmail,
                        score: score.overallScore,
                        strengths: score.strengths
                    });
                }
            } catch (err) {
                console.error(`Match error for ${poolEntry._id}:`, err);
            }
        }

        matches.sort((a, b) => b.score - a.score);
        res.json({ success: true, jobTitle: job.title, matches });
    } catch (error: any) {
        console.error("Talent pool match error:", error);
        res.status(500).json({ error: "Failed to match talent pool" });
    }
});

// Remove from talent pool
router.delete("/talent-pool/:id", async (req: Request, res: Response) => {
    try {
        await TalentPool.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to remove from talent pool" });
    }
});

// ==========================================
// SMART SEARCH
// ==========================================

router.post("/smart-search", async (req: Request, res: Response) => {
    try {
        const { query, userId } = req.body;

        if (!query) {
            return res.status(400).json({ error: "Search query is required" });
        }

        // Use AI to interpret the natural language query
        const systemPrompt = `You are a search query interpreter for an ATS system.
Given a natural language search query, extract:
- skills: array of skills to search for
- experience: minimum years of experience (number or null)
- location: location to filter (string or null)
- status: candidate status filter (string or null)

Return ONLY valid JSON:
{"skills": [], "experience": null, "location": null, "status": null}`;

        const response = await AI.callAI("extraction", query, systemPrompt, { userId });

        let searchCriteria;
        try {
            searchCriteria = JSON.parse(response.content);
        } catch {
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            searchCriteria = jsonMatch ? JSON.parse(jsonMatch[0]) : { skills: [], experience: null, location: null, status: null };
        }

        // Build MongoDB query
        const mongoQuery: any = {};
        if (searchCriteria.skills?.length > 0) {
            mongoQuery.skills = { $in: searchCriteria.skills };
        }
        if (searchCriteria.experience) {
            mongoQuery.experienceYears = { $gte: searchCriteria.experience };
        }
        if (searchCriteria.location) {
            mongoQuery.location = { $regex: searchCriteria.location, $options: "i" };
        }
        if (searchCriteria.status) {
            mongoQuery.status = searchCriteria.status;
        }

        const candidates = await Candidate.find(mongoQuery).limit(20).lean();

        res.json({
            success: true,
            interpretedQuery: searchCriteria,
            results: candidates
        });
    } catch (error: any) {
        console.error("Smart search error:", error);
        res.status(500).json({ error: "Failed to perform smart search" });
    }
});

// ==========================================
// AUTO-REPLY SUGGESTIONS
// ==========================================

router.post("/suggest-reply", async (req: Request, res: Response) => {
    try {
        const { candidateName, candidateMessage, context, userId } = req.body;

        if (!candidateMessage) {
            return res.status(400).json({ error: "Candidate message is required" });
        }

        const systemPrompt = `You are an HR assistant. Generate 3 professional reply options for a candidate message.
Return ONLY valid JSON:
{
    "replies": [
        {"tone": "professional", "text": "..."},
        {"tone": "friendly", "text": "..."},
        {"tone": "brief", "text": "..."}
    ]
}`;

        const prompt = `Candidate: ${candidateName || "Candidate"}
Their message: "${candidateMessage}"
Context: ${context || "General inquiry"}

Generate 3 reply options.`;

        const response = await AI.callAI("email", prompt, systemPrompt, { userId });

        let suggestions;
        try {
            suggestions = JSON.parse(response.content);
        } catch {
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : { replies: [] };
        }

        res.json({ success: true, data: suggestions });
    } catch (error: any) {
        console.error("Suggest reply error:", error);
        res.status(500).json({ error: "Failed to generate reply suggestions" });
    }
});

export default router;
