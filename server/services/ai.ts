/**
 * AI Service - NVIDIA NIM Integration
 * Centralized AI service for all TalentOS AI workflows
 */

import OpenAI from "openai";
import { AIInteractionLog } from "../db";
import { stripPIIForAI } from "../middleware/pii-mask";

// ==========================================
// AI CLIENT CONFIGURATIONS
// ==========================================

const AI_CONFIGS = {
    // Master Orchestrator - mistral-large-3
    orchestrator: {
        client: new OpenAI({
            baseURL: "https://integrate.api.nvidia.com/v1",
            apiKey: "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",
        }),
        model: "mistralai/mistral-large-3-675b-instruct-2512",
        temperature: 0.15,
        maxTokens: 2048,
    },

    // Ingest & Extraction - llama-3.1
    extraction: {
        client: new OpenAI({
            baseURL: "https://integrate.api.nvidia.com/v1",
            apiKey: "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",
        }),
        model: "meta/llama-3.1-405b-instruct",
        temperature: 0.2,
        maxTokens: 1024,
    },

    // RAG Retrieval - deepseek
    rag: {
        client: new OpenAI({
            baseURL: "https://integrate.api.nvidia.com/v1",
            apiKey: "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",
        }),
        model: "deepseek-ai/deepseek-v3.1-terminus",
        temperature: 0.2,
        maxTokens: 8192,
    },

    // Candidate Analysis - qwen3
    candidateAnalysis: {
        client: new OpenAI({
            baseURL: "https://integrate.api.nvidia.com/v1",
            apiKey: "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",
        }),
        model: "qwen/qwen3-235b-a22b",
        temperature: 0.2,
        maxTokens: 8192,
    },

    // Constraint/Draco - gpt-oss
    constraint: {
        client: new OpenAI({
            baseURL: "https://integrate.api.nvidia.com/v1",
            apiKey: "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",
        }),
        model: "openai/gpt-oss-120b",
        temperature: 1,
        maxTokens: 4096,
    },

    // Ranker/DeepEye - qwen-coder
    ranker: {
        client: new OpenAI({
            baseURL: "https://integrate.api.nvidia.com/v1",
            apiKey: "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",
        }),
        model: "qwen/qwen3-coder-480b-a35b-instruct",
        temperature: 0.7,
        maxTokens: 4096,
    },

    // Voyager/Exploration - devstral
    exploration: {
        client: new OpenAI({
            baseURL: "https://integrate.api.nvidia.com/v1",
            apiKey: "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",
        }),
        model: "mistralai/devstral-2-123b-instruct-2512",
        temperature: 0.15,
        maxTokens: 8192,
    },

    // Email Generation - qwen-coder
    email: {
        client: new OpenAI({
            baseURL: "https://integrate.api.nvidia.com/v1",
            apiKey: "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",
        }),
        model: "qwen/qwen3-coder-480b-a35b-instruct",
        temperature: 0.7,
        maxTokens: 4096,
    },

    // NER/Skills Agent - llama
    skills: {
        client: new OpenAI({
            baseURL: "https://integrate.api.nvidia.com/v1",
            apiKey: "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",
        }),
        model: "meta/llama-3.1-405b-instruct",
        temperature: 0.2,
        maxTokens: 1024,
    },

    // OCR/Parsing Agent - llama (new key)
    ocr: {
        client: new OpenAI({
            baseURL: "https://integrate.api.nvidia.com/v1",
            apiKey: "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",
        }),
        model: "meta/llama-3.1-405b-instruct",
        temperature: 0.2,
        maxTokens: 2048,
    },

    // RAG Chatbot - mistral-large-3
    chatbot: {
        client: new OpenAI({
            baseURL: "https://integrate.api.nvidia.com/v1",
            apiKey: "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",
        }),
        model: "mistralai/mistral-large-3-675b-instruct-2512",
        temperature: 0.15,
        maxTokens: 2048,
    },

    // Offer Suggestion - uses fast llama for quick suggestions
    offerSuggestion: {
        client: new OpenAI({
            baseURL: "https://integrate.api.nvidia.com/v1",
            apiKey: "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",
        }),
        model: "meta/llama-3.1-405b-instruct",
        temperature: 0.3,
        maxTokens: 512,
    },

    // Fast Kit Generation - nemotron-nano (small, fast model)
    kitGeneration: {
        client: new OpenAI({
            baseURL: "https://integrate.api.nvidia.com/v1",
            apiKey: "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",
        }),
        model: "nvidia/nemotron-3-nano-30b-a3b",
        temperature: 0.7,
        maxTokens: 4096,
    },
};

