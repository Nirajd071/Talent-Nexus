/**
 * MongoDB Database Configuration
 * Using Mongoose for robust MongoDB connection
 */

import mongoose from "mongoose";

let isConnected = false;

// Connect to MongoDB (non-blocking)
export async function connectDB() {
    if (isConnected) return mongoose.connection;

    // Read MongoDB URI inside function to ensure dotenv has loaded
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/talentos";

    try {
        mongoose.set("strictQuery", false);
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 15000, // Allow more time for Atlas connection
        });
        isConnected = true;
        console.log("✅ MongoDB connected successfully");
        return mongoose.connection;
    } catch (error: any) {
        console.error("❌ MongoDB connection error:", error.message);
        console.warn("⚠️ MongoDB not available - running in demo mode (no persistence)");
        return null;
    }
}

// Mongoose Schemas
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: String,
    role: { type: String, enum: ["candidate", "recruiter", "admin"], default: "candidate" },

    // Profile info
    profile: {
        firstName: String,
        lastName: String,
        phone: String,
        avatar: String,
        headline: String,
        summary: String,
        location: String,
        linkedIn: String,
        portfolio: String,
        skills: [String],
        experience: String,
        education: String
    },

    // Resume for candidates
    resume: {
        url: String,
        filename: String,
        parsedData: mongoose.Schema.Types.Mixed,
        uploadedAt: Date
    },

    // Auth & Verification
    emailVerified: { type: Boolean, default: false },
    verificationToken: String,
    verificationExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,

    // Activity
    lastLoginAt: Date,
    createdAt: { type: Date, default: Date.now },
});

const jobSchema = new mongoose.Schema({
    title: { type: String, required: true },
    department: String,
    location: String,
    type: { type: String, default: "Full-time" },
    description: String,
    requirements: [String],
    salary: { min: Number, max: Number },
    status: { type: String, enum: ["draft", "active", "closed"], default: "draft" },
    applicants: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

const candidateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    role: String,
    location: String,
    experience: String,
    skills: [String],
    resume: String,
    resumeText: String, // Extracted text from resume for AI analysis

    // Job application link
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },

    // Overall match score (0-100)
    matchScore: { type: Number, default: 0 },

    // Shortlisting
    shortlisted: { type: Boolean, default: false },
    shortlistedAt: Date,
    shortlistedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Detailed scoring breakdown
    skillsAnalysis: {
        score: { type: Number, default: 0 }, // 0-100
        requiredMatched: [String],
        requiredMissing: [String],
        preferredMatched: [String],
        additionalSkills: [String],
        totalRequired: { type: Number, default: 0 },
        totalPreferred: { type: Number, default: 0 }
    },
    experienceAnalysis: {
        score: { type: Number, default: 0 }, // 0-100
        totalYears: { type: Number, default: 0 },
        relevantYears: { type: Number, default: 0 },
        requiredYears: { type: Number, default: 0 },
        meetsRequirement: { type: Boolean, default: false },
        careerProgression: String // excellent, good, average, poor
    },
    educationAnalysis: {
        score: { type: Number, default: 0 },
        degreeLevel: String,
        degreeField: String,
        university: String,
        certifications: [String]
    },
    locationAnalysis: {
        score: { type: Number, default: 0 },
        candidateLocation: String,
        jobLocation: String,
        isMatch: { type: Boolean, default: false },
        remoteOk: { type: Boolean, default: false }
    },

    // AI recommendation
    aiRecommendation: {
        type: String,
        enum: ["STRONG_HIRE", "HIRE", "MAYBE", "NO_HIRE"],
        default: "MAYBE"
    },
    aiConfidence: { type: Number, default: 0 },
    aiSummary: String,

    // Legacy fields for backward compatibility
    aiReasoning: {
        summary: String,
        strengths: [String],
        gaps: [String],
        confidence: String,
    },

    status: {
        type: String,
        enum: ["new", "screening", "interview", "offer", "hired", "rejected"],
        default: "new"
    },
    source: String,
    appliedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
});

const proctoringEventSchema = new mongoose.Schema({
    submissionId: { type: String, required: true },
    sessionId: String,
    userId: String,
    eventType: { type: String, required: true },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    metadata: mongoose.Schema.Types.Mixed,
    questionIndex: Number,
    timeIntoPractice: Number,
    timestamp: { type: Date, default: Date.now },
});

