import {
  type JobDescription,
  type InsertJobDescription,
  type Resume,
  type InsertResume,
  type CandidateRanking,
  type InsertCandidateRanking,
  type AgentLog,
  type InsertAgentLog,
  type AssessmentSession,
  type InsertAssessmentSession,
  jobDescriptions,
  resumes,
  candidateRankings,
  agentLogs,
  assessmentSessions,
  users,
  auditLogs,
  consentRecords,
  evaluationHistory,
  reasonCodes,
  proctoringEvents,
  testSubmissions,
  interviews,
  interviewFeedback
} from "@shared/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, desc, and, sql } from "drizzle-orm";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL || "";
const client = connectionString ? postgres(connectionString) : null;
export const db = client ? drizzle(client, { schema }) : null as any;

export interface IStorage {
  // Job Descriptions
  createJob(job: InsertJobDescription): Promise<JobDescription>;
  getJob(id: string): Promise<JobDescription | undefined>;
  listJobs(status?: string): Promise<JobDescription[]>;
  updateJob(id: string, data: Partial<InsertJobDescription>): Promise<JobDescription | undefined>;

  // Resumes/Candidates
  createResume(resume: InsertResume): Promise<Resume>;
  getResume(id: string): Promise<Resume | undefined>;
  listResumes(jobId?: string): Promise<Resume[]>;
  updateResume(id: string, data: Partial<InsertResume>): Promise<Resume | undefined>;

  // Rankings
  createRanking(ranking: InsertCandidateRanking): Promise<CandidateRanking>;
  getRankingsForJob(jobId: string): Promise<CandidateRanking[]>;
  getRankingForCandidate(resumeId: string, jobId: string): Promise<CandidateRanking | undefined>;

  // Agent Logs
  createAgentLog(log: InsertAgentLog): Promise<AgentLog>;
  getRecentAgentLogs(limit?: number): Promise<AgentLog[]>;

  // Assessment Sessions
  createAssessmentSession(session: InsertAssessmentSession): Promise<AssessmentSession>;
  updateAssessmentSession(id: string, data: Partial<InsertAssessmentSession>): Promise<AssessmentSession | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Job Descriptions
  async createJob(job: InsertJobDescription): Promise<JobDescription> {
    const [created] = await db.insert(jobDescriptions).values(job).returning();
    return created;
  }

  async getJob(id: string): Promise<JobDescription | undefined> {
    const [job] = await db.select().from(jobDescriptions).where(eq(jobDescriptions.id, id));
    return job;
  }

  async listJobs(status?: string): Promise<JobDescription[]> {
    if (status) {
      return db.select().from(jobDescriptions).where(eq(jobDescriptions.status, status)).orderBy(desc(jobDescriptions.createdAt));
    }
    return db.select().from(jobDescriptions).orderBy(desc(jobDescriptions.createdAt));
  }

  async updateJob(id: string, data: Partial<InsertJobDescription>): Promise<JobDescription | undefined> {
    const [updated] = await db.update(jobDescriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(jobDescriptions.id, id))
      .returning();
    return updated;
  }

  // Resumes/Candidates
  async createResume(resume: InsertResume): Promise<Resume> {
    const [created] = await db.insert(resumes).values(resume).returning();
    return created;
  }

  async getResume(id: string): Promise<Resume | undefined> {
    const [resume] = await db.select().from(resumes).where(eq(resumes.id, id));
    return resume;
  }

  async listResumes(jobId?: string): Promise<Resume[]> {
    if (jobId) {
      return db.select().from(resumes).where(eq(resumes.jobDescriptionId, jobId)).orderBy(desc(resumes.uploadedAt));
    }
    return db.select().from(resumes).orderBy(desc(resumes.uploadedAt));
  }

  async updateResume(id: string, data: Partial<InsertResume>): Promise<Resume | undefined> {
    const [updated] = await db.update(resumes)
      .set(data)
      .where(eq(resumes.id, id))
      .returning();
    return updated;
  }

  // Rankings
  async createRanking(ranking: InsertCandidateRanking): Promise<CandidateRanking> {
    const [created] = await db.insert(candidateRankings).values(ranking).returning();
    return created;
  }

  async getRankingsForJob(jobId: string): Promise<CandidateRanking[]> {
    return db.select()
      .from(candidateRankings)
      .where(eq(candidateRankings.jobDescriptionId, jobId))
      .orderBy(desc(candidateRankings.finalScore));
  }

  async getRankingForCandidate(resumeId: string, jobId: string): Promise<CandidateRanking | undefined> {
    const [ranking] = await db.select()
      .from(candidateRankings)
      .where(
        and(
          eq(candidateRankings.resumeId, resumeId),
          eq(candidateRankings.jobDescriptionId, jobId)
        )
      );
    return ranking;
  }

  // Agent Logs
  async createAgentLog(log: InsertAgentLog): Promise<AgentLog> {
    const [created] = await db.insert(agentLogs).values(log).returning();
    return created;
  }

  async getRecentAgentLogs(limit: number = 50): Promise<AgentLog[]> {
    return db.select()
      .from(agentLogs)
      .orderBy(desc(agentLogs.createdAt))
      .limit(limit);
  }

  // Assessment Sessions
  async createAssessmentSession(session: InsertAssessmentSession): Promise<AssessmentSession> {
    const [created] = await db.insert(assessmentSessions).values(session).returning();
    return created;
  }

  async updateAssessmentSession(id: string, data: Partial<InsertAssessmentSession>): Promise<AssessmentSession | undefined> {
    const [updated] = await db.update(assessmentSessions)
      .set(data)
      .where(eq(assessmentSessions.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
