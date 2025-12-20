/**
 * Evaluation Service - Versioned Scorecards & Decision Traceability
 * Hackathon Implementation for GCC Hiring Platform
 */

import { db } from "../storage";
import { evaluationHistory, reasonCodes } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface EvaluationScores {
    technical?: number;
    communication?: number;
    cultureFit?: number;
    problemSolving?: number;
    leadership?: number;
    teamwork?: number;
}

export type Recommendation = "strong_hire" | "hire" | "maybe" | "no_hire" | "strong_no_hire";

export interface CreateEvaluationRequest {
    resumeId: string;
    jobDescriptionId?: string;
    evaluatorId: string;
    evaluatorName: string;
    scores: EvaluationScores;
    recommendation: Recommendation;
    reasonCodes: string[];
    notes?: string;
    interviewId?: string;
    stage?: string;
    aiGenerated?: boolean;
    aiPromptVersion?: string;
    aiModelUsed?: string;
}

/**
 * Create a new versioned evaluation
 * Automatically increments version and marks previous as not-latest
 */
export async function createEvaluation(request: CreateEvaluationRequest) {
    const {
        resumeId,
        jobDescriptionId,
        evaluatorId,
        evaluatorName,
        scores,
        recommendation,
        reasonCodes: codes,
        notes,
        interviewId,
        stage,
        aiGenerated,
        aiPromptVersion,
        aiModelUsed,
    } = request;

    // Get the current latest version
    const latestVersions = await db
        .select()
        .from(evaluationHistory)
        .where(
            and(
                eq(evaluationHistory.resumeId, resumeId),
                eq(evaluationHistory.isLatest, true)
            )
        )
        .limit(1);

    const previousVersion = latestVersions[0];
    const newVersion = previousVersion ? previousVersion.version + 1 : 1;

    // Mark previous version as not-latest
    if (previousVersion) {
        await db
            .update(evaluationHistory)
            .set({ isLatest: false })
            .where(eq(evaluationHistory.id, previousVersion.id));
    }

    // Calculate overall score
    const scoreValues = Object.values(scores).filter((v) => v !== undefined) as number[];
    const overallScore = scoreValues.length > 0
        ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
        : undefined;

    // Create new evaluation
    const [evaluation] = await db
        .insert(evaluationHistory)
        .values({
            resumeId,
            jobDescriptionId,
            evaluatorId,
            evaluatorName,
            version: newVersion,
            isLatest: true,
            previousVersionId: previousVersion?.id,
            scores,
            overallScore,
            recommendation,
            reasonCodes: codes,
            notes,
            interviewId,
            stage,
            aiGenerated: aiGenerated || false,
            aiPromptVersion,
            aiModelUsed,
        })
        .returning();

    return evaluation;
}

/**
 * Get evaluation history for a candidate
 */
export async function getEvaluationHistory(resumeId: string) {
    return db
        .select()
        .from(evaluationHistory)
        .where(eq(evaluationHistory.resumeId, resumeId))
        .orderBy(desc(evaluationHistory.version));
}

/**
 * Get the latest evaluation for a candidate
 */
export async function getLatestEvaluation(resumeId: string) {
    const results = await db
        .select()
        .from(evaluationHistory)
        .where(
            and(
                eq(evaluationHistory.resumeId, resumeId),
                eq(evaluationHistory.isLatest, true)
            )
        )
        .limit(1);

    return results[0] || null;
}

/**
 * Get all reason codes
 */
export async function getReasonCodes() {
    return db.select().from(reasonCodes).where(eq(reasonCodes.isActive, true));
}

/**
 * Initialize default reason codes
 */
export async function initializeReasonCodes() {
    const defaultCodes = [
        // Positive
        { code: "SKILL_MATCH", category: "positive", label: "Skills Align", description: "Candidate skills match job requirements" },
        { code: "EXPERIENCE_FIT", category: "positive", label: "Experience Fit", description: "Experience level is appropriate" },
        { code: "CULTURE_FIT", category: "positive", label: "Cultural Alignment", description: "Good cultural fit with the team" },
        { code: "STRONG_COMMUNICATION", category: "positive", label: "Strong Communication", description: "Excellent communication skills" },
        { code: "LEADERSHIP_POTENTIAL", category: "positive", label: "Leadership Potential", description: "Shows leadership qualities" },
        { code: "PROBLEM_SOLVER", category: "positive", label: "Problem Solver", description: "Strong problem-solving abilities" },
        { code: "QUICK_LEARNER", category: "positive", label: "Quick Learner", description: "Demonstrates ability to learn quickly" },

        // Negative
        { code: "SKILL_MISMATCH", category: "negative", label: "Skill Gap", description: "Missing critical skills" },
        { code: "EXPERIENCE_GAP", category: "negative", label: "Experience Gap", description: "Insufficient experience" },
        { code: "CULTURE_CONCERN", category: "negative", label: "Culture Concern", description: "Potential culture mismatch" },
        { code: "COMMUNICATION_ISSUE", category: "negative", label: "Communication Issue", description: "Communication skills need improvement" },
        { code: "SALARY_MISMATCH", category: "negative", label: "Salary Mismatch", description: "Compensation expectations too high" },
        { code: "INTEGRITY_FLAG", category: "negative", label: "Integrity Concern", description: "Proctoring or integrity issues" },
        { code: "AVAILABILITY_ISSUE", category: "negative", label: "Availability Issue", description: "Cannot meet start date or schedule" },
        { code: "INCOMPLETE_ASSESSMENT", category: "negative", label: "Incomplete Assessment", description: "Did not complete required assessments" },
    ];

    for (const code of defaultCodes) {
        await db
            .insert(reasonCodes)
            .values(code)
            .onConflictDoNothing();
    }
}

/**
 * Generate decision packet data
 */
export async function generateDecisionPacket(resumeId: string) {
    const { resumes, interviews, interviewFeedback, testSubmissions } = await import("../../shared/schema");

    // Get candidate info
    const [candidate] = await db
        .select()
        .from(resumes)
        .where(eq(resumes.id, resumeId))
        .limit(1);

    // Get all evaluations
    const evaluations = await getEvaluationHistory(resumeId);

    // Get proctoring reports
    const submissions = await db
        .select()
        .from(testSubmissions)
        .where(eq(testSubmissions.resumeId, resumeId));

    // Get interview feedback
    const candidateInterviews = await db
        .select()
        .from(interviews)
        .where(eq(interviews.resumeId, resumeId));

    const feedbackItems = [];
    for (const interview of candidateInterviews) {
        const feedback = await db
            .select()
            .from(interviewFeedback)
            .where(eq(interviewFeedback.interviewId, interview.id));
        feedbackItems.push({ interview, feedback });
    }

    return {
        candidate: {
            id: candidate?.id,
            name: candidate?.candidateName,
            // PII masked - would be revealed only with explicit unlock
            email: "[PII PROTECTED]",
            phone: "[PII PROTECTED]",
        },
        evaluations,
        assessments: submissions.map((s: any) => ({
            id: s.id,
            testId: s.skillTestId,
            score: s.finalScore,
            integrityScore: s.integrityScore,
            status: s.status,
        })),
        interviews: feedbackItems,
        latestRecommendation: evaluations[0]?.recommendation,
        overallScore: evaluations[0]?.overallScore,
        generatedAt: new Date().toISOString(),
    };
}
