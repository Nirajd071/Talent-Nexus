/**
 * Onboarding & Post-Offer Portal API Routes
 * Phase 2D: Candidate Engagement & Pre-joining
 */

import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { Candidate, User } from "../db";

const router = Router();

// ==========================================
// ONBOARDING SCHEMA (in-file for simplicity)
// ==========================================

const onboardingTaskSchema = new mongoose.Schema({
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
    candidateEmail: String,
    title: String,
    description: String,
    category: { type: String, enum: ["document", "training", "it_setup", "team", "compliance", "other"] },
    status: { type: String, enum: ["pending", "in_progress", "completed", "blocked"], default: "pending" },
    dueDate: Date,
    completedAt: Date,
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    assignedTo: String,
    documentUrl: String,
    notes: String,
    createdAt: { type: Date, default: Date.now }
});

const candidateDocumentSchema = new mongoose.Schema({
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
    candidateEmail: String,
    documentType: { type: String, enum: ["id_proof", "address_proof", "education", "experience", "photo", "offer_letter", "tax_forms", "other"] },
    fileName: String,
    fileUrl: String,
    status: { type: String, enum: ["pending", "uploaded", "verified", "rejected"], default: "pending" },
    verifiedBy: String,
    verifiedAt: Date,
    notes: String,
    uploadedAt: { type: Date, default: Date.now }
});

const engagementLogSchema = new mongoose.Schema({
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
    candidateEmail: String,
    eventType: { type: String, enum: ["login", "page_view", "task_completed", "document_uploaded", "message_sent"] },
    page: String,
    metadata: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
});

const OnboardingTask = mongoose.models.OnboardingTask || mongoose.model("OnboardingTask", onboardingTaskSchema);
const CandidateDocument = mongoose.models.CandidateDocument || mongoose.model("CandidateDocument", candidateDocumentSchema);
const EngagementLog = mongoose.models.EngagementLog || mongoose.model("EngagementLog", engagementLogSchema);

// ==========================================
// ONBOARDING TASKS
// ==========================================

// Get tasks for a candidate
router.get("/tasks/:candidateEmail", async (req: Request, res: Response) => {
    try {
        const tasks = await OnboardingTask.find({ candidateEmail: req.params.candidateEmail })
            .sort({ dueDate: 1 })
            .lean();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch tasks" });
    }
});

// Create onboarding task
router.post("/tasks", async (req: Request, res: Response) => {
    try {
        const task = new OnboardingTask(req.body);
        await task.save();
        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ error: "Failed to create task" });
    }
});

// Update task status
router.put("/tasks/:id", async (req: Request, res: Response) => {
    try {
        const update: any = { ...req.body };
        if (req.body.status === "completed") {
            update.completedAt = new Date();
        }

        const task = await OnboardingTask.findByIdAndUpdate(req.params.id, update, { new: true });
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: "Failed to update task" });
    }
});

