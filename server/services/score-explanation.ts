/**
 * Score Explanation Service
 * Provides detailed, human-readable breakdown of candidate matching scores
 * Ported from Phase-1 scoreExplanation.service.js
 */

import { Application, Job } from "../db";
import {
    extractSkillsFromText,
    calculateWeightedMatchScore,
    WeightedScoreResult
} from "./skill-matching";

export interface ScoreExplanation {
    totalScore: number;
    breakdown: {
        skills: {
            score: number;
            max: number;
            matchPercentage: number;
            matched: string[];
            missing: string[];
        };
        experience: {
            score: number;
            max: number;
            candidateExperience: string;
            requiredExperience: string;
            status: string;
        };
        department: {
            score: number;
            max: number;
            status: string;
            jobDepartments?: string[];
        };
        description: {
            score: number;
            max: number;
            matchPercentage: number;
            status: string;
        };
    };
    explanation: string;
}

/**
 * Generate detailed score explanation for a job-candidate match
 */
export async function generateScoreExplanation(
    jobId: string,
    candidateId: string
): Promise<ScoreExplanation> {
    // Fetch application
    const application = await Application.findOne({
        jobId,
        candidateId
    }).populate("jobId");

    if (!application) {
        throw new Error("Application not found");
    }

    const job = await Job.findById(jobId);
    if (!job) {
        throw new Error("Job not found");
    }

    // Extract resume data
    const resumeText = application.resumeText || "";
    const resumeSkills = application.parsedResume?.skills || extractSkillsFromText(resumeText);

    // Get job requirements
    const jobSkills = job.requirements?.skills || [];
    const jobExperience = job.requirements?.experience || job.experienceLevel || "";
    const jobDescription = job.description || "";

    // Calculate weighted score
    const result = calculateWeightedMatchScore(
        resumeText,
        resumeSkills,
        jobSkills,
        jobExperience,
        jobDescription
    );

    // Generate human-readable explanation
    const explanation = generateHumanExplanation(result);

    // Format response
    return {
        totalScore: result.totalScore,
        breakdown: {
            skills: {
                score: result.breakdown.skills.score,
                max: result.breakdown.skills.max,
                matchPercentage: result.breakdown.skills.matchedSkills.length > 0
                    ? Math.round((result.breakdown.skills.matchedSkills.length /
                        (result.breakdown.skills.matchedSkills.length + result.breakdown.skills.missingSkills.length)) * 100)
                    : 0,
                matched: result.breakdown.skills.matchedSkills,
                missing: result.breakdown.skills.missingSkills
            },
            experience: {
                score: result.breakdown.experience.score,
                max: result.breakdown.experience.max,
                candidateExperience: result.breakdown.experience.candidateYears > 0
                    ? `${result.breakdown.experience.candidateYears} years`
                    : "Not specified",
                requiredExperience: jobExperience || "Not specified",
                status: result.breakdown.experience.status
            },
            department: {
                score: result.breakdown.department.score,
                max: result.breakdown.department.max,
                status: result.breakdown.department.status,
                jobDepartments: result.breakdown.department.matchedDepartments
            },
            description: {
                score: result.breakdown.description.score,
                max: result.breakdown.description.max,
                matchPercentage: result.breakdown.description.matchPercentage,
                status: `${result.breakdown.description.matchPercentage}% keyword match`
            }
        },
        explanation
    };
}

/**
 * Generate human-readable explanation of the score
 */
function generateHumanExplanation(data: WeightedScoreResult): string {
    const { totalScore, breakdown } = data;
    let explanation = '';

    // Overall assessment
    if (totalScore >= 80) {
        explanation = 'This candidate is an excellent match for the role. ';
    } else if (totalScore >= 60) {
        explanation = 'This candidate is a good match for the role. ';
    } else if (totalScore >= 40) {
        explanation = 'This candidate is a moderate match for the role. ';
    } else {
        explanation = 'This candidate may not be the best fit for the role. ';
    }

    // Skills explanation
    const skillMatchRate = breakdown.skills.matchedSkills.length /
        (breakdown.skills.matchedSkills.length + breakdown.skills.missingSkills.length || 1);

    if (skillMatchRate >= 0.8) {
        explanation += 'They possess most of the required technical skills. ';
    } else if (skillMatchRate >= 0.5) {
        explanation += 'They have some of the required skills but are missing key competencies. ';
    } else if (breakdown.skills.matchedSkills.length > 0) {
        explanation += 'They are missing several critical skills. ';
    }

    // Experience explanation
    if (breakdown.experience.score >= 18) {
        explanation += 'Their experience level aligns well with the requirements. ';
    } else if (breakdown.experience.score >= 12) {
        explanation += 'Their experience is close to what is needed. ';
    } else if (breakdown.experience.score < 10) {
        explanation += 'They may need more experience for this role. ';
    }

    // Department match
    if (breakdown.department.matchedDepartments.length > 0) {
        explanation += 'They have relevant domain experience. ';
    }

    // Description match
    if (breakdown.description.matchPercentage >= 70) {
        explanation += 'Their background strongly aligns with the job description.';
    } else if (breakdown.description.matchPercentage >= 40) {
        explanation += 'Their background partially aligns with the job description.';
    }

    return explanation.trim();
}

/**
 * Get ranked candidates for a job with their scores
 */
export async function getRankedCandidatesForJob(jobId: string) {
    const applications = await Application.find({ jobId })
        .sort({ matchScore: -1 })
        .lean();

    return applications.map((app, index) => ({
        rank: index + 1,
        candidateId: app.candidateId,
        candidateName: app.candidateName,
        candidateEmail: app.candidateEmail,
        matchScore: app.matchScore || 0,
        status: app.status,
        appliedAt: app.appliedAt
    }));
}