const consentSchema = new mongoose.Schema({
    userId: String,
    resumeId: String,
    consentType: { type: String, required: true },
    consentGiven: { type: Boolean, required: true },
    consentText: String,
    version: String,
    ipAddress: String,
    userAgent: String,
    context: String,
    timestamp: { type: Date, default: Date.now },
});

const auditLogSchema = new mongoose.Schema({
    userId: String,
    userEmail: String,
    action: { type: String, required: true },
    resourceType: String,
    resourceId: String,
    metadata: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    success: { type: Boolean, default: true },
    errorMessage: String,
    timestamp: { type: Date, default: Date.now },
});

const evaluationSchema = new mongoose.Schema({
    resumeId: { type: String, required: true },
    jobDescriptionId: String,
    evaluatorId: String,
    evaluatorName: String,
    version: { type: Number, default: 1 },
    isLatest: { type: Boolean, default: true },
    previousVersionId: String,
    scores: {
        technical: Number,
        communication: Number,
        cultureFit: Number,
        problemSolving: Number,
        leadership: Number,
        teamwork: Number,
    },
    overallScore: Number,
    recommendation: { type: String, enum: ["strong_hire", "hire", "maybe", "no_hire", "strong_no_hire"] },
    reasonCodes: [String],
    notes: String,
    interviewId: String,
    stage: String,
    aiGenerated: { type: Boolean, default: false },
    aiPromptVersion: String,
    aiModelUsed: String,
    createdAt: { type: Date, default: Date.now },
});

const aiInteractionLogSchema = new mongoose.Schema({
    userId: String,
    modelUsed: String,
    promptVersion: String,
    feature: String,
    inputTokens: Number,
    outputTokens: Number,
    piiStripped: { type: Boolean, default: false },
    resourceType: String,
    resourceId: String,
    latencyMs: Number,
    success: { type: Boolean, default: true },
    errorMessage: String,
    timestamp: { type: Date, default: Date.now },
});

const testSubmissionSchema = new mongoose.Schema({
    candidateId: String,
    testId: String,
    answers: mongoose.Schema.Types.Mixed,
    code: String,
    score: Number,
    integrityScore: { type: Number, default: 100 },
    plagiarismScore: Number,
    timeTakenSeconds: Number,
    autoSubmitted: { type: Boolean, default: false },
    status: { type: String, enum: ["in_progress", "completed", "flagged"], default: "in_progress" },
    startedAt: { type: Date, default: Date.now },
    submittedAt: Date,
});

const offerSchema = new mongoose.Schema({
    candidateId: String,
    candidateName: { type: String, required: true },
    candidateEmail: { type: String, required: true },
    jobId: String,
    role: String,
    department: String,
    baseSalary: Number,
    bonus: Number,
    equity: String,
    startDate: String,
    expiresAt: String,
    status: { type: String, enum: ["draft", "pending_approval", "approved", "sent", "accepted", "declined", "negotiating"], default: "draft" },
    approvalChain: [{
        name: String,
        role: String,
        status: { type: String, enum: ["waiting", "pending", "approved", "rejected"] },
        date: String,
    }],
    // E-Signature fields
    signingToken: { type: String, unique: true, sparse: true },
    signatureData: String, // Base64 image of signature
    signedByName: String,
    signedByIP: String,
    signedAt: String,
    createdAt: { type: Date, default: Date.now },
});

const legacyInterviewSchema = new mongoose.Schema({
    candidateId: String,
    candidateName: String,
    candidateEmail: String,
    jobId: String,
    jobTitle: String,
    date: String,
    time: String,
    duration: String,
    type: { type: String, enum: ["phone", "video", "onsite"], default: "video" },
    interviewers: [{ name: String, email: String }],
    meetingLink: String,
    status: { type: String, enum: ["scheduled", "completed", "cancelled"], default: "scheduled" },
    feedback: String,
    aiSummary: String,
    createdAt: { type: Date, default: Date.now },
});