// ==========================================
// CORE AI FUNCTIONS
// ==========================================

interface AIResponse {
    content: string;
    reasoning?: string;
    usage?: { promptTokens: number; completionTokens: number };
}

async function callAI(
    configKey: keyof typeof AI_CONFIGS,
    prompt: string,
    systemPrompt?: string,
    options?: { stripPII?: boolean; resourceType?: string; resourceId?: string; userId?: string }
): Promise<AIResponse> {
    const config = AI_CONFIGS[configKey];
    const startTime = Date.now();

    // Strip PII if requested
    let finalPrompt = prompt;
    let piiMappings: any[] = [];
    if (options?.stripPII) {
        const stripped = stripPIIForAI(prompt);
        finalPrompt = stripped.cleanText;
        piiMappings = stripped.mappings;
    }

    const messages: any[] = [];
    if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: finalPrompt });

    try {
        const completion = await config.client.chat.completions.create({
            model: config.model,
            messages,
            temperature: config.temperature,
            max_tokens: config.maxTokens,
            stream: false,
        });

        const content = completion.choices[0]?.message?.content || "";
        const latencyMs = Date.now() - startTime;

        // Log AI interaction
        try {
            await new AIInteractionLog({
                userId: options?.userId,
                modelUsed: config.model,
                feature: configKey,
                inputTokens: completion.usage?.prompt_tokens,
                outputTokens: completion.usage?.completion_tokens,
                piiStripped: options?.stripPII || false,
                resourceType: options?.resourceType,
                resourceId: options?.resourceId,
                latencyMs,
                success: true,
            }).save();
        } catch { }

        return {
            content,
            usage: {
                promptTokens: completion.usage?.prompt_tokens || 0,
                completionTokens: completion.usage?.completion_tokens || 0,
            },
        };
    } catch (error: any) {
        // Log error
        try {
            await new AIInteractionLog({
                userId: options?.userId,
                modelUsed: config.model,
                feature: configKey,
                piiStripped: options?.stripPII || false,
                latencyMs: Date.now() - startTime,
                success: false,
                errorMessage: error.message,
            }).save();
        } catch { }

        throw error;
    }
}

// ==========================================
// RESUME PARSING
// ==========================================

export async function parseResume(resumeText: string, userId?: string): Promise<{
    name: string;
    email: string;
    phone: string;
    skills: string[];
    experience: Array<{ title: string; company: string; duration: string; description: string }>;
    education: Array<{ degree: string; institution: string; year: string }>;
    summary: string;
}> {
    const systemPrompt = `You are an expert HR resume parser. Extract structured information from resumes.
Return ONLY valid JSON with this exact structure:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "skills": ["skill1", "skill2"],
  "experience": [{"title": "Job Title", "company": "Company", "duration": "2020-2023", "description": "Brief description"}],
  "education": [{"degree": "Degree Name", "institution": "University", "year": "2020"}],
  "summary": "Brief professional summary"
}`;

    const response = await callAI("extraction", resumeText, systemPrompt, {
        stripPII: false,
        resourceType: "resume",
        userId,
    });

    try {
        return JSON.parse(response.content);
    } catch {
        // Try to extract JSON from response
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error("Failed to parse resume response");
    }
}

