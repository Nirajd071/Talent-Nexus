/**
 * Tags, Templates, and Automated Workflows API
 * Comprehensive automation for the hiring pipeline
 */

import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { Candidate, Application, Job } from "../db";

const router = Router();

// ==========================================
// TAGS SCHEMA
// ==========================================

const tagSchema = new mongoose.Schema({
    name: { type: String, required: true },
    color: { type: String, default: "#6366f1" },
    category: { type: String, enum: ["candidate", "job", "general"], default: "candidate" },
    description: String,
    usageCount: { type: Number, default: 0 },
    createdBy: String,
    createdAt: { type: Date, default: Date.now }
});

const Tag = mongoose.models.Tag || mongoose.model("Tag", tagSchema);

// ==========================================
// INTERVIEW TEMPLATE SCHEMA
// ==========================================

const interviewTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ["phone_screen", "technical", "behavioral", "culture_fit", "final", "custom"], default: "custom" },
    duration: { type: Number, default: 60 }, // minutes
    description: String,

    // Questions
    questions: [{
        text: String,
        category: String,
        timeAllocation: Number, // minutes
        scoringCriteria: String,
        mustAsk: { type: Boolean, default: false }
    }],

    // Scoring rubric
    scoringRubric: {
        categories: [{
            name: String,
            weight: Number,
            criteria: [{
                score: Number,
                description: String
            }]
        }]
    },

    // Settings
    isDefault: { type: Boolean, default: false },
    jobTypes: [String], // e.g., ["engineering", "design"]
    createdBy: String,
    createdAt: { type: Date, default: Date.now }
});

const InterviewTemplate = mongoose.models.InterviewTemplate || mongoose.model("InterviewTemplate", interviewTemplateSchema);

// ==========================================
// WORKFLOW AUTOMATION SCHEMA
// ==========================================

const workflowSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    isActive: { type: Boolean, default: true },

    // Trigger
    trigger: {
        event: {
            type: String, enum: [
                "application_received",
                "status_changed",
                "interview_scheduled",
                "interview_completed",
                "offer_sent",
                "offer_accepted",
                "offer_declined",
                "candidate_rejected",
                "time_elapsed",
                "score_threshold"
            ], required: true
        },
        conditions: [{
            field: String,
            operator: { type: String, enum: ["equals", "not_equals", "contains", "greater_than", "less_than"] },
            value: mongoose.Schema.Types.Mixed
        }]
    },

    // Actions
    actions: [{
        type: {
            type: String, enum: [
                "send_email",
                "send_notification",
                "update_status",
                "add_tag",
                "remove_tag",
                "assign_to",
                "create_task",
                "send_slack",
                "delay",
                "score_candidate"
            ]
        },
        config: mongoose.Schema.Types.Mixed,
        order: Number
    }],

    // Stats
    timesTriggered: { type: Number, default: 0 },
    lastTriggeredAt: Date,

    createdBy: String,
    createdAt: { type: Date, default: Date.now }
});

const Workflow = mongoose.models.Workflow || mongoose.model("Workflow", workflowSchema);

// Workflow execution log
const workflowLogSchema = new mongoose.Schema({
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: "Workflow" },
    workflowName: String,
    triggeredBy: String,
    targetType: String,
    targetId: mongoose.Schema.Types.ObjectId,
    actionsExecuted: [{
        type: String,
        success: Boolean,
        error: String,
        executedAt: Date
    }],
    success: Boolean,
    executedAt: { type: Date, default: Date.now }
});

const WorkflowLog = mongoose.models.WorkflowLog || mongoose.model("WorkflowLog", workflowLogSchema);

// ==========================================
// TAGS ENDPOINTS
// ==========================================

router.get("/tags", async (req: Request, res: Response) => {
    try {
        const { category } = req.query;
        const query: any = {};
        if (category) query.category = category;

        const tags = await Tag.find(query).sort({ usageCount: -1 }).lean();
        res.json(tags);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch tags" });
    }
});

router.post("/tags", async (req: Request, res: Response) => {
    try {
        const tag = new Tag(req.body);
        await tag.save();
        res.status(201).json(tag);
    } catch (error) {
        res.status(500).json({ error: "Failed to create tag" });
    }
});

