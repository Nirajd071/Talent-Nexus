/**
 * AI-Assisted Skill Matching & Auto-Ranking Service
 * Ported from Phase-1 implementation
 * 
 * Provides deterministic, explainable AI logic for:
 * 1. Semantic Skill Extraction using ontology
 * 2. Weighted Match Scoring:
 *    - Skills: 50%
 *    - Experience: 20%
 *    - Education/Department: 15%
 *    - Projects: 10%
 *    - Cultural Fit (Description): 5%
 * 3. Candidate Ranking
 */

// Skill Ontology for Semantic Matching
// Maps canonical skill names to their aliases/variations
export const skillOntology: Record<string, string[]> = {
    "javascript": ["js", "javascript", "ecmascript", "es6", "es2015", "es2020"],
    "typescript": ["ts", "typescript"],
    "react": ["react", "reactjs", "react.js", "react native", "reactnative"],
    "angular": ["angular", "angularjs", "angular.js"],
    "vue": ["vue", "vuejs", "vue.js", "vue3"],
    "node": ["node", "nodejs", "node.js"],
    "express": ["express", "expressjs", "express.js"],
    "nextjs": ["next", "nextjs", "next.js"],
    "mongodb": ["mongo", "mongodb", "mongoose", "nosql"],
    "postgresql": ["postgres", "postgresql", "psql"],
    "mysql": ["mysql", "mariadb"],
    "redis": ["redis", "cache"],
    "python": ["python", "py", "python3"],
    "django": ["django"],
    "flask": ["flask"],
    "fastapi": ["fastapi"],
    "java": ["java", "jdk", "j2ee"],
    "spring": ["spring", "springboot", "spring boot"],
    "kotlin": ["kotlin"],
    "csharp": ["c#", "csharp", ".net", "dotnet"],
    "cpp": ["c++", "cpp"],
    "c": ["c language", "clang"],
    "go": ["go", "golang"],
    "rust": ["rust", "rustlang"],
    "ruby": ["ruby", "rails", "ruby on rails"],
    "php": ["php", "laravel", "symfony"],
    "swift": ["swift", "ios"],
    "html": ["html", "html5"],
    "css": ["css", "css3", "scss", "sass", "less"],
    "tailwind": ["tailwind", "tailwindcss"],
    "bootstrap": ["bootstrap"],
    "sql": ["sql", "structured query language"],
    "git": ["git", "github", "gitlab", "bitbucket", "version control"],
    "docker": ["docker", "containerization", "containers"],
    "kubernetes": ["kubernetes", "k8s", "container orchestration"],
    "aws": ["aws", "amazon web services", "ec2", "s3", "lambda", "cloudformation"],
    "azure": ["azure", "microsoft azure"],
    "gcp": ["gcp", "google cloud", "google cloud platform"],
    "terraform": ["terraform", "iac", "infrastructure as code"],
    "jenkins": ["jenkins", "ci/cd", "continuous integration"],
    "graphql": ["graphql", "apollo"],
    "rest": ["rest", "restful", "rest api"],
    "microservices": ["microservices", "micro-services", "distributed systems"],
    "agile": ["agile", "scrum", "kanban", "sprint"],
    "machine learning": ["ml", "machine learning", "deep learning", "ai", "artificial intelligence"],
    "tensorflow": ["tensorflow", "tf"],
    "pytorch": ["pytorch", "torch"],
    "pandas": ["pandas", "dataframes"],
    "numpy": ["numpy", "numerical python"],
    "data science": ["data science", "data analytics", "data analysis"],
    "linux": ["linux", "ubuntu", "centos", "debian"],
    "elasticsearch": ["elasticsearch", "elastic", "elk"],
    "rabbitmq": ["rabbitmq", "message queue", "amqp"],
    "kafka": ["kafka", "apache kafka", "streaming"],
    "firebase": ["firebase", "firestore"],
    "figma": ["figma", "ui design"],
    "jira": ["jira", "project management"],
};

/**
 * Normalizes text and extracts key skills using the ontology.
 * @param resumeText - The raw text content of the resume.
 * @returns Array of unique canonical skills found.
 */
