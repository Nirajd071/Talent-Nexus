/**
 * Candidate Comparison API Routes
 * Side-by-side comparison with AI analysis
 */

import { Router, Request, Response } from "express";
import { Candidate, Application, Job } from "../db";
import AI from "../services/ai";
import mongoose from "mongoose";

const router = Router();

// ==========================================
// SAVED COMPARISONS SCHEMA
// ==========================================

const comparisonSchema = new mongoose.Schema({
    name: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    jobTitle: String,
    candidateIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Candidate" }],
    comparisonData: mongoose.Schema.Types.Mixed,
    aiAnalysis: mongoose.Schema.Types.Mixed,
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
    notes: String,
    createdAt: { type: Date, default: Date.now }
});

const Comparison = mongoose.models.Comparison || mongoose.model("Comparison", comparisonSchema);

// ==========================================
// COMPARE CANDIDATES
// ==========================================

// Compare candidates for a job
router.post("/compare", async (req: Request, res: Response) => {
    try {
        const { candidateIds, jobId, userId } = req.body;

        if (!candidateIds || candidateIds.length < 2) {
            return res.status(400).json({ error: "At least 2 candidates required" });
        }

        if (candidateIds.length > 4) {
            return res.status(400).json({ error: "Maximum 4 candidates allowed" });
        }

        // Fetch candidates
        const candidates = await Candidate.find({ _id: { $in: candidateIds } }).lean();
        if (candidates.length !== candidateIds.length) {
            return res.status(404).json({ error: "Some candidates not found" });
        }

        // Fetch job if provided
        let job: any = null;
        if (jobId) {
            job = await Job.findById(jobId).lean();
        }

        // Get application scores if available
        const applications = await Application.find({
            candidateId: { $in: candidateIds },
            jobId
        }).lean();

        // Build comparison data
        const comparisonData = candidates.map((c: any) => {
            const app = applications.find((a: any) => a.candidateId?.toString() === c._id.toString());
            return {
                id: c._id,
                name: c.name,
                email: c.email,
                skills: c.skills || [],
                experienceYears: c.experienceYears || 0,
                education: c.education || [],
                location: c.location,
                source: c.source,
                aiScore: app?.aiScore || 0,
                status: app?.status || c.status,
                appliedAt: app?.appliedAt
            };
        });

        // Calculate match scores for each category
        const categories = ["skills", "experience", "education", "cultural_fit"];
        const scores: Record<string, Record<string, number>> = {};

        comparisonData.forEach((c: any) => {
            scores[c.id] = {
                skills: calculateSkillScore(c.skills, job?.skills || []),
                experience: calculateExperienceScore(c.experienceYears, job?.experience),
                education: calculateEducationScore(c.education),
                cultural_fit: 70 + Math.random() * 20, // Placeholder
                overall: c.aiScore || 0
            };
        });

        res.json({
            candidates: comparisonData,
            scores,
            job: job ? { id: job._id, title: job.title, skills: job.skills } : null
        });
    } catch (error) {
        console.error("Compare error:", error);
        res.status(500).json({ error: "Failed to compare candidates" });
    }
});

// AI-powered detailed comparison
router.post("/compare/ai-analysis", async (req: Request, res: Response) => {
    try {
        const { candidateIds, jobId, userId } = req.body;

        if (!candidateIds || candidateIds.length < 2) {
            return res.status(400).json({ error: "At least 2 candidates required" });
        }

        // Fetch candidates
        const candidates = await Candidate.find({ _id: { $in: candidateIds } }).lean();
        let job: any = null;
        if (jobId) {
            job = await Job.findById(jobId).lean();
        }

        // Prepare data for AI
        const candidateSummaries = candidates.map((c: any) => ({
            id: c._id,
            name: c.name,
            skills: c.skills?.join(", ") || "Not specified",
            experience: `${c.experienceYears || 0} years`,
            education: c.education?.map((e: any) => e.degree).join(", ") || "Not specified",
            location: c.location || "Not specified"
        }));

        const systemPrompt = `You are a senior hiring manager. Compare candidates and provide detailed analysis.
Return ONLY valid JSON:
{
    "comparison": {
        "skills": {"winner": "candidate_name", "analysis": "..."},
        "experience": {"winner": "candidate_name", "analysis": "..."},
        "education": {"winner": "candidate_name", "analysis": "..."},
        "overall": {"winner": "candidate_name", "analysis": "..."}
    },
    "recommendation": {
        "topChoice": "candidate_name",
        "reasoning": "...",
        "concerns": ["..."],
        "nextSteps": "..."
    },
    "eachCandidate": [
        {"name": "...", "strengths": ["..."], "weaknesses": ["..."], "rating": 1-10}
    ]
}`;

        const prompt = `Compare these candidates${job ? ` for the ${job.title} position` : ""}:

${candidateSummaries.map((c, i) => `
Candidate ${i + 1}: ${c.name}
- Skills: ${c.skills}
- Experience: ${c.experience}
- Education: ${c.education}
- Location: ${c.location}
`).join("\n")}

${job ? `\nJob Requirements:\n- Title: ${job.title}\n- Skills: ${job.skills?.join(", ")}\n- Experience: ${job.experience}` : ""}

Provide detailed comparison and recommendation.`;

        const response = await AI.callAI("candidateAnalysis", prompt, systemPrompt, { userId });

        let analysis;
        try {
            analysis = JSON.parse(response.content);
        } catch {
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        }

        if (!analysis) {
            return res.status(500).json({ error: "Failed to parse AI response" });
        }

        res.json({
            candidates: candidateSummaries,
            analysis,
            generatedAt: new Date().toISOString()
        });
    } catch (error: any) {
        console.error("AI analysis error:", error);
        res.status(500).json({ error: "Failed to generate AI analysis", details: error.message });
    }
});