router.delete("/tags/:id", async (req: Request, res: Response) => {
    try {
        await Tag.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete tag" });
    }
});

// Bulk tag candidates
router.post("/tags/bulk-apply", async (req: Request, res: Response) => {
    try {
        const { tagId, candidateIds } = req.body;

        if (!tagId || !candidateIds || !Array.isArray(candidateIds)) {
            return res.status(400).json({ error: "tagId and candidateIds required" });
        }

        const tag = await Tag.findById(tagId);
        if (!tag) return res.status(404).json({ error: "Tag not found" });

        // Update candidates
        await Candidate.updateMany(
            { _id: { $in: candidateIds } },
            { $addToSet: { tags: tag.name } }
        );

        // Update tag usage count
        tag.usageCount += candidateIds.length;
        await tag.save();

        res.json({ success: true, tagged: candidateIds.length });
    } catch (error) {
        res.status(500).json({ error: "Failed to apply tags" });
    }
});

// ==========================================
// INTERVIEW TEMPLATE ENDPOINTS
// ==========================================

router.get("/templates", async (req: Request, res: Response) => {
    try {
        const { type, jobType } = req.query;
        const query: any = {};
        if (type) query.type = type;
        if (jobType) query.jobTypes = jobType;

        const templates = await InterviewTemplate.find(query).lean();
        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch templates" });
    }
});

router.get("/templates/:id", async (req: Request, res: Response) => {
    try {
        const template = await InterviewTemplate.findById(req.params.id).lean();
        if (!template) return res.status(404).json({ error: "Template not found" });
        res.json(template);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch template" });
    }
});

router.post("/templates", async (req: Request, res: Response) => {
    try {
        const template = new InterviewTemplate(req.body);
        await template.save();
        res.status(201).json(template);
    } catch (error) {
        res.status(500).json({ error: "Failed to create template" });
    }
});

router.put("/templates/:id", async (req: Request, res: Response) => {
    try {
        const template = await InterviewTemplate.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!template) return res.status(404).json({ error: "Template not found" });
        res.json(template);
    } catch (error) {
        res.status(500).json({ error: "Failed to update template" });
    }
});

router.delete("/templates/:id", async (req: Request, res: Response) => {
    try {
        await InterviewTemplate.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete template" });
    }
});

// Clone template
router.post("/templates/:id/clone", async (req: Request, res: Response) => {
    try {
        const original = await InterviewTemplate.findById(req.params.id).lean();
        if (!original) return res.status(404).json({ error: "Template not found" });

        const clone = new InterviewTemplate({
            ...original,
            _id: undefined,
            name: `${original.name} (Copy)`,
            isDefault: false,
            createdAt: new Date()
        });
        await clone.save();

        res.status(201).json(clone);
    } catch (error) {
        res.status(500).json({ error: "Failed to clone template" });
    }
});

// ==========================================
// WORKFLOW ENDPOINTS
// ==========================================

router.get("/workflows", async (req: Request, res: Response) => {
    try {
        const { isActive } = req.query;
        const query: any = {};
        if (isActive !== undefined) query.isActive = isActive === "true";

        const workflows = await Workflow.find(query).sort({ createdAt: -1 }).lean();
        res.json(workflows);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch workflows" });
    }
});

router.get("/workflows/:id", async (req: Request, res: Response) => {
    try {
        const workflow = await Workflow.findById(req.params.id).lean();
        if (!workflow) return res.status(404).json({ error: "Workflow not found" });
        res.json(workflow);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch workflow" });
    }
});

router.post("/workflows", async (req: Request, res: Response) => {
    try {
        const workflow = new Workflow(req.body);
        await workflow.save();
        res.status(201).json(workflow);
    } catch (error) {
        res.status(500).json({ error: "Failed to create workflow" });
    }
});

router.put("/workflows/:id", async (req: Request, res: Response) => {
    try {
        const workflow = await Workflow.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!workflow) return res.status(404).json({ error: "Workflow not found" });
        res.json(workflow);
    } catch (error) {
        res.status(500).json({ error: "Failed to update workflow" });
    }
});

router.delete("/workflows/:id", async (req: Request, res: Response) => {
    try {
        await Workflow.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete workflow" });
    }
});