export function extractSkillsFromText(resumeText: string): string[] {
    if (!resumeText) return [];

    const normalizedText = resumeText.toLowerCase()
        .replace(/[^a-z0-9\s.+#]/g, ' ') // Keep . + # for C++, node.js, C#
        .replace(/\s+/g, ' ');

    const foundSkills = new Set<string>();

    // Iterate through ontology to find semantic matches
    Object.keys(skillOntology).forEach(canonicalSkill => {
        const variations = skillOntology[canonicalSkill];

        const isMatch = variations.some(variation => {
            const escapedVar = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedVar}\\b`, 'i');
            return regex.test(normalizedText);
        });

        if (isMatch) {
            foundSkills.add(canonicalSkill);
        }
    });

    return Array.from(foundSkills);
}

/**
 * Generates a weighted match score based on job requirements.
 * 
 * Weights:
 * - Skills: 50% (Core 70%, Secondary 30%)
 * - Experience: 20%
 * - Department: 10%
 * - Description: 20%
 * 
 * @param resumeSkills - Skills extracted from resume.
 * @param jobSkills - Required skills from job posting.
 * @returns Match result with score and skill breakdown
 */
export function generateSkillMatchScore(
    resumeSkills: string[],
    jobSkills: string[]
): { score: number; matchedSkills: string[]; missingSkills: string[]; matchRate: number; coreMatches: number; secondaryMatches: number; totalCore: number; totalSecondary: number } {
    if (!jobSkills || jobSkills.length === 0) {
        return { score: 0, matchedSkills: [], missingSkills: [], matchRate: 0, coreMatches: 0, secondaryMatches: 0, totalCore: 0, totalSecondary: 0 };
    }

    // Normalize job skills to canonical form
    const canonicalJobSkills = jobSkills.map(skill => {
        const s = skill.toLowerCase();
        const found = Object.keys(skillOntology).find(key =>
            skillOntology[key].includes(s) || key === s
        );
        return found || s;
    });

    const totalSkills = canonicalJobSkills.length;
    const coreCount = Math.ceil(totalSkills / 2);

    const coreSkills = canonicalJobSkills.slice(0, coreCount);
    const secondarySkills = canonicalJobSkills.slice(coreCount);

    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    let coreMatches = 0;
    let secondaryMatches = 0;

    // Check Core Skills (first 50% - weighted 70%)
    coreSkills.forEach(skill => {
        if (resumeSkills.includes(skill)) {
            coreMatches++;
            matchedSkills.push(skill);
        } else {
            missingSkills.push(skill);
        }
    });

    // Check Secondary Skills (last 50% - weighted 30%)
    secondarySkills.forEach(skill => {
        if (resumeSkills.includes(skill)) {
            secondaryMatches++;
            matchedSkills.push(skill);
        } else {
            missingSkills.push(skill);
        }
    });

    // Calculate Weighted Score (50 points max for skills)
    // Core skills: 70% weight, Secondary: 30% weight
    const coreWeight = 70;
    const secondaryWeight = 30;

    const coreScore = coreSkills.length > 0 ? (coreMatches / coreSkills.length) * coreWeight : 0;
    const secondaryScore = secondarySkills.length > 0
        ? (secondaryMatches / secondarySkills.length) * secondaryWeight
        : 0;

    // Skill score out of 100, then scaled to 50%
    let skillScore: number;
    if (secondarySkills.length === 0) {
        skillScore = (coreMatches / coreSkills.length) * 100;
    } else {
        skillScore = coreScore + secondaryScore;
    }

    // Calculate overall match rate
    const matchRate = totalSkills > 0
        ? Math.round((matchedSkills.length / totalSkills) * 100)
        : 0;

    return {
        score: Math.round(skillScore * 0.5), // 50% weight (max 50 points)
        matchedSkills,
        missingSkills,
        matchRate,
        coreMatches,
        secondaryMatches,
        totalCore: coreSkills.length,
        totalSecondary: secondarySkills.length
    };
}

/**
 * Calculate experience matching score (max 20 points)
 */
export function calculateExperienceScore(
    resumeText: string,
    jobExperience: string
): { score: number; candidateYears: number; requiredYears: number; status: string } {
    // Extract years from job requirement
    const jobYearsMatch = jobExperience?.match(/(\d+)/);
    const requiredYears = jobYearsMatch ? parseInt(jobYearsMatch[0]) : 0;

    // Extract years from resume text
    const resumeYearsMatches = resumeText.match(/(\d+)\s*\+?\s*(years?|yrs?)/gi);
    let candidateYears = 0;

    if (resumeYearsMatches && resumeYearsMatches.length > 0) {
        const years = resumeYearsMatches.map(match => {
            const num = match.match(/(\d+)/);
            return num ? parseInt(num[0]) : 0;
        });
        candidateYears = Math.max(...years);
    }

    let score = 0;
    let status = '';

    if (candidateYears >= requiredYears) {
        score = 20;
        status = 'Meets or exceeds requirement';
    } else if (candidateYears >= requiredYears * 0.7) {
        score = 15;
        status = 'Close to requirement';
    } else if (candidateYears > 0) {
        score = 10;
        status = 'Below requirement';
    } else {
        score = 5;
        status = 'Experience not clearly stated';
    }

    return { score, candidateYears, requiredYears, status };
}

/**
 * Calculate department matching score (max 10 points)
 */
export function calculateDepartmentScore(
    resumeText: string,
    jobDescription: string
): { score: number; status: string; matchedDepartments: string[] } {
    const departments = [
        'engineering', 'software', 'development', 'frontend', 'backend',
        'fullstack', 'data', 'analytics', 'marketing', 'sales', 'hr',
        'finance', 'operations', 'design', 'product', 'devops', 'cloud',
        'mobile', 'security', 'qa', 'testing'
    ];

    const resumeLower = resumeText.toLowerCase();
    const jobLower = jobDescription.toLowerCase();

    const jobDepartments = departments.filter(dept => jobLower.includes(dept));

    if (jobDepartments.length === 0) {
        return { score: 7, status: 'Department not specified', matchedDepartments: [] };
    }

    const matchedDepartments = jobDepartments.filter(dept => resumeLower.includes(dept));
    const matchPercentage = matchedDepartments.length / jobDepartments.length;
    const score = Math.round(matchPercentage * 10);

    return {
        score: Math.min(15, Math.round(matchPercentage * 15)), // Changed to 15% max
        status: matchedDepartments.length > 0 ? 'Matched' : 'Not matched',
        matchedDepartments
    };
}

/**
 * Calculate description keyword matching score (Cultural Fit - max 5 points)
 */
export function calculateDescriptionScore(
    candidateSkills: string[],
    jobDescription: string
): { score: number; matchPercentage: number; keywordMatches: number } {
    const descriptionSkills = extractSkillsFromText(jobDescription);

    if (descriptionSkills.length === 0) {
        return { score: 3, matchPercentage: 0, keywordMatches: 0 };
    }

    const matches = descriptionSkills.filter(skill => candidateSkills.includes(skill));
    const matchPercentage = Math.round((matches.length / descriptionSkills.length) * 100);
    const score = Math.round((matches.length / descriptionSkills.length) * 5); // Changed to 5% max

    return { score, matchPercentage, keywordMatches: matches.length };
}

/**
 * Calculate projects score (max 10 points)
 * If candidate has ANY project that uses skills related to JD, they get points
 */
export function calculateProjectsScore(
    resumeText: string,
    jobSkills: string[]
): { score: number; relevantProjects: string[]; projectCount: number } {
    // Look for project indicators in resume
    const projectIndicators = ['project', 'built', 'developed', 'created', 'implemented', 'designed', 'github', 'portfolio'];
    const resumeLower = resumeText.toLowerCase();

    // Extract project sections
    const projectMatches = resumeLower.match(/project[s]?\s*[:\-]?([^]*?)(?=experience|education|skills|certification|$)/gi);
    let projectText = '';
    if (projectMatches) {
        projectText = projectMatches.join(' ');
    }

    // Check if any project uses skills from JD
    const relevantProjects: string[] = [];
    let hasProjects = false;

    // Check for project keywords
    for (const indicator of projectIndicators) {
        if (resumeLower.includes(indicator)) {
            hasProjects = true;
            break;
        }
    }

    if (!hasProjects) {
        return { score: 0, relevantProjects: [], projectCount: 0 };
    }

    // Check if any JD skills appear in resume projects section
    const skillMatches = jobSkills.filter(skill => {
        const skillLower = skill.toLowerCase();
        // Check if skill or its aliases appear in project text or general resume
        const skillVariants = skillOntology[skillLower] || [skillLower];
        return skillVariants.some(variant => resumeLower.includes(variant));
    });

    // Calculate score based on having relevant projects
    // Any project using JD-related skills = 10 points
    // Projects exist but no skill match = 5 points
    // No projects = 0 points

    let score = 0;
    if (skillMatches.length > 0) {
        score = 10; // Full points if projects use relevant skills
        relevantProjects.push(...skillMatches.slice(0, 3)); // List up to 3 matched skills
    } else if (hasProjects) {
        score = 5; // Partial points for having any projects
    }

    return {
        score,
        relevantProjects,
        projectCount: skillMatches.length
    };
}

/**
 * Calculate complete weighted match score
 */
export interface WeightedScoreResult {
    totalScore: number;
    humanReadable: string;
    breakdown: {
        skills: {
            score: number;
            max: 50;
            matchedSkills: string[];
            missingSkills: string[];
            matchRate: number;
            coreMatches: number;
            secondaryMatches: number;
            totalCore: number;
            totalSecondary: number;
        };
        experience: {
            score: number;
            max: 20;
            candidate: string;
            required: string;
            status: string;
        };
        department: {
            score: number;
            max: 15; // Changed from 10 to 15 (Education/Department)
            status: string;
            matchedDepartments: string[];
        };
        projects: {
            score: number;
            max: 10;
            relevantProjects: string[];
            projectCount: number;
        };
        description: {
            score: number;
            max: 5; // Changed from 20 to 5 (Cultural Fit)
            matchPercentage: number;
            status: string;
        };
    };
}

export function calculateWeightedMatchScore(
    resumeText: string,
    resumeSkills: string[],
    jobSkills: string[],
    jobExperience: string,
    jobDescription: string
): WeightedScoreResult {
    const skillResult = generateSkillMatchScore(resumeSkills, jobSkills);
    const experienceResult = calculateExperienceScore(resumeText, jobExperience);
    const departmentResult = calculateDepartmentScore(resumeText, jobDescription);
    const projectsResult = calculateProjectsScore(resumeText, jobSkills);
    const descriptionResult = calculateDescriptionScore(resumeSkills, jobDescription);

    const totalScore = skillResult.score + experienceResult.score + departmentResult.score + projectsResult.score + descriptionResult.score;

    // Generate human-readable explanation
    let humanReadable = '';
    if (totalScore >= 80) {
        humanReadable = 'This candidate is an excellent match for the role. They possess most of the required skills and meet experience requirements.';
    } else if (totalScore >= 60) {
        humanReadable = 'This candidate is a good match for the role. They have relevant skills but may be missing some requirements.';
    } else if (totalScore >= 40) {
        humanReadable = 'This candidate is a moderate match for the role. They are missing several critical skills. They may need more experience for this role.';
    } else {
        humanReadable = 'This candidate may not be the best fit for this role based on the skill and experience requirements.';
    }

    return {
        totalScore: Math.min(100, totalScore),
        humanReadable,
        breakdown: {
            skills: {
                score: skillResult.score,
                max: 50,
                matchedSkills: skillResult.matchedSkills,
                missingSkills: skillResult.missingSkills,
                matchRate: skillResult.matchRate,
                coreMatches: skillResult.coreMatches,
                secondaryMatches: skillResult.secondaryMatches,
                totalCore: skillResult.totalCore,
                totalSecondary: skillResult.totalSecondary
            },
            experience: {
                score: experienceResult.score,
                max: 20,
                candidate: experienceResult.candidateYears > 0 ? `${experienceResult.candidateYears} years` : 'Not specified',
                required: experienceResult.requiredYears > 0 ? `${experienceResult.requiredYears} years` : 'Not specified',
                status: experienceResult.status
            },
            department: {
                score: departmentResult.score,
                max: 15,
                status: departmentResult.status,
                matchedDepartments: departmentResult.matchedDepartments
            },
            projects: {
                score: projectsResult.score,
                max: 10,
                relevantProjects: projectsResult.relevantProjects,
                projectCount: projectsResult.projectCount
            },
            description: {
                score: descriptionResult.score,
                max: 5,
                matchPercentage: descriptionResult.matchPercentage,
                status: descriptionResult.matchPercentage > 0
                    ? `${descriptionResult.keywordMatches} keywords matched (${descriptionResult.matchPercentage}%)`
                    : 'No specific keywords in description'
            }
        }
    };
}

/**
 * Sorts applications based on match score (Auto-Ranking).
 */
export function rankCandidates<T extends { matchScore?: number }>(applications: T[]): T[] {
    return applications.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
}