// Application schema - links candidates to jobs
const applicationSchema = new mongoose.Schema({
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    candidateName: String,
    candidateEmail: String,
    jobTitle: String,
    status: { type: String, enum: ["applied", "screening", "shortlisted", "interview", "offer", "hired", "rejected"], default: "applied" },
    source: { type: String, enum: ["direct", "referral", "linkedin", "indeed", "ai_sourced", "other"], default: "direct" },

    // Resume fields
    resume: String,           // Original filename or path
    resumeUrl: String,        // Public URL to access the resume
    resumeFilename: String,   // Original filename
    resumeText: String,       // Extracted text for AI analysis

    parsedResume: {
        name: String,
        email: String,
        phone: String,
        skills: [String],
        experience: [{ title: String, company: String, duration: String, description: String }],
        education: [{ degree: String, institution: String, year: String }],
        projects: [{ name: String, description: String, technologies: [String] }],
        certifications: [String],
        summary: String,
    },
    matchScore: Number,
    aiScore: Number,
    aiEvaluation: mongoose.Schema.Types.Mixed,
    aiReasoning: String,
    aiShortlisted: Boolean,
    notes: String,
    stage: { type: Number, default: 1 },
    appliedAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Email log schema - tracks all sent emails
const emailLogSchema = new mongoose.Schema({
    recipientEmail: { type: String, required: true },
    recipientName: String,
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    type: { type: String, enum: ["outreach", "interview_invite", "offer", "rejection", "follow_up", "status_update", "reminder"], required: true },
    subject: String,
    body: String,
    status: { type: String, enum: ["sent", "delivered", "opened", "clicked", "bounced", "failed"], default: "sent" },
    sentBy: String,
    messageId: String,
    metadata: mongoose.Schema.Types.Mixed,
    sentAt: { type: Date, default: Date.now },
});

// Code Submission schema - for code assessments
const codeSubmissionSchema = new mongoose.Schema({
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
    candidateName: String,
    candidateEmail: String,
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: "CodingProblem" },
    problemTitle: String,
    language: { type: String, enum: ["python", "java", "cpp"], required: true },
    code: { type: String, required: true },
    testResults: [{
        input: String,
        expectedOutput: String,
        actualOutput: String,
        passed: Boolean,
        executionTime: Number,
        error: String
    }],
    scores: {
        logic: { type: Number, default: 0 },       // 0-50
        semantics: { type: Number, default: 0 },   // 0-50
        penalty: { type: Number, default: 0 },     // negative
        total: { type: Number, default: 0 }        // final score
    },
    aiFeedback: String,
    integrityScore: { type: Number, default: 100 },
    status: { type: String, enum: ["in_progress", "submitted", "evaluated", "flagged"], default: "in_progress" },
    submittedAt: Date,
    evaluatedAt: Date,
    createdAt: { type: Date, default: Date.now }
});

// Coding Problem schema - stores assessment problems
const codingProblemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    category: String,
    testCases: [{
        input: String,
        expectedOutput: String,
        isHidden: { type: Boolean, default: false },
        explanation: String
    }],
    starterCode: {
        python: String,
        java: String,
        cpp: String
    },
    constraints: [String],
    examples: [{
        input: String,
        output: String,
        explanation: String
    }],
    timeLimit: { type: Number, default: 3600 }, // seconds
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

// Assessment Session schema - for secure proctored assessments
const assessmentSessionSchema = new mongoose.Schema({
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
    candidateName: { type: String, required: true },
    candidateEmail: { type: String, required: true },
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: "CodingProblem" },
    assessmentId: String,
    accessToken: { type: String, required: true, unique: true },
    status: {
        type: String,
        enum: ["pending", "ready", "started", "submitted", "evaluated", "expired", "flagged"],
        default: "pending"
    },
    permissions: {
        webcam: { type: Boolean, default: false },
        microphone: { type: Boolean, default: false },
        screen: { type: Boolean, default: false }
    },
    proctoringData: {
        tabSwitches: { type: Number, default: 0 },
        pasteAttempts: { type: Number, default: 0 },
        focusLosses: { type: Number, default: 0 },
        rightClickAttempts: { type: Number, default: 0 },
        webcamActive: { type: Boolean, default: false },
        violations: [{
            type: { type: String },
            severity: String,
            timestamp: Date,
            details: String
        }]
    },
    integrityScore: { type: Number, default: 100 },
    timeLimit: { type: Number, default: 3600 }, // seconds
    startedAt: Date,
    expiresAt: Date,
    submittedAt: Date,
    createdAt: { type: Date, default: Date.now }
});