// ==========================================
// SKILL EXTRACTION
// ==========================================

export async function extractSkills(text: string, userId?: string): Promise<{
    technical: string[];
    soft: string[];
    tools: string[];
    certifications: string[];
}> {
    const systemPrompt = `Extract skills from the text. Categorize into technical, soft skills, tools, and certifications.
Return ONLY valid JSON:
{
  "technical": ["Python", "React"],
  "soft": ["Leadership", "Communication"],
  "tools": ["Git", "Docker"],
  "certifications": ["AWS Certified"]
}`;

    const response = await callAI("skills", text, systemPrompt, {
        stripPII: true,
        resourceType: "skills",
        userId,
    });

    try {
        return JSON.parse(response.content);
    } catch {
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return { technical: [], soft: [], tools: [], certifications: [] };
    }
}

// ==========================================
// CANDIDATE SCORING
// ==========================================

export async function scoreCandidate(
    resumeData: any,
    jobRequirements: any,
    userId?: string
): Promise<{
    overallScore: number;
    skillMatch: number;
    experienceMatch: number;
    educationMatch: number;
    explanation: string;
    redFlags: string[];
    strengths: string[];
}> {
    const systemPrompt = `You are an AI hiring assistant. Score the candidate against job requirements.
Provide scores 0-100 and detailed analysis. Return ONLY valid JSON:
{
  "overallScore": 85,
  "skillMatch": 90,
  "experienceMatch": 80,
  "educationMatch": 85,
  "explanation": "Detailed reasoning",
  "redFlags": ["Concern 1"],
  "strengths": ["Strength 1"]
}`;

    const prompt = `Resume Data:\n${JSON.stringify(resumeData)}\n\nJob Requirements:\n${JSON.stringify(jobRequirements)}`;

    const response = await callAI("candidateAnalysis", prompt, systemPrompt, {
        stripPII: true,
        resourceType: "candidate_score",
        userId,
    });

    try {
        return JSON.parse(response.content);
    } catch {
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        throw new Error("Failed to parse scoring response");
    }
}

// ==========================================
// INTERVIEW SUMMARY
// ==========================================

export async function generateInterviewSummary(
    transcript: string,
    userId?: string
): Promise<{
    summary: string;
    keyPoints: string[];
    sentiment: "positive" | "neutral" | "negative";
    concerns: string[];
    recommendation: string;
}> {
    const systemPrompt = `Summarize the interview transcript. Return ONLY valid JSON:
{
  "summary": "Brief summary",
  "keyPoints": ["Point 1", "Point 2"],
  "sentiment": "positive",
  "concerns": ["Concern 1"],
  "recommendation": "hire/no_hire/maybe"
}`;

    const response = await callAI("orchestrator", transcript, systemPrompt, {
        stripPII: true,
        resourceType: "interview",
        userId,
    });

    try {
        return JSON.parse(response.content);
    } catch {
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        throw new Error("Failed to parse interview summary");
    }
}

// ==========================================
// JOB DESCRIPTION GENERATION
// ==========================================