// Toggle workflow active state
router.post("/workflows/:id/toggle", async (req: Request, res: Response) => {
    try {
        const workflow = await Workflow.findById(req.params.id);
        if (!workflow) return res.status(404).json({ error: "Workflow not found" });

        workflow.isActive = !workflow.isActive;
        await workflow.save();

        res.json({ success: true, isActive: workflow.isActive });
    } catch (error) {
        res.status(500).json({ error: "Failed to toggle workflow" });
    }
});

// Trigger workflow manually
router.post("/workflows/:id/trigger", async (req: Request, res: Response) => {
    try {
        const { targetType, targetId } = req.body;

        const workflow = await Workflow.findById(req.params.id);
        if (!workflow) return res.status(404).json({ error: "Workflow not found" });

        // Execute actions
        const executedActions: any[] = [];

        for (const action of workflow.actions.sort((a: any, b: any) => (a.order || 0) - (b.order || 0))) {
            try {
                await executeAction(action, targetType, targetId);
                executedActions.push({
                    type: action.type,
                    success: true,
                    executedAt: new Date()
                });
            } catch (error: any) {
                executedActions.push({
                    type: action.type,
                    success: false,
                    error: error.message,
                    executedAt: new Date()
                });
            }
        }

        // Log execution
        await new WorkflowLog({
            workflowId: workflow._id,
            workflowName: workflow.name,
            triggeredBy: "manual",
            targetType,
            targetId,
            actionsExecuted: executedActions,
            success: executedActions.every(a => a.success)
        }).save();

        // Update workflow stats
        workflow.timesTriggered++;
        workflow.lastTriggeredAt = new Date();
        await workflow.save();

        res.json({
            success: true,
            actionsExecuted: executedActions
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to trigger workflow" });
    }
});

// Get workflow logs
router.get("/workflows/:id/logs", async (req: Request, res: Response) => {
    try {
        const logs = await WorkflowLog.find({ workflowId: req.params.id })
            .sort({ executedAt: -1 })
            .limit(50)
            .lean();
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch logs" });
    }
});

// ==========================================
// PRESET WORKFLOWS
// ==========================================

router.get("/workflows/presets", async (req: Request, res: Response) => {
    res.json([
        {
            name: "Auto-screen new applications",
            trigger: { event: "application_received" },
            actions: [
                { type: "score_candidate", order: 1 },
                { type: "send_notification", config: { message: "New application scored" }, order: 2 }
            ]
        },
        {
            name: "Send thank you after interview",
            trigger: { event: "interview_completed" },
            actions: [
                { type: "delay", config: { hours: 2 }, order: 1 },
                { type: "send_email", config: { template: "interview_thank_you" }, order: 2 }
            ]
        },
        {
            name: "Notify team on offer acceptance",
            trigger: { event: "offer_accepted" },
            actions: [
                { type: "send_slack", config: { message: "🎉 Offer accepted!" }, order: 1 },
                { type: "update_status", config: { status: "hired" }, order: 2 }
            ]
        }
    ]);
});

// ==========================================
// HELPER FUNCTION
// ==========================================

async function executeAction(action: any, targetType: string, targetId: string): Promise<void> {
    switch (action.type) {
        case "send_notification":
            console.log(`[Workflow] Sending notification: ${action.config?.message}`);
            break;
        case "update_status":
            if (targetType === "candidate") {
                await Candidate.findByIdAndUpdate(targetId, { status: action.config?.status });
            } else if (targetType === "application") {
                await Application.findByIdAndUpdate(targetId, { status: action.config?.status });
            }
            break;
        case "add_tag":
            await Candidate.findByIdAndUpdate(targetId, { $addToSet: { tags: action.config?.tag } });
            break;
        case "send_email":
            console.log(`[Workflow] Sending email template: ${action.config?.template}`);
            break;
        case "delay":
            // In production, use job queue like Bull
            console.log(`[Workflow] Delay: ${action.config?.hours || 0} hours`);
            break;
        case "score_candidate":
            console.log(`[Workflow] Running AI scoring for candidate: ${targetId}`);
            break;
        default:
            console.log(`[Workflow] Unknown action: ${action.type}`);
    }
}

export default router;