// Assessment schema - defines test templates created by recruiters
const assessmentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    type: { type: String, enum: ["mcq", "coding", "case_study", "video_response", "mixed"], default: "mixed" },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    timeLimit: { type: Number, default: 60 }, // minutes
    passingScore: { type: Number, default: 70 },
    questions: [{
        id: String,
        type: { type: String, enum: ["mcq", "coding", "open_ended", "case_study"] },
        question: String,
        options: [String],
        correctAnswer: String,
        points: { type: Number, default: 10 },
        timeLimit: Number, // optional per-question time
        codeLanguage: String,
        testCases: [{ input: String, expectedOutput: String, hidden: Boolean }],
        rubric: String
    }],
    proctoring: {
        enabled: { type: Boolean, default: true },
        webcamRequired: { type: Boolean, default: true },
        screenRecording: { type: Boolean, default: true },
        tabSwitchLimit: { type: Number, default: 3 },
        integrityThreshold: { type: Number, default: 80 }
    },
    targetRoles: [String], // job roles this assessment is for
    tags: [String],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isTemplate: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    avgScore: Number,
    completions: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// TestAssignment schema - links assessments to candidates
const testAssignmentSchema = new mongoose.Schema({
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment", required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    candidateEmail: String,
    candidateName: String,
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["assigned", "in_progress", "completed", "evaluated", "expired", "cancelled", "terminated"], default: "assigned" },
    deadline: Date,
    testUrl: String, // unique URL for this assignment
    startedAt: Date,
    completedAt: Date,
    score: Number,
    integrityScore: Number,

    // Proctoring & Cheating Detection
    cheatingFlags: { type: Number, default: 0 },
    terminatedReason: String,  // "3_strikes", "critical_violation", "manual"
    terminatedAt: Date,
    penaltyDeduction: { type: Number, default: 0 }, // Total % deducted from score

    aiEvaluation: {
        score: Number,
        breakdown: mongoose.Schema.Types.Mixed,
        feedback: String,
        recommendation: String
    },
    proctoringReport: {
        flags: [{ type: String, timestamp: Date, severity: String, description: String }],
        overallIntegrity: Number,
        videoUrl: String
    },
    // Store candidate's answers for review
    answers: [{
        questionId: String,
        questionIndex: Number,
        questionTitle: String,
        questionType: String,
        answer: mongoose.Schema.Types.Mixed,
        selectedOption: String,
        textAnswer: String,
        code: String,
        score: Number,
        maxScore: Number,
        isCorrect: Boolean,
        feedback: String
    }],
    notificationSent: { type: Boolean, default: false },
    remindersSent: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

// OTP Schema for recruiter/admin email verification
const otpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    purpose: { type: String, enum: ["login", "register", "reset"], default: "login" },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});

// ============================================
// PHASE 2: QUESTION BANK & ACCESS CODES
// ============================================

// Question Bank Schema - Comprehensive question types
const questionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["coding", "mcq", "aptitude", "soft_skills", "case_study"],
        required: true
    },
    category: String,  // e.g., "Backend Development", "Logical Reasoning"
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    skills: [String], // e.g., ["Python", "Django", "REST APIs"]
    title: { type: String, required: true },
    description: { type: String, required: true }, // Rich text/markdown
    points: { type: Number, default: 10 },
    timeLimit: Number, // minutes (optional per-question time)

    // === CODING SPECIFIC ===
    allowedLanguages: [String], // ["python", "javascript", "java", "cpp"]
    codeTemplate: {
        python: String,
        javascript: String,
        java: String,
        cpp: String
    },
    testCases: [{
        input: String,
        expectedOutput: String,
        isHidden: { type: Boolean, default: false },
        explanation: String,
        weight: { type: Number, default: 1 } // for partial scoring
    }],

    // === MCQ / APTITUDE SPECIFIC ===
    options: [{
        text: String,
        isCorrect: { type: Boolean, default: false },
        explanation: String
    }],
    multipleCorrect: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: true },

    // === SOFT SKILLS SPECIFIC ===
    scenario: String, // Situational judgment context
    idealResponse: String, // Reference answer for AI evaluation
    videoResponseAllowed: { type: Boolean, default: false },
    maxResponseLength: Number, // words or seconds for video

    // === CASE STUDY SPECIFIC ===
    attachments: [{ fileName: String, fileUrl: String, fileType: String }],
    analysisPoints: [String], // Key points evaluator should look for

    // === AI EVALUATION ===
    expectedAnswer: String, // Model answer for reference
    evaluationRubric: String, // Detailed rubric for AI scoring
    aiAutoScore: { type: Boolean, default: true },

    // === METADATA ===
    tags: [String],
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
    avgScore: Number,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Access Code Schema - Unique verification codes for candidates
const accessCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true }, // Format: XXXX-XXXX-XXXX-XXXX

    // Linked entities
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
    candidateEmail: { type: String, required: true },
    candidateName: String,
    testId: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment" },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "TestAssignment" },

    // Validity
    generatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },

    // Usage tracking
    isUsed: { type: Boolean, default: false },
    usedAt: Date,
    usedIP: String,
    verifiedAt: Date,
    verificationIP: String,
    sessionId: String, // Assessment session created on verification
    sessionToken: String, // Token for accessing assessment page

    // Status
    status: {
        type: String,
        enum: ["active", "verified", "used", "expired", "revoked"],
        default: "active"
    },

    // Security
    emailSentAt: Date,
    emailOpened: Boolean,
    linkClicked: Boolean,

    createdAt: { type: Date, default: Date.now }
});

// Verification Log Schema - Track all code verification attempts
const verificationLogSchema = new mongoose.Schema({
    accessCode: String,
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
    candidateEmail: String,
    attemptedAt: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String,
    status: { type: String, enum: ["success", "invalid_code", "wrong_email", "expired", "already_used", "error"] },
    errorMessage: String
});

// ==========================================
// PHASE 2A.1: INTERVIEW SCHEDULING SCHEMAS
// ==========================================

// Interview Schema
const interviewSchema = new mongoose.Schema({
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
    candidateEmail: String,
    candidateName: String,
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    jobTitle: String,

    // Interview Details
    type: {
        type: String,
        enum: ["phone", "video", "in_person", "technical", "hr", "panel", "final"],
        default: "video"
    },
    round: { type: Number, default: 1 },
    status: {
        type: String,
        enum: ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show", "rescheduled"],
        default: "scheduled"
    },

    // Scheduling
    scheduledAt: { type: Date, required: true },
    duration: { type: Number, default: 60 }, // minutes
    timezone: { type: String, default: "Asia/Kolkata" },
    meetingLink: String,
    location: String,

    // Interviewers
    interviewers: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        name: String,
        email: String,
        role: String,
        isLead: { type: Boolean, default: false }
    }],

    // Interview Kit
    kitId: { type: mongoose.Schema.Types.ObjectId, ref: "InterviewKit" },

    // Rescheduling
    allowReschedule: { type: Boolean, default: true },
    rescheduleDeadlineHours: { type: Number, default: 24 },
    rescheduleCount: { type: Number, default: 0 },
    maxReschedules: { type: Number, default: 2 },
    originalScheduledAt: Date,
    rescheduleReason: String,

    // Reminders
    reminderSent24h: { type: Boolean, default: false },
    reminderSent1h: { type: Boolean, default: false },
    calendarInviteSent: { type: Boolean, default: false },

    // Notes
    notes: String,

    // Completion
    feedback: { type: mongoose.Schema.Types.ObjectId, ref: "InterviewFeedback" },
    completedAt: Date,

    createdAt: { type: Date, default: Date.now },
    updatedAt: Date
});

// Interview Kit Schema
const interviewKitSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    type: {
        type: String,
        enum: ["technical", "behavioral", "hr", "panel", "custom"],
        default: "behavioral"
    },
    targetRole: String,
    targetLevel: { type: String, enum: ["entry", "mid", "senior", "lead", "manager"] },

    questions: [{
        question: String,
        category: String,
        expectedAnswer: String,
        timeAllocation: { type: Number, default: 5 }, // minutes
        scoringCriteria: String,
        isRequired: { type: Boolean, default: true }
    }],

    rubric: {
        criteria: [{
            name: String,
            description: String,
            weight: { type: Number, default: 1 }
        }]
    },

    isTemplate: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now }
});

