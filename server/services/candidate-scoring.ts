/**
 * Candidate Scoring Service
 * AI-powered resume-to-job-description matching using Gemini
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface SkillsAnalysis {
    score: number;
    requiredMatched: string[];
    requiredMissing: string[];
    preferredMatched: string[];
    additionalSkills: string[];
    totalRequired: number;
    totalPreferred: number;
}

interface ExperienceAnalysis {
    score: number;
    totalYears: number;
    relevantYears: number;
    requiredYears: number;
    meetsRequirement: boolean;
    careerProgression: "excellent" | "good" | "average" | "poor";
}

interface EducationAnalysis {
    score: number;
    degreeLevel: string;
    degreeField: string;
    university: string;
    certifications: string[];
}

interface ProjectsAnalysis {
    score: number;
    relevantProjects: string[];
    technologies: string[];
    projectCount: number;
}

interface CulturalFitAnalysis {
    score: number;
    signals: string[];
}

export interface CandidateScoreResult {
    matchScore: number;
    skillsAnalysis: SkillsAnalysis;
    experienceAnalysis: ExperienceAnalysis;
    educationAnalysis: EducationAnalysis;
    projectsAnalysis: ProjectsAnalysis;
    culturalFitAnalysis: CulturalFitAnalysis;
    aiRecommendation: "STRONG_HIRE" | "HIRE" | "MAYBE" | "NO_HIRE";
    aiConfidence: number;
    aiSummary: string;
    strengths: string[];
    gaps: string[];
}

/**
 * Score a candidate's resume against a job description using AI
 */
export async function scoreCandidateResume(
    resumeText: string,
    jobDescription: string,
    jobRequirements: {
        requiredSkills?: string[];
        preferredSkills?: string[];
        experienceYears?: number;
        location?: string;
        remoteOk?: boolean;
        education?: string;
    }
): Promise<CandidateScoreResult> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `You are an expert technical recruiter analyzing a candidate's resume against a job description.

JOB DESCRIPTION:
${jobDescription}

JOB REQUIREMENTS:
- Required Skills: ${(jobRequirements.requiredSkills || []).join(", ") || "Not specified"}
- Preferred Skills: ${(jobRequirements.preferredSkills || []).join(", ") || "Not specified"}
- Experience Required: ${jobRequirements.experienceYears || 0} years
- Location: ${jobRequirements.location || "Not specified"}
- Remote OK: ${jobRequirements.remoteOk ? "Yes" : "No"}
- Education: ${jobRequirements.education || "Not specified"}

CANDIDATE RESUME:
${resumeText}

Analyze this resume against the job requirements and provide a detailed scoring breakdown.
Rate each category from 0-100 and provide the overall match score (0-100).

Scoring weights:
- Skills Match: 50%
- Experience Match: 20%
- Education Match: 15%
- Projects & Portfolio: 10%
- Cultural Fit Signals: 5%

Respond in this EXACT JSON format (no markdown, just raw JSON):
{
  "matchScore": <0-100>,
  "skillsAnalysis": {
    "score": <0-100>,
    "requiredMatched": ["skill1", "skill2"],
    "requiredMissing": ["skill3"],
    "preferredMatched": ["skill4"],
    "additionalSkills": ["skill5"],
    "totalRequired": <number>,
    "totalPreferred": <number>
  },
  "experienceAnalysis": {
    "score": <0-100>,
    "totalYears": <number>,
    "relevantYears": <number>,
    "requiredYears": ${jobRequirements.experienceYears || 0},
    "meetsRequirement": <true/false>,
    "careerProgression": "excellent" | "good" | "average" | "poor"
  },
  "educationAnalysis": {
    "score": <0-100>,
    "degreeLevel": "BS" | "MS" | "PhD" | "Other",
    "degreeField": "Computer Science",
    "university": "University Name",
    "certifications": ["cert1", "cert2"]
  },
  "projectsAnalysis": {
    "score": <0-100>,
    "relevantProjects": ["project1", "project2"],
    "technologies": ["tech1", "tech2"],
    "projectCount": <number>
  },
  "culturalFitAnalysis": {
    "score": <0-100>,
    "signals": ["signal1", "signal2"]
  },
  "aiRecommendation": "STRONG_HIRE" | "HIRE" | "MAYBE" | "NO_HIRE",
  "aiConfidence": <0-100>,
  "aiSummary": "2-3 sentence summary of why this candidate is a good/bad fit",
  "strengths": ["strength1", "strength2", "strength3"],
  "gaps": ["gap1", "gap2"]
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse JSON response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Failed to parse AI response");
        }

        const scoreData: CandidateScoreResult = JSON.parse(jsonMatch[0]);
        return scoreData;

    } catch (error) {
        console.error("AI scoring failed:", error);

        // Return default scores on error
        return {
            matchScore: 50,
            skillsAnalysis: {
                score: 50,
                requiredMatched: [],
                requiredMissing: jobRequirements.requiredSkills || [],
                preferredMatched: [],
                additionalSkills: [],
                totalRequired: (jobRequirements.requiredSkills || []).length,
                totalPreferred: (jobRequirements.preferredSkills || []).length
            },
            experienceAnalysis: {
                score: 50,
                totalYears: 0,
                relevantYears: 0,
                requiredYears: jobRequirements.experienceYears || 0,
                meetsRequirement: false,
                careerProgression: "average"
            },
            educationAnalysis: {
                score: 50,
                degreeLevel: "Unknown",
                degreeField: "Unknown",
                university: "Unknown",
                certifications: []
            },
            projectsAnalysis: {
                score: 50,
                relevantProjects: [],
                technologies: [],
                projectCount: 0
            },
            culturalFitAnalysis: {
                score: 50,
                signals: []
            },
            aiRecommendation: "MAYBE",
            aiConfidence: 30,
            aiSummary: "Unable to fully analyze resume. Manual review recommended.",
            strengths: [],
            gaps: ["Resume analysis incomplete"]
        };
    }
}

/**
 * Extract skills from resume text using AI
 */
export async function extractSkillsFromResume(resumeText: string): Promise<string[]> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Extract all technical and professional skills from this resume. Return as a JSON array of strings only.

RESUME:
${resumeText}

Respond with ONLY a JSON array, no markdown:
["skill1", "skill2", "skill3"]`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return [];

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error("Skill extraction failed:", error);
        return [];
    }
}

/**
 * Parse experience years from resume
 */
export async function extractExperienceYears(resumeText: string): Promise<number> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Analyze this resume and determine the total years of professional experience. Return ONLY a number.

RESUME:
${resumeText}

Respond with ONLY a number (e.g., 5):`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();

        const years = parseFloat(text);
        return isNaN(years) ? 0 : years;
    } catch (error) {
        console.error("Experience extraction failed:", error);
        return 0;
    }
}
