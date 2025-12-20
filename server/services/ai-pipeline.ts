/**
 * AI Pipeline Service
 * Automated AI processing for the entire hiring workflow
 */

import AI from "./ai";
import { emitTalentEvent } from "./event-bus";
import mongoose from "mongoose";

// ==========================================
// AUTO SCORE NEW APPLICATIONS
// ==========================================

export async function autoScoreApplication(applicationId: string): Promise<{
    score: number;
    analysis: any;
} | null> {
    try {
        const Application = mongoose.models.Application;
        const Candidate = mongoose.models.Candidate;
        const Job = mongoose.models.Job;

        if (!Application || !Candidate || !Job) return null;

        const application = await Application.findById(applicationId).lean();
        if (!application) return null;

        const candidate = await Candidate.findById((application as any).candidateId).lean();
        const job = await Job.findById((application as any).jobId).lean();

        if (!candidate || !job) return null;

        // Build resume data
        const resumeData = {
            name: (candidate as any).name,
            skills: (candidate as any).skills || [],
            experienceYears: (candidate as any).experienceYears || 0,
            education: (candidate as any).education || []
        };

        // Build job requirements
        const jobRequirements = {
            title: (job as any).title,
            skills: (job as any).skills || [],
            experience: (job as any).experience,
            description: (job as any).description
        };

        // Score with AI
        const score = await AI.scoreCandidate(resumeData, jobRequirements);

        // Update application
        await Application.findByIdAndUpdate(applicationId, {
            aiScore: score.overallScore,
            aiAnalysis: score
        });

        // Emit event
        emitTalentEvent("application:scored", {
            applicationId,
            candidateId: (application as any).candidateId?.toString(),
            candidateName: (candidate as any).name,
            jobId: (application as any).jobId?.toString(),
            jobTitle: (job as any).title,
            metadata: { score: score.overallScore }
        });

        return {
            score: score.overallScore,
            analysis: score
        };
    } catch (error) {
        console.error("[AI Pipeline] Auto score error:", error);
        return null;
    }
}

// ==========================================
// AUTO MATCH TALENT POOL TO NEW JOB
// ==========================================

export async function autoMatchTalentPool(jobId: string): Promise<{
    matches: Array<{ candidateId: string; name: string; score: number }>;
}> {
    try {
        const Job = mongoose.models.Job;
        const TalentPool = mongoose.models.TalentPool;

        if (!Job || !TalentPool) return { matches: [] };

        const job = await Job.findById(jobId).lean();
        if (!job) return { matches: [] };

        const poolCandidates = await TalentPool.find().lean();
        const matches: Array<{ candidateId: string; name: string; score: number }> = [];

        for (const entry of poolCandidates) {
            const resumeData = {
                name: (entry as any).candidateName,
                skills: (entry as any).skills || [],
                experienceYears: (entry as any).experience || 0
            };

            const jobRequirements = {
                title: (job as any).title,
                skills: (job as any).skills || [],
                experience: (job as any).experience
            };

            try {
                const score = await AI.scoreCandidate(resumeData, jobRequirements);

                if (score.overallScore >= 60) {
                    matches.push({
                        candidateId: (entry as any).candidateId?.toString(),
                        name: (entry as any).candidateName,
                        score: score.overallScore
                    });

                    // Update talent pool entry
                    await TalentPool.findByIdAndUpdate((entry as any)._id, {
                        $push: {
                            matchedJobs: {
                                jobId,
                                score: score.overallScore,
                                matchedAt: new Date()
                            }
                        }
                    });
                }
            } catch (err) {
                console.error(`[AI Pipeline] Match error for ${(entry as any)._id}:`, err);
            }
        }

        // Sort by score
        matches.sort((a, b) => b.score - a.score);

        return { matches };
    } catch (error) {
        console.error("[AI Pipeline] Talent pool match error:", error);
        return { matches: [] };
    }
}

// ==========================================
// GENERATE SMART EMAIL
// ==========================================

export async function generateSmartEmail(opts: {
    type: "interview_invite" | "offer" | "rejection" | "follow_up" | "outreach";
    candidateId: string;
    jobId?: string;
    additionalContext?: Record<string, any>;
}): Promise<{ subject: string; body: string } | null> {
    try {
        const Candidate = mongoose.models.Candidate;
        const Job = mongoose.models.Job;

        if (!Candidate) return null;

        const candidate = await Candidate.findById(opts.candidateId).lean();
        if (!candidate) return null;

        let job: any = null;
        if (opts.jobId && Job) {
            job = await Job.findById(opts.jobId).lean();
        }

        const details = {
            jobTitle: job?.title || "the position",
            companyName: "TalentOS",
            ...opts.additionalContext
        };

        const email = await AI.generateEmail(
            opts.type,
            (candidate as any).name,
            details
        );

        return email;
    } catch (error) {
        console.error("[AI Pipeline] Generate email error:", error);
        return null;
    }
}