// Interview Feedback Schema
const interviewFeedbackSchema = new mongoose.Schema({
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", required: true },
    interviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    interviewerName: String,
    interviewerEmail: String,
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },

    // Scores by criterion
    scores: [{
        criterion: String,
        score: { type: Number, min: 1, max: 5 },
        notes: String
    }],
    overallScore: { type: Number, min: 1, max: 5 },

    // Recommendation
    recommendation: {
        type: String,
        enum: ["strong_hire", "hire", "lean_hire", "lean_no_hire", "no_hire", "strong_no_hire"],
        required: true
    },

    // Detailed notes
    strengths: [String],
    concerns: [String],
    technicalNotes: String,
    culturalFitNotes: String,
    generalNotes: String,

    // Follow-up
    recommendNextRound: Boolean,
    suggestedNextRoundType: String,

    submittedAt: { type: Date, default: Date.now }
});

// Candidate Lead Schema - for Talent Discovery feature
const candidateLeadSchema = new mongoose.Schema({
    // Basic Info
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: String,

    // Professional Profile
    professionalSummary: String,
    primarySkills: [String],
    interests: [String],
    expectedJobRoles: [String],
    preferredLocation: String,
    yearsOfExperience: Number,

    // Resume
    resumeUrl: String,
    resumeFilename: String,

    // Social Links
    linkedIn: String,
    github: String,
    portfolio: String,

    // Status tracking
    status: {
        type: String,
        enum: ["new", "contacted", "interviewing", "hired", "archived"],
        default: "new"
    },
    contacted: { type: Boolean, default: false },
    contactedAt: Date,
    contactedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Notes from recruiters
    notes: [{
        recruiterId: mongoose.Schema.Types.ObjectId,
        recruiterName: String,
        note: String,
        createdAt: { type: Date, default: Date.now }
    }],

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Recruiter/Admin email patterns (configurable)
export const RECRUITER_EMAIL_PATTERNS = [
    /@kpriet\.ac\.in$/i,    // KPRIET college emails (admin)
    /@.*\.edu$/i,           // University emails
    /@.*\.org$/i,           // Organization emails
    /@company\.com$/i,      // Replace with your company domain
    /@hr\..*$/i,            // HR subdomain emails
    /@talent\..*$/i,        // Talent team emails
    /@recruit\..*$/i,       // Recruiting team emails
    /@hackathon\.com$/i,    // Demo accounts for hackathon jury
];

// Demo accounts with fixed OTP codes (for hackathon jury)
export const DEMO_ACCOUNTS: Record<string, { code: string; role: string }> = {
    "admin.demo@hackathon.com": { code: "999999", role: "recruiter" },
    "user.demo@hackathon.com": { code: "111111", role: "candidate" }
};

// Check if email is a demo account
export function isDemoEmail(email: string): boolean {
    return email.toLowerCase() in DEMO_ACCOUNTS;
}

// Check if email qualifies for recruiter access
export function isRecruiterEmail(email: string): boolean {
    // Demo accounts always pass
    if (isDemoEmail(email)) return true;
    return RECRUITER_EMAIL_PATTERNS.some(pattern => pattern.test(email));
}

// Export Models
export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Job = mongoose.models.Job || mongoose.model("Job", jobSchema);
export const Candidate = mongoose.models.Candidate || mongoose.model("Candidate", candidateSchema);
export const ProctoringEvent = mongoose.models.ProctoringEvent || mongoose.model("ProctoringEvent", proctoringEventSchema);
export const Consent = mongoose.models.Consent || mongoose.model("Consent", consentSchema);
export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
export const Evaluation = mongoose.models.Evaluation || mongoose.model("Evaluation", evaluationSchema);
export const AIInteractionLog = mongoose.models.AIInteractionLog || mongoose.model("AIInteractionLog", aiInteractionLogSchema);
export const TestSubmission = mongoose.models.TestSubmission || mongoose.model("TestSubmission", testSubmissionSchema);
export const Offer = mongoose.models.Offer || mongoose.model("Offer", offerSchema);
export const LegacyInterview = mongoose.models.LegacyInterview || mongoose.model("LegacyInterview", legacyInterviewSchema);
export const Application = mongoose.models.Application || mongoose.model("Application", applicationSchema);
export const EmailLog = mongoose.models.EmailLog || mongoose.model("EmailLog", emailLogSchema);
export const CodeSubmission = mongoose.models.CodeSubmission || mongoose.model("CodeSubmission", codeSubmissionSchema);
export const CodingProblem = mongoose.models.CodingProblem || mongoose.model("CodingProblem", codingProblemSchema);
export const AssessmentSession = mongoose.models.AssessmentSession || mongoose.model("AssessmentSession", assessmentSessionSchema);
export const Assessment = mongoose.models.Assessment || mongoose.model("Assessment", assessmentSchema);
export const TestAssignment = mongoose.models.TestAssignment || mongoose.model("TestAssignment", testAssignmentSchema);
export const OTP = mongoose.models.OTP || mongoose.model("OTP", otpSchema);
// Phase 2: Question Bank & Access Codes
export const Question = mongoose.models.Question || mongoose.model("Question", questionSchema);
export const AccessCode = mongoose.models.AccessCode || mongoose.model("AccessCode", accessCodeSchema);
export const VerificationLog = mongoose.models.VerificationLog || mongoose.model("VerificationLog", verificationLogSchema);

// Phase 2A.1: Interview Scheduling
export const Interview = mongoose.models.Interview || mongoose.model("Interview", interviewSchema);
export const InterviewKit = mongoose.models.InterviewKit || mongoose.model("InterviewKit", interviewKitSchema);
export const InterviewFeedback = mongoose.models.InterviewFeedback || mongoose.model("InterviewFeedback", interviewFeedbackSchema);

// Talent Discovery
export const CandidateLead = mongoose.models.CandidateLead || mongoose.model("CandidateLead", candidateLeadSchema);

// ==========================================
// PHASE 3: INTEGRATION & READINESS SCHEMAS
// ==========================================

// Training Module Schema (LMS Lite)
const trainingModuleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    contentUrl: String,
    contentType: { type: String, enum: ["video", "document", "quiz", "interactive"], default: "video" },
    duration: { type: Number, default: 30 }, // minutes
    required: { type: Boolean, default: false },
    department: String,
    role: String,
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

// Candidate Training Progress Schema
const candidateTrainingSchema = new mongoose.Schema({
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    candidateName: String,
    candidateEmail: String,
    role: String,
    department: String,
    startDate: Date,
    progress: { type: Number, default: 0, min: 0, max: 100 },
    completedModules: [{ type: mongoose.Schema.Types.ObjectId, ref: "TrainingModule" }],
    assignedModules: [{ type: mongoose.Schema.Types.ObjectId, ref: "TrainingModule" }],
    certifications: [{
        name: String,
        earnedAt: Date,
        expiresAt: Date
    }],
    status: { type: String, enum: ["not-started", "in-progress", "completed", "at-risk"], default: "not-started" },
    lastActivityAt: Date,
    createdAt: { type: Date, default: Date.now }
});

// IT Asset Request Schema (ITSM)
const assetRequestSchema = new mongoose.Schema({
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    candidateName: { type: String, required: true },
    candidateEmail: String,
    role: String,
    department: String,
    startDate: Date,

    // Equipment status
    laptop: {
        status: { type: String, enum: ["pending", "ordered", "shipped", "delivered", "setup"], default: "pending" },
        model: String,
        serialNumber: String,
        orderedAt: Date,
        deliveredAt: Date
    },
    monitor: {
        status: { type: String, enum: ["pending", "ordered", "shipped", "delivered", "setup"], default: "pending" },
        model: String
    },
    accessories: {
        status: { type: String, enum: ["pending", "ordered", "shipped", "delivered"], default: "pending" },
        items: [String]
    },

    // Account status
    email: {
        status: { type: String, enum: ["pending", "created", "configured"], default: "pending" },
        address: String,
        createdAt: Date
    },
    slack: {
        status: { type: String, enum: ["pending", "invited", "active"], default: "pending" },
        invitedAt: Date
    },
    github: {
        status: { type: String, enum: ["pending", "invited", "active"], default: "pending" },
        username: String
    },
    vpn: {
        status: { type: String, enum: ["pending", "configured", "active"], default: "pending" }
    },
    badge: {
        status: { type: String, enum: ["pending", "printed", "issued"], default: "pending" },
        badgeNumber: String
    },

    // Overall
    overallProgress: { type: Number, default: 0, min: 0, max: 100 },
    notes: String,
    assignedTo: String,
    completedAt: Date,
    createdAt: { type: Date, default: Date.now }
});

// Attrition Risk Schema
const attritionRiskSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    employeeName: { type: String, required: true },
    employeeEmail: String,
    role: String,
    department: String,
    tenure: String,

    // Risk metrics
    riskScore: { type: Number, min: 0, max: 100, default: 0 },
    riskLevel: { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },
    riskFactors: [String],

    // Data signals
    assessmentScore: Number,
    engagementScore: Number,
    lastRaiseDate: Date,
    lastPromotionDate: Date,
    managerChanges: { type: Number, default: 0 },
    workloadScore: Number,

    // AI analysis
    aiAnalysis: {
        primaryFactor: String,
        recommendation: String,
        confidence: Number,
        analyzedAt: Date
    },

    // Interventions
    interventions: [{
        type: String,
        scheduledAt: Date,
        completedAt: Date,
        notes: String,
        outcome: String
    }],

    lastAnalyzedAt: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// LMS Integration Schema
const lmsIntegrationSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    provider: { type: String, required: true }, // coursera, linkedin, udemy, internal
    status: { type: String, enum: ["connected", "pending", "disconnected", "error"], default: "disconnected" },
    icon: String,

    // OAuth/API credentials (encrypted in production)
    config: {
        apiKey: String,
        apiSecret: String,
        clientId: String,
        clientSecret: String,
        webhookUrl: String,
        baseUrl: String
    },

    // Connection metadata
    connectedAt: Date,
    lastSyncAt: Date,
    syncStatus: { type: String, enum: ["idle", "syncing", "error"], default: "idle" },
    coursesImported: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Provisioning Template Schema
const provisioningTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    items: [String],
    estimatedDays: { type: String, default: "3-5 days" },
    department: String,
    isDefault: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Inventory Item Schema
const inventoryItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, enum: ["laptop", "monitor", "peripheral", "badge", "other"], default: "other" },
    stock: { type: Number, default: 0 },
    minStock: { type: Number, default: 5 },
    status: { type: String, enum: ["In Stock", "Low Stock", "Out of Stock"], default: "In Stock" },
    location: String,
    unitCost: Number,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// ITSM Integration Schema
const itsmIntegrationSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    provider: { type: String, required: true },
    status: { type: String, enum: ["connected", "pending", "disconnected", "error"], default: "disconnected" },
    icon: String,
    config: {
        apiKey: String,
        clientId: String,
        baseUrl: String,
        webhookUrl: String
    },
    connectedAt: Date,
    lastSyncAt: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Phase 3 Model Exports
export const TrainingModule = mongoose.models.TrainingModule || mongoose.model("TrainingModule", trainingModuleSchema);
export const CandidateTraining = mongoose.models.CandidateTraining || mongoose.model("CandidateTraining", candidateTrainingSchema);
export const AssetRequest = mongoose.models.AssetRequest || mongoose.model("AssetRequest", assetRequestSchema);
export const AttritionRisk = mongoose.models.AttritionRisk || mongoose.model("AttritionRisk", attritionRiskSchema);
export const LMSIntegration = mongoose.models.LMSIntegration || mongoose.model("LMSIntegration", lmsIntegrationSchema);
export const ProvisioningTemplate = mongoose.models.ProvisioningTemplate || mongoose.model("ProvisioningTemplate", provisioningTemplateSchema);
export const InventoryItem = mongoose.models.InventoryItem || mongoose.model("InventoryItem", inventoryItemSchema);
export const ITSMIntegration = mongoose.models.ITSMIntegration || mongoose.model("ITSMIntegration", itsmIntegrationSchema);

// For backward compatibility with services
export const db = {
    insert: async (model: any) => ({
        values: async (data: any) => {
            const doc = new model(data);
            await doc.save();
            return { returning: () => [doc] };
        }
    }),
};