export async function generateJobDescription(
    params: { title: string; department: string; requirements: string[]; responsibilities?: string[] },
    userId?: string
): Promise<{ description: string; suggestedSkills: string[] }> {
    const systemPrompt = `You are an HR expert. Generate a concise job description in plain text.
Keep it under 300 words. Include: About the Role, Key Responsibilities, Requirements.
Also suggest 5 required skills.
Return JSON only: {"description": "...", "suggestedSkills": ["skill1", "skill2"]}`;

    const prompt = `Job: ${params.title}, Dept: ${params.department}${params.requirements.length > 0 ? `, Skills: ${params.requirements.join(", ")}` : ""}`;

    // Use faster 'exploration' model (devstral-2-123b) instead of 480B model
    const response = await callAI("exploration", prompt, systemPrompt, {
        resourceType: "job_description",
        userId,
    });

    try {
        const parsed = JSON.parse(response.content);
        parsed.description = parsed.description
            .replace(/\*\*/g, '')
            .replace(/##/g, '')
            .replace(/\*/g, '')
            .replace(/^#+\s*/gm, '');
        return parsed;
    } catch {
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed;
        }
        return {
            description: response.content.replace(/\*\*/g, '').replace(/##/g, ''),
            suggestedSkills: params.requirements || []
        };
    }
}

// ==========================================
// EMAIL GENERATION
// ==========================================

export async function generateEmail(
    type: "interview_invite" | "offer" | "rejection" | "follow_up" | "outreach",
    candidateName: string,
    details: Record<string, any>,
    userId?: string
): Promise<{ subject: string; body: string }> {
    const emailTemplates: Record<string, string> = {
        interview_invite: `Write a warm, professional interview invitation email. Include:
- Excitement about meeting the candidate
- Interview details (date, time, format)
- What to expect
- Friendly closing`,
        offer: `Write an enthusiastic job offer email. Include:
- Congratulations
- Position details and compensation highlights
- Next steps to accept
- Warm welcome message`,
        rejection: `Write a respectful, encouraging rejection email. Include:
- Thank them for their time
- Acknowledge their strengths
- Encourage future applications
- Professional closing`,
        follow_up: `Write a professional follow-up/status update email. Include:
- Current status of their application
- Next steps if any
- Timeline expectations
- Contact information for questions`,
        outreach: `Write a compelling recruitment outreach email. Include:
- Why you're reaching out
- What makes the opportunity exciting
- Brief company highlights
- Clear call to action`
    };

    const systemPrompt = `You are a senior HR professional writing emails. 
Write in a warm, professional tone. NO markdown formatting.
Use proper paragraph breaks. Be concise but personable.

Return ONLY valid JSON:
{
  "subject": "Clear, professional subject line",
  "body": "Well-formatted email body with proper paragraphs"
}`;

    const prompt = `Write a ${type.replace("_", " ")} email for ${candidateName}.
${emailTemplates[type] || emailTemplates.follow_up}

Details: ${JSON.stringify(details)}`;

    const response = await callAI("email", prompt, systemPrompt, {
        stripPII: false,
        resourceType: "email",
        userId,
    });

    try {
        const result = JSON.parse(response.content);
        // Clean any markdown from body
        result.body = result.body
            .replace(/\*\*/g, '')
            .replace(/##/g, '')
            .replace(/\*/g, '');
        return result;
    } catch {
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            result.body = result.body?.replace(/\*\*/g, '').replace(/\*/g, '') || result.body;
            return result;
        }
        // Professional fallback
        return {
            subject: `Regarding Your Application - ${details.jobTitle || 'Update'}`,
            body: `Dear ${candidateName},\n\nThank you for your interest in the ${details.jobTitle || 'position'} role.\n\nWe wanted to reach out regarding your application status.\n\nBest regards,\nThe Hiring Team`
        };
    }
}

// ==========================================
// CANDIDATE RANKING
// ==========================================

export async function rankCandidates(
    candidates: Array<{ id: string; name: string; score: number; skills: string[] }>,
    jobRequirements: { skills: string[]; experience: string },
    userId?: string
): Promise<Array<{ id: string; rank: number; reasoning: string }>> {
    const systemPrompt = `Rank candidates for a job. Return ONLY valid JSON array:
[{"id": "candidate_id", "rank": 1, "reasoning": "Why ranked here"}]`;

    const prompt = `Rank these candidates for a role requiring: ${JSON.stringify(jobRequirements)}
Candidates: ${JSON.stringify(candidates)}`;

    const response = await callAI("ranker", prompt, systemPrompt, {
        stripPII: true,
        resourceType: "ranking",
        userId,
    });

    try {
        return JSON.parse(response.content);
    } catch {
        const jsonMatch = response.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return candidates.map((c, i) => ({ id: c.id, rank: i + 1, reasoning: "Default ranking" }));
    }
}

// ==========================================
// CODE EVALUATION (for Secure Assessments)
// ==========================================

interface TestResult {
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    error?: string;
}

interface CodeEvaluation {
    logicScore: number;      // 0-50
    semanticsScore: number;  // 0-50
    penalty: number;         // negative
    totalScore: number;      // final score
    feedback: string;
    details: {
        algorithmCorrectness: string;
        edgeCases: string;
        codeQuality: string;
        bestPractices: string;
        errors: string[];
    };
}

async function evaluateCode(
    code: string,
    language: string,
    problemDescription: string,
    testResults: TestResult[],
    userId?: string
): Promise<CodeEvaluation> {
    const passedTests = testResults.filter(t => t.passed).length;
    const totalTests = testResults.length;
    const testPassRate = totalTests > 0 ? passedTests / totalTests : 0;

    const systemPrompt = `You are an expert code reviewer evaluating a candidate's programming solution.

SCORING RUBRIC:
1. LOGIC CORRECTNESS (0-50 points):
   - Algorithm solves the problem correctly: 0-25 points
   - Edge cases handled properly: 0-15 points
   - Time/space complexity is reasonable: 0-10 points

2. CODE SEMANTICS & QUALITY (0-50 points):
   - Naming conventions and readability: 0-15 points
   - Proper error handling: 0-10 points
   - Language best practices followed: 0-15 points
   - Code structure and organization: 0-10 points

PENALTIES (subtracted from total):
   - Syntax error: -5 points each
   - Runtime error: -10 points each
   - Security vulnerability: -15 points each

Respond with ONLY valid JSON in this exact format:
{
    "logicScore": <number 0-50>,
    "semanticsScore": <number 0-50>,
    "penalty": <negative number or 0>,
    "feedback": "<2-3 sentence summary>",
    "details": {
        "algorithmCorrectness": "<brief assessment>",
        "edgeCases": "<brief assessment>",
        "codeQuality": "<brief assessment>",
        "bestPractices": "<brief assessment>",
        "errors": ["<error1>", "<error2>"]
    }
}`;

    const userPrompt = `PROBLEM:
${problemDescription}

LANGUAGE: ${language.toUpperCase()}

CANDIDATE'S CODE:
\`\`\`${language}
${code}
\`\`\`

TEST RESULTS: ${passedTests}/${totalTests} tests passed
${testResults.map((t, i) => `Test ${i + 1}: ${t.passed ? "PASSED" : "FAILED"}${t.error ? ` (Error: ${t.error})` : ""}`).join("\n")}

Evaluate this code and provide scores.`;

    try {
        const response = await callAI("ranker", systemPrompt, userPrompt, { userId });

        // Clean markdown from response
        let cleanContent = response.content
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();

        const evaluation = JSON.parse(cleanContent);

        // Adjust logic score based on test results
        // If tests fail, cap logic score proportionally
        const adjustedLogicScore = Math.round(evaluation.logicScore * (0.5 + 0.5 * testPassRate));

        const totalScore = Math.max(0, adjustedLogicScore + evaluation.semanticsScore + (evaluation.penalty || 0));

        return {
            logicScore: adjustedLogicScore,
            semanticsScore: evaluation.semanticsScore,
            penalty: evaluation.penalty || 0,
            totalScore,
            feedback: evaluation.feedback,
            details: evaluation.details
        };
    } catch (error) {
        console.error("Code evaluation error:", error);

        // Fallback scoring based purely on test results
        const logicScore = Math.round(testPassRate * 50);
        const semanticsScore = 25; // Default middle score

        return {
            logicScore,
            semanticsScore,
            penalty: 0,
            totalScore: logicScore + semanticsScore,
            feedback: `Code evaluation based on test results: ${passedTests}/${totalTests} tests passed.`,
            details: {
                algorithmCorrectness: testPassRate >= 0.8 ? "Good" : testPassRate >= 0.5 ? "Partial" : "Needs work",
                edgeCases: "Unable to fully evaluate",
                codeQuality: "Default assessment",
                bestPractices: "Default assessment",
                errors: []
            }
        };
    }
}

// ==========================================
// OFFER SUGGESTION
// ==========================================

export async function suggestOffer(
    candidateName: string,
    skills: string[],
    experience: string,
    jobTitle?: string,
    userId?: string
): Promise<{
    role: string;
    department: string;
    baseSalary: number;
    bonus: number;
    equity: string;
    startDate: string;
    expiresAt: string;
}> {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() + 21);
    const expiresDate = new Date(today);
    expiresDate.setDate(expiresDate.getDate() + 14);

    const systemPrompt = `You are an HR compensation specialist creating a job offer. Based on the candidate's name and any available information, suggest an appropriate role and compensation.

IMPORTANT: Be creative and match the role to any skills mentioned. If no skills/experience provided, infer from the candidate's name or suggest a VARIED role (not always the same one).

Return ONLY valid JSON:
{
    "role": "Specific Job Title matching skills",
    "department": "Relevant Department",
    "baseSalary": 120000,
    "bonus": 15000,
    "equity": "0.05%"
}

ROLE OPTIONS (pick one that fits the candidate):
- Software Engineer, Senior Software Engineer, Staff Engineer
- Frontend Developer, Backend Developer, Full Stack Developer
- Product Manager, Senior Product Manager
- DevOps Engineer, Site Reliability Engineer
- Data Engineer, Machine Learning Engineer
- UX Designer, Product Designer
- Engineering Manager, Technical Lead
- QA Engineer, Security Engineer

SALARY GUIDELINES (USD annual):
- Junior (0-2 yrs): $70,000-$95,000
- Mid (2-5 yrs): $95,000-$140,000
- Senior (5+ yrs): $140,000-$200,000
- Principal/Staff: $200,000-$280,000`;

    const userPrompt = `Generate a job offer for candidate:
Name: ${candidateName}
${jobTitle ? `Current/Previous Role: ${jobTitle}` : ""}
${skills.length > 0 ? `Skills: ${skills.slice(0, 15).join(", ")}` : "No skills listed - suggest based on name or pick a varied tech role"}
${experience ? `Experience: ${experience}` : ""}

Be specific with job title - match to their background if known.`;

    try {
        const response = await callAI("offerSuggestion", userPrompt, systemPrompt, {
            resourceType: "offer_suggestion",
            userId,
        });

        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Invalid response");

        const suggestion = JSON.parse(jsonMatch[0]);

        return {
            role: suggestion.role || "Software Engineer",
            department: suggestion.department || "Engineering",
            baseSalary: Math.min(300000, Math.max(50000, parseInt(suggestion.baseSalary) || 100000)),
            bonus: parseInt(suggestion.bonus) || 10000,
            equity: suggestion.equity || "0.02%",
            startDate: startDate.toISOString().split('T')[0],
            expiresAt: expiresDate.toISOString().split('T')[0]
        };
    } catch (error) {
        console.error("Offer suggestion error:", error);
        // Return default values
        return {
            role: "Software Engineer",
            department: "Engineering",
            baseSalary: 120000,
            bonus: 15000,
            equity: "0.02%",
            startDate: startDate.toISOString().split('T')[0],
            expiresAt: expiresDate.toISOString().split('T')[0]
        };
    }
}

// ==========================================
// EXPORTS
// ==========================================

export default {
    parseResume,
    extractSkills,
    scoreCandidate,
    generateInterviewSummary,
    generateJobDescription,
    generateEmail,
    rankCandidates,
    evaluateCode,
    suggestOffer,
    callAI,
};
