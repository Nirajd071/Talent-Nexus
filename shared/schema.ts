import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Job Descriptions Table
export const jobDescriptions = pgTable("job_descriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  department: varchar("department", { length: 100 }),
  location: varchar("location", { length: 100 }),
  type: varchar("type", { length: 50 }).default("Full-time"),
  experienceRequired: varchar("experience_required", { length: 50 }),
  rawText: text("raw_text").notNull(),
  parsedRequirements: jsonb("parsed_requirements"),
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertJobDescriptionSchema = createInsertSchema(jobDescriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertJobDescription = z.infer<typeof insertJobDescriptionSchema>;
export type JobDescription = typeof jobDescriptions.$inferSelect;

// Resumes/Candidates Table
export const resumes = pgTable("resumes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobDescriptionId: varchar("job_description_id").references(() => jobDescriptions.id),

  // Candidate Information
  candidateName: varchar("candidate_name", { length: 255 }),
  candidateEmail: varchar("candidate_email", { length: 255 }),
  candidatePhone: varchar("candidate_phone", { length: 50 }),
  candidateLocation: varchar("candidate_location", { length: 255 }),

  // Resume Content
  filePath: varchar("file_path", { length: 500 }),
  fileType: varchar("file_type", { length: 20 }),
  rawText: text("raw_text"),

  // Parsed Data
  parsedData: jsonb("parsed_data"),

  // Metadata
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  processingStatus: varchar("processing_status", { length: 50 }).default("pending"),
  processingError: text("processing_error"),
});

export const insertResumeSchema = createInsertSchema(resumes).omit({
  id: true,
  uploadedAt: true,
  processedAt: true,
});

export type InsertResume = z.infer<typeof insertResumeSchema>;
export type Resume = typeof resumes.$inferSelect;

// Candidate Rankings Table
export const candidateRankings = pgTable("candidate_rankings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resumeId: varchar("resume_id").references(() => resumes.id).notNull(),
  jobDescriptionId: varchar("job_description_id").references(() => jobDescriptions.id).notNull(),

  // Scoring Components
  semanticSimilarityScore: real("semantic_similarity_score"),
  skillMatchScore: real("skill_match_score"),
  experienceMatchScore: real("experience_match_score"),
  educationMatchScore: real("education_match_score"),

  // Final Score
  finalScore: real("final_score"),
  rank: integer("rank"),

  // Explainability
  explanation: jsonb("explanation"),
  redFlags: jsonb("red_flags"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCandidateRankingSchema = createInsertSchema(candidateRankings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCandidateRanking = z.infer<typeof insertCandidateRankingSchema>;
export type CandidateRanking = typeof candidateRankings.$inferSelect;

// Agent Activity Logs Table
export const agentLogs = pgTable("agent_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentName: varchar("agent_name", { length: 100 }).notNull(),
  agentType: varchar("agent_type", { length: 50 }),
  message: text("message").notNull(),
  logType: varchar("log_type", { length: 50 }).default("info"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAgentLogSchema = createInsertSchema(agentLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAgentLog = z.infer<typeof insertAgentLogSchema>;
export type AgentLog = typeof agentLogs.$inferSelect;

// Assessment Sessions Table
export const assessmentSessions = pgTable("assessment_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resumeId: varchar("resume_id").references(() => resumes.id),

  // Security Checks
  cameraStatus: boolean("camera_status").default(false),
  micStatus: boolean("mic_status").default(false),
  networkStatus: boolean("network_status").default(false),
  screenStatus: boolean("screen_status").default(false),

  // Proctoring Data
  focusLostCount: integer("focus_lost_count").default(0),
  objectsDetected: jsonb("objects_detected"),
  trustScore: real("trust_score").default(100),

  // Session Info
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  status: varchar("status", { length: 50 }).default("active"),
});

export const insertAssessmentSessionSchema = createInsertSchema(assessmentSessions).omit({
  id: true,
  startedAt: true,
});

export type InsertAssessmentSession = z.infer<typeof insertAssessmentSessionSchema>;
export type AssessmentSession = typeof assessmentSessions.$inferSelect;

// ============================================
// PHASE 2: EVALUATION & DECISION LAYER TABLES
// ============================================

// Interviews Table
export const interviews = pgTable("interviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resumeId: varchar("resume_id").references(() => resumes.id).notNull(),
  jobDescriptionId: varchar("job_description_id").references(() => jobDescriptions.id).notNull(),

  // Scheduling
  scheduledAt: timestamp("scheduled_at"),
  duration: integer("duration").default(60), // minutes
  timezone: varchar("timezone", { length: 50 }),
  meetingLink: varchar("meeting_link", { length: 500 }),

  // Interview Details
  type: varchar("type", { length: 50 }), // 'phone_screen', 'technical', 'behavioral', 'panel'
  round: integer("round").default(1),
  interviewerIds: jsonb("interviewer_ids"), // Array of interviewer IDs
  candidateName: varchar("candidate_name", { length: 255 }),

  // Status
  status: varchar("status", { length: 50 }).default("scheduled"), // 'scheduled', 'completed', 'cancelled', 'no_show'

  // Metadata
  remindersSent: boolean("reminders_sent").default(false),
  interviewKitId: varchar("interview_kit_id"),
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInterviewSchema = createInsertSchema(interviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInterview = z.infer<typeof insertInterviewSchema>;
export type Interview = typeof interviews.$inferSelect;

// Interview Feedback Table
export const interviewFeedback = pgTable("interview_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  interviewId: varchar("interview_id").references(() => interviews.id).notNull(),
  interviewerId: varchar("interviewer_id").notNull(),
  interviewerName: varchar("interviewer_name", { length: 255 }),

  // Structured Scores (1-5 scale)
  technicalScore: real("technical_score"),
  communicationScore: real("communication_score"),
  cultureFitScore: real("culture_fit_score"),
  problemSolvingScore: real("problem_solving_score"),
  overallScore: real("overall_score"),

  // Qualitative Feedback
  strengths: jsonb("strengths"), // Array of strings
  concerns: jsonb("concerns"), // Array of strings
  recommendation: varchar("recommendation", { length: 20 }), // 'strong_hire', 'hire', 'no_hire', 'strong_no_hire'
  notes: text("notes"),

  // AI-Generated Insights
  aiTranscript: text("ai_transcript"),
  aiSummary: text("ai_summary"),
  aiSentiment: jsonb("ai_sentiment"),

  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInterviewFeedbackSchema = createInsertSchema(interviewFeedback).omit({
  id: true,
  createdAt: true,
});

export type InsertInterviewFeedback = z.infer<typeof insertInterviewFeedbackSchema>;
export type InterviewFeedback = typeof interviewFeedback.$inferSelect;

// Interview Kits Table
export const interviewKits = pgTable("interview_kits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobDescriptionId: varchar("job_description_id").references(() => jobDescriptions.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }), // 'technical', 'behavioral', 'case_study'
  questions: jsonb("questions"), // Array of question objects
  rubric: jsonb("rubric"), // Scoring criteria
  estimatedDuration: integer("estimated_duration").default(45),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInterviewKitSchema = createInsertSchema(interviewKits).omit({
  id: true,
  createdAt: true,
});

export type InsertInterviewKit = z.infer<typeof insertInterviewKitSchema>;
export type InterviewKit = typeof interviewKits.$inferSelect;

// Offers Table
export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resumeId: varchar("resume_id").references(() => resumes.id).notNull(),
  jobDescriptionId: varchar("job_description_id").references(() => jobDescriptions.id).notNull(),
  candidateName: varchar("candidate_name", { length: 255 }),
  candidateEmail: varchar("candidate_email", { length: 255 }),

  // Compensation
  baseSalary: real("base_salary"),
  bonus: real("bonus"),
  equity: varchar("equity", { length: 100 }),
  currency: varchar("currency", { length: 10 }).default("USD"),

  // Details
  jobTitle: varchar("job_title", { length: 255 }),
  department: varchar("department", { length: 100 }),
  startDate: timestamp("start_date"),
  expiresAt: timestamp("expires_at"),
  benefits: jsonb("benefits"),

  // Status Workflow
  status: varchar("status", { length: 50 }).default("draft"), // 'draft', 'pending_approval', 'approved', 'sent', 'accepted', 'declined', 'negotiating'
  approvalChain: jsonb("approval_chain"), // Array of approver objects with status
  currentApprover: varchar("current_approver"),

  // E-Signature
  documentUrl: varchar("document_url", { length: 500 }),
  signatureStatus: varchar("signature_status", { length: 50 }),
  signedAt: timestamp("signed_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = typeof offers.$inferSelect;

// Skill Tests Table
export const skillTests = pgTable("skill_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }), // 'coding', 'case_study', 'mcq', 'video_response'
  language: varchar("language", { length: 50 }), // Programming language for coding tests
  difficulty: varchar("difficulty", { length: 20 }), // 'easy', 'medium', 'hard'
  timeLimit: integer("time_limit"), // minutes
  questions: jsonb("questions"),
  rubric: jsonb("rubric"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSkillTestSchema = createInsertSchema(skillTests).omit({
  id: true,
  createdAt: true,
});

export type InsertSkillTest = z.infer<typeof insertSkillTestSchema>;
export type SkillTest = typeof skillTests.$inferSelect;

// Test Submissions Table
export const testSubmissions = pgTable("test_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  skillTestId: varchar("skill_test_id").references(() => skillTests.id).notNull(),
  resumeId: varchar("resume_id").references(() => resumes.id).notNull(),
  candidateName: varchar("candidate_name", { length: 255 }),

  // Submission
  answers: jsonb("answers"),
  code: text("code"),
  videoUrl: varchar("video_url", { length: 500 }),

  // Scoring
  autoScore: real("auto_score"),
  manualScore: real("manual_score"),
  finalScore: real("final_score"),
  aiAnalysis: jsonb("ai_analysis"),

  // Proctoring
  proctoringFlags: jsonb("proctoring_flags"),
  trustScore: real("trust_score").default(100),
  integrityScore: integer("integrity_score").default(100), // 0-100 hackathon integrity score
  plagiarismScore: real("plagiarism_score"), // 0-1 similarity score
  autoSubmitted: boolean("auto_submitted").default(false),
  timeLimitSeconds: integer("time_limit_seconds"),
  questionOrder: jsonb("question_order"), // Randomized question IDs

  startedAt: timestamp("started_at"),
  submittedAt: timestamp("submitted_at"),
  status: varchar("status", { length: 50 }).default("pending"), // 'pending', 'in_progress', 'submitted', 'graded', 'flagged'
});

export const insertTestSubmissionSchema = createInsertSchema(testSubmissions).omit({
  id: true,
});

export type InsertTestSubmission = z.infer<typeof insertTestSubmissionSchema>;
export type TestSubmission = typeof testSubmissions.$inferSelect;

// ============================================
// HACKATHON: SECURITY & COMPLIANCE TABLES
// ============================================

// Users Table with Role-Based Access Control
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("candidate"), // candidate | interviewer | recruiter | admin
  name: varchar("name", { length: 255 }).notNull(),
  department: varchar("department", { length: 100 }),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Proctoring Events Table - Detailed Event Logging
export const proctoringEvents = pgTable("proctoring_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => assessmentSessions.id),
  submissionId: varchar("submission_id").references(() => testSubmissions.id),
  userId: varchar("user_id").references(() => users.id),

  // Event Details
  eventType: varchar("event_type", { length: 50 }).notNull(), // tab_switch | focus_loss | paste | disconnect | face_missing | multiple_faces | copy | right_click
  severity: varchar("severity", { length: 20 }).notNull().default("low"), // low | medium | high | critical
  metadata: jsonb("metadata"), // Additional context (e.g., { tabCount: 3, duration: 5000 })

  // Location in Assessment
  questionIndex: integer("question_index"),
  timeIntoPractice: integer("time_into_practice"), // seconds since start

  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertProctoringEventSchema = createInsertSchema(proctoringEvents).omit({
  id: true,
  timestamp: true,
});

export type InsertProctoringEvent = z.infer<typeof insertProctoringEventSchema>;
export type ProctoringEvent = typeof proctoringEvents.$inferSelect;

// Consent Records Table - Track all consent given
export const consentRecords = pgTable("consent_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  resumeId: varchar("resume_id").references(() => resumes.id), // For non-registered candidates

  // Consent Details
  consentType: varchar("consent_type", { length: 50 }).notNull(), // proctoring | recording | data_processing | ai_analysis | communication
  consentGiven: boolean("consent_given").notNull(),
  consentText: text("consent_text"), // The actual text they agreed to
  version: varchar("version", { length: 20 }).default("1.0"),

  // Context
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  context: varchar("context", { length: 100 }), // assessment | interview | onboarding

  timestamp: timestamp("timestamp").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const insertConsentRecordSchema = createInsertSchema(consentRecords).omit({
  id: true,
  timestamp: true,
});

export type InsertConsentRecord = z.infer<typeof insertConsentRecordSchema>;
export type ConsentRecord = typeof consentRecords.$inferSelect;

// Audit Logs Table - Track all data access and actions
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  userEmail: varchar("user_email", { length: 255 }), // Denormalized for quick reference

  // Action Details
  action: varchar("action", { length: 50 }).notNull(), // view | download | update | delete | export | unlock_pii | login | logout
  resourceType: varchar("resource_type", { length: 50 }).notNull(), // candidate | resume | interview | offer | assessment | report
  resourceId: varchar("resource_id"),
  resourceName: varchar("resource_name", { length: 255 }), // Human-readable identifier

  // Context
  metadata: jsonb("metadata"), // Additional details about the action
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  success: boolean("success").default(true),
  errorMessage: text("error_message"),

  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Evaluation History Table - Versioned Scorecards (Immutable)
export const evaluationHistory = pgTable("evaluation_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resumeId: varchar("resume_id").references(() => resumes.id).notNull(),
  jobDescriptionId: varchar("job_description_id").references(() => jobDescriptions.id),
  evaluatorId: varchar("evaluator_id").references(() => users.id),
  evaluatorName: varchar("evaluator_name", { length: 255 }),

  // Versioning
  version: integer("version").notNull().default(1),
  isLatest: boolean("is_latest").default(true),
  previousVersionId: varchar("previous_version_id"),

  // Scores (1-5 scale)
  scores: jsonb("scores"), // { technical: 4.5, communication: 5, cultureFit: 4, problemSolving: 4.5 }
  overallScore: real("overall_score"),

  // Decision
  recommendation: varchar("recommendation", { length: 20 }), // strong_hire | hire | maybe | no_hire | strong_no_hire
  reasonCodes: jsonb("reason_codes"), // ['SKILL_MATCH', 'EXPERIENCE_FIT', 'CULTURE_CONCERN']
  notes: text("notes"),

  // AI Analysis (if any)
  aiGenerated: boolean("ai_generated").default(false),
  aiPromptVersion: varchar("ai_prompt_version", { length: 50 }),
  aiModelUsed: varchar("ai_model_used", { length: 100 }),

  // Interview/Stage Reference
  interviewId: varchar("interview_id").references(() => interviews.id),
  stage: varchar("stage", { length: 50 }), // screening | technical | behavioral | final

  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEvaluationHistorySchema = createInsertSchema(evaluationHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertEvaluationHistory = z.infer<typeof insertEvaluationHistorySchema>;
export type EvaluationHistory = typeof evaluationHistory.$inferSelect;

// AI Interaction Logs Table - Track all AI usage for compliance
export const aiInteractionLogs = pgTable("ai_interaction_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),

  // AI Details
  modelUsed: varchar("model_used", { length: 100 }).notNull(), // gpt-4, claude-3, gemini
  promptVersion: varchar("prompt_version", { length: 50 }),
  feature: varchar("feature", { length: 100 }), // resume_parsing | interview_summary | job_matching

  // Input/Output (PII-stripped)
  promptHash: varchar("prompt_hash", { length: 64 }), // Hash for deduplication
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  piiStripped: boolean("pii_stripped").default(true),

  // Context
  resourceType: varchar("resource_type", { length: 50 }),
  resourceId: varchar("resource_id"),

  // Timing
  latencyMs: integer("latency_ms"),
  success: boolean("success").default(true),
  errorMessage: text("error_message"),

  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertAiInteractionLogSchema = createInsertSchema(aiInteractionLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertAiInteractionLog = z.infer<typeof insertAiInteractionLogSchema>;
export type AiInteractionLog = typeof aiInteractionLogs.$inferSelect;

// Reason Codes Reference Table
export const reasonCodes = pgTable("reason_codes", {
  code: varchar("code", { length: 50 }).primaryKey(),
  category: varchar("category", { length: 50 }).notNull(), // positive | negative
  label: varchar("label", { length: 100 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
});

export const insertReasonCodeSchema = createInsertSchema(reasonCodes);
export type InsertReasonCode = z.infer<typeof insertReasonCodeSchema>;
export type ReasonCode = typeof reasonCodes.$inferSelect;