// ==========================================
// BULK AI SCORING
// ==========================================

export async function bulkScoreJob(jobId: string): Promise<{
    scored: number;
    results: Array<{ candidateId: string; name: string; score: number }>;
}> {
    try {
        const Application = mongoose.models.Application;
        const Candidate = mongoose.models.Candidate;
        const Job = mongoose.models.Job;

        if (!Application || !Candidate || !Job) return { scored: 0, results: [] };

        const job = await Job.findById(jobId).lean();
        if (!job) return { scored: 0, results: [] };

        const applications = await Application.find({ jobId }).lean();
        const results: Array<{ candidateId: string; name: string; score: number }> = [];

        for (const app of applications) {
            const candidate = await Candidate.findById((app as any).candidateId).lean();
            if (!candidate) continue;

            const resumeData = {
                name: (candidate as any).name,
                skills: (candidate as any).skills || [],
                experienceYears: (candidate as any).experienceYears || 0
            };

            const jobRequirements = {
                title: (job as any).title,
                skills: (job as any).skills || [],
                experience: (job as any).experience
            };

            try {
                const score = await AI.scoreCandidate(resumeData, jobRequirements);

                await Application.findByIdAndUpdate((app as any)._id, {
                    aiScore: score.overallScore,
                    aiAnalysis: score
                });

                results.push({
                    candidateId: (candidate as any)._id?.toString(),
                    name: (candidate as any).name,
                    score: score.overallScore
                });
            } catch (err) {
                console.error(`[AI Pipeline] Scoring error for ${(app as any)._id}:`, err);
            }
        }

        // Sort by score
        results.sort((a, b) => b.score - a.score);

        return { scored: results.length, results };
    } catch (error) {
        console.error("[AI Pipeline] Bulk score error:", error);
        return { scored: 0, results: [] };
    }
}

// ==========================================
// AI INSIGHTS GENERATION
// ==========================================

export async function generateHiringInsights(jobId?: string): Promise<{
    insights: string[];
    recommendations: string[];
}> {
    try {
        const Application = mongoose.models.Application;
        const Candidate = mongoose.models.Candidate;

        if (!Application) return { insights: [], recommendations: [] };

        // Get recent application stats
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const query: any = { createdAt: { $gte: thirtyDaysAgo } };
        if (jobId) query.jobId = jobId;

        const applications = await Application.find(query).lean();

        const stats = {
            total: applications.length,
            highScore: applications.filter((a: any) => (a.aiScore || 0) >= 80).length,
            lowScore: applications.filter((a: any) => (a.aiScore || 0) < 50).length,
            avgScore: applications.reduce((sum: number, a: any) => sum + (a.aiScore || 0), 0) / (applications.length || 1)
        };

        // Generate AI insights
        const prompt = `Based on these hiring stats, provide 3 insights and 3 recommendations:
- Total applications: ${stats.total}
- High-scoring (80+): ${stats.highScore}
- Low-scoring (<50): ${stats.lowScore}
- Average score: ${stats.avgScore.toFixed(1)}

Return JSON: {"insights": ["insight1", "insight2"], "recommendations": ["rec1", "rec2"]}`;

        const response = await AI.callAI("orchestrator", prompt, "You are a hiring analytics expert.");

        try {
            const parsed = JSON.parse(response.content);
            return parsed;
        } catch {
            return {
                insights: [
                    `${stats.highScore} high-potential candidates identified`,
                    `Average candidate score: ${stats.avgScore.toFixed(1)}%`,
                    `${stats.total} applications received in last 30 days`
                ],
                recommendations: [
                    stats.highScore > 0 ? "Fast-track high-scoring candidates" : "Consider broader sourcing",
                    stats.avgScore < 60 ? "Review job requirements alignment" : "Strong candidate pipeline"
                ]
            };
        }
    } catch (error) {
        console.error("[AI Pipeline] Generate insights error:", error);
        return { insights: [], recommendations: [] };
    }
}

export default {
    autoScoreApplication,
    autoMatchTalentPool,
    generateSmartEmail,
    bulkScoreJob,
    generateHiringInsights
};