// ==========================================
// SAVED COMPARISONS
// ==========================================

// Save comparison
router.post("/save", async (req: Request, res: Response) => {
    try {
        const { name, userId, jobId, jobTitle, candidateIds, comparisonData, aiAnalysis, winner, notes } = req.body;

        const comparison = new Comparison({
            name: name || `Comparison ${new Date().toLocaleDateString()}`,
            userId,
            jobId,
            jobTitle,
            candidateIds,
            comparisonData,
            aiAnalysis,
            winner,
            notes
        });

        await comparison.save();
        res.status(201).json(comparison);
    } catch (error) {
        res.status(500).json({ error: "Failed to save comparison" });
    }
});

// Get saved comparisons
router.get("/saved", async (req: Request, res: Response) => {
    try {
        const { userId, jobId } = req.query;
        const query: any = {};
        if (userId) query.userId = userId;
        if (jobId) query.jobId = jobId;

        const comparisons = await Comparison.find(query)
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        res.json(comparisons);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch comparisons" });
    }
});

// Get comparison by ID
router.get("/saved/:id", async (req: Request, res: Response) => {
    try {
        const comparison = await Comparison.findById(req.params.id).lean();
        if (!comparison) return res.status(404).json({ error: "Comparison not found" });
        res.json(comparison);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch comparison" });
    }
});

// Delete comparison
router.delete("/saved/:id", async (req: Request, res: Response) => {
    try {
        await Comparison.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete comparison" });
    }
});

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function calculateSkillScore(candidateSkills: string[], requiredSkills: string[]): number {
    if (!requiredSkills || requiredSkills.length === 0) return 75;
    if (!candidateSkills || candidateSkills.length === 0) return 30;

    const normalizedCandidate = candidateSkills.map(s => s.toLowerCase().trim());
    const normalizedRequired = requiredSkills.map(s => s.toLowerCase().trim());

    let matches = 0;
    normalizedRequired.forEach(skill => {
        if (normalizedCandidate.some(cs => cs.includes(skill) || skill.includes(cs))) {
            matches++;
        }
    });

    return Math.round((matches / normalizedRequired.length) * 100);
}

function calculateExperienceScore(years: number, required?: string): number {
    if (!required) return 70;

    // Parse required experience (e.g., "3+ years", "5-7 years")
    const match = required.match(/(\d+)/);
    if (!match) return 70;

    const requiredYears = parseInt(match[1]);

    if (years >= requiredYears + 2) return 100;
    if (years >= requiredYears) return 90;
    if (years >= requiredYears - 1) return 70;
    if (years >= requiredYears - 2) return 50;
    return 30;
}

function calculateEducationScore(education: any[]): number {
    if (!education || education.length === 0) return 50;

    const degrees = education.map(e => e.degree?.toLowerCase() || "");

    if (degrees.some(d => d.includes("phd") || d.includes("doctorate"))) return 100;
    if (degrees.some(d => d.includes("master") || d.includes("mba") || d.includes("mtech"))) return 90;
    if (degrees.some(d => d.includes("bachelor") || d.includes("btech") || d.includes("b.e"))) return 75;
    return 50;
}

// ==========================================
// EXPORT COMPARISON REPORT
// ==========================================

router.get("/export/:id", async (req: Request, res: Response) => {
    try {
        const comparison = await Comparison.findById(req.params.id)
            .populate("candidateIds")
            .lean();

        if (!comparison) return res.status(404).json({ error: "Comparison not found" });

        // Generate text report
        const candidates = comparison.candidateIds as any[];
        const analysis = comparison.aiAnalysis as any;

        let report = `CANDIDATE COMPARISON REPORT\n`;
        report += `Generated: ${new Date().toLocaleDateString()}\n`;
        report += `Job: ${comparison.jobTitle || "General"}\n`;
        report += `\n${"=".repeat(50)}\n\n`;

        candidates.forEach((c: any, i: number) => {
            report += `CANDIDATE ${i + 1}: ${c.name}\n`;
            report += `-`.repeat(30) + `\n`;
            report += `Email: ${c.email}\n`;
            report += `Experience: ${c.experienceYears || 0} years\n`;
            report += `Skills: ${c.skills?.join(", ") || "N/A"}\n`;
            report += `\n`;
        });

        if (analysis?.recommendation) {
            report += `\nRECOMMENDATION\n`;
            report += `${"=".repeat(50)}\n`;
            report += `Top Choice: ${analysis.recommendation.topChoice}\n`;
            report += `Reasoning: ${analysis.recommendation.reasoning}\n`;
        }

        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Content-Disposition", `attachment; filename="comparison-${req.params.id}.txt"`);
        res.send(report);
    } catch (error) {
        res.status(500).json({ error: "Failed to export comparison" });
    }
});

export default router;