// Initialize default tasks for a new hire
router.post("/tasks/initialize", async (req: Request, res: Response) => {
    try {
        const { candidateId, candidateEmail, startDate, role } = req.body;

        const defaultTasks = [
            { title: "Upload ID Proof", category: "document", priority: "high", dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
            { title: "Upload Address Proof", category: "document", priority: "high", dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
            { title: "Sign Offer Letter", category: "document", priority: "high", dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
            { title: "Complete Tax Forms", category: "compliance", priority: "medium", dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
            { title: "IT Equipment Request", category: "it_setup", priority: "medium", dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
            { title: "Watch Welcome Video", category: "training", priority: "low", dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
            { title: "Meet Your Team", category: "team", priority: "medium", dueDate: new Date(startDate || Date.now() + 14 * 24 * 60 * 60 * 1000) },
            { title: "Complete Compliance Training", category: "compliance", priority: "medium", dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
        ];

        const tasks = await OnboardingTask.insertMany(
            defaultTasks.map(t => ({
                ...t,
                candidateId,
                candidateEmail,
                status: "pending"
            }))
        );

        res.json({ message: "Onboarding tasks initialized", tasks });
    } catch (error) {
        console.error("Initialize tasks error:", error);
        res.status(500).json({ error: "Failed to initialize tasks" });
    }
});

// ==========================================
// DOCUMENTS
// ==========================================

// Get documents for a candidate
router.get("/documents/:candidateEmail", async (req: Request, res: Response) => {
    try {
        const documents = await CandidateDocument.find({ candidateEmail: req.params.candidateEmail }).lean();
        res.json(documents);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch documents" });
    }
});

// Upload document record
router.post("/documents", async (req: Request, res: Response) => {
    try {
        const doc = new CandidateDocument({
            ...req.body,
            status: "uploaded"
        });
        await doc.save();
        res.status(201).json(doc);
    } catch (error) {
        res.status(500).json({ error: "Failed to save document" });
    }
});

// Verify document
router.post("/documents/:id/verify", async (req: Request, res: Response) => {
    try {
        const { verifiedBy, status } = req.body;
        const doc = await CandidateDocument.findByIdAndUpdate(
            req.params.id,
            {
                status: status || "verified",
                verifiedBy,
                verifiedAt: new Date()
            },
            { new: true }
        );
        res.json(doc);
    } catch (error) {
        res.status(500).json({ error: "Failed to verify document" });
    }
});

// ==========================================
// ENGAGEMENT TRACKING
// ==========================================

// Log engagement event
router.post("/engagement", async (req: Request, res: Response) => {
    try {
        const log = new EngagementLog(req.body);
        await log.save();
        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to log engagement" });
    }
});

// Get engagement score for candidate
router.get("/engagement/:candidateEmail", async (req: Request, res: Response) => {
    try {
        const logs = await EngagementLog.find({ candidateEmail: req.params.candidateEmail })
            .sort({ timestamp: -1 })
            .limit(100)
            .lean();

        const lastLogin = logs.find(l => l.eventType === "login")?.timestamp;
        const totalEvents = logs.length;
        const tasksCompleted = logs.filter(l => l.eventType === "task_completed").length;
        const docsUploaded = logs.filter(l => l.eventType === "document_uploaded").length;

        // Calculate engagement score (0-100)
        let score = 0;
        if (lastLogin && new Date(lastLogin) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
            score += 30; // Logged in within last week
        }
        score += Math.min(30, totalEvents * 2); // Activity points
        score += Math.min(20, tasksCompleted * 5); // Task completion points
        score += Math.min(20, docsUploaded * 10); // Document upload points

        const riskLevel = score < 30 ? "high" : score < 60 ? "medium" : "low";

        res.json({
            score,
            riskLevel,
            lastLogin,
            totalEvents,
            tasksCompleted,
            docsUploaded,
            recentActivity: logs.slice(0, 10)
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to get engagement data" });
    }
});

// ==========================================
// DASHBOARD (Admin View)
// ==========================================

// Get all new hires with their progress
router.get("/new-hires", async (req: Request, res: Response) => {
    try {
        // Get candidates with accepted offers
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // For now, return empty array - can be populated with actual candidate data
        // when integrated with offers collection
        res.json([]);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch new hires" });
    }
});

// Get drop-off risk alerts
router.get("/alerts", async (req: Request, res: Response) => {
    try {
        // Find candidates with low engagement in the last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const recentLogins = await EngagementLog.aggregate([
            { $match: { eventType: "login", timestamp: { $gte: sevenDaysAgo } } },
            { $group: { _id: "$candidateEmail", lastLogin: { $max: "$timestamp" } } }
        ]);

        const activeEmails = recentLogins.map(r => r._id);

        // Get all candidates with pending tasks who haven't logged in
        const atRiskTasks = await OnboardingTask.find({
            status: "pending",
            candidateEmail: { $nin: activeEmails }
        }).lean();

        const alerts = atRiskTasks.reduce((acc: any[], task) => {
            const existing = acc.find(a => a.candidateEmail === task.candidateEmail);
            if (existing) {
                existing.pendingTasks++;
            } else {
                acc.push({
                    candidateEmail: task.candidateEmail,
                    pendingTasks: 1,
                    riskReason: "No recent activity"
                });
            }
            return acc;
        }, []);

        res.json(alerts);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch alerts" });
    }
});

// ==========================================
// CANDIDATE PORTAL
// ==========================================

// Get complete onboarding status for candidate
router.get("/portal/:candidateEmail", async (req: Request, res: Response) => {
    try {
        const { candidateEmail } = req.params;

        const [tasks, documents, engagement] = await Promise.all([
            OnboardingTask.find({ candidateEmail }).sort({ dueDate: 1 }).lean(),
            CandidateDocument.find({ candidateEmail }).lean(),
            EngagementLog.find({ candidateEmail }).sort({ timestamp: -1 }).limit(10).lean()
        ]);

        const completedTasks = tasks.filter(t => t.status === "completed").length;
        const totalTasks = tasks.length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const verifiedDocs = documents.filter(d => d.status === "verified").length;
        const pendingDocs = documents.filter(d => d.status === "pending" || d.status === "uploaded").length;

        res.json({
            candidateEmail,
            progress,
            tasks,
            documents,
            stats: {
                completedTasks,
                totalTasks,
                verifiedDocs,
                pendingDocs
            },
            recentActivity: engagement
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch portal data" });
    }
});

export default router;
