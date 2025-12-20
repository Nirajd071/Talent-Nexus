/**
 * Email Campaigns & Templates API Routes
 * Bulk email campaigns with template support
 */

import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { Candidate, Job } from "../db";
import nodemailer from "nodemailer";

const router = Router();

// Email transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

// ==========================================
// EMAIL TEMPLATE SCHEMA
// ==========================================

const emailTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    category: { type: String, enum: ["outreach", "follow_up", "interview", "offer", "rejection", "custom"], default: "custom" },
    variables: [String], // e.g., ["candidateName", "jobTitle", "companyName"]
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
    createdBy: String,
    createdAt: { type: Date, default: Date.now }
});

const emailCampaignSchema = new mongoose.Schema({
    name: { type: String, required: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "EmailTemplate" },
    subject: String,
    body: String,
    recipients: [{
        email: String,
        name: String,
        candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
        status: { type: String, enum: ["pending", "sent", "failed", "opened", "clicked"], default: "pending" },
        sentAt: Date,
        error: String
    }],
    status: { type: String, enum: ["draft", "scheduled", "sending", "completed", "failed"], default: "draft" },
    scheduledAt: Date,
    startedAt: Date,
    completedAt: Date,
    stats: {
        total: { type: Number, default: 0 },
        sent: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
        opened: { type: Number, default: 0 }
    },
    createdBy: String,
    createdAt: { type: Date, default: Date.now }
});

const EmailTemplate = mongoose.models.EmailTemplate || mongoose.model("EmailTemplate", emailTemplateSchema);
const EmailCampaign = mongoose.models.EmailCampaign || mongoose.model("EmailCampaign", emailCampaignSchema);

// ==========================================
// TEMPLATES CRUD
// ==========================================

// List templates
router.get("/templates", async (req: Request, res: Response) => {
    try {
        const { category } = req.query;
        const query: any = { isActive: true };
        if (category) query.category = category;

        const templates = await EmailTemplate.find(query).sort({ createdAt: -1 });
        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch templates" });
    }
});

// Get template by ID
router.get("/templates/:id", async (req: Request, res: Response) => {
    try {
        const template = await EmailTemplate.findById(req.params.id);
        if (!template) return res.status(404).json({ error: "Template not found" });
        res.json(template);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch template" });
    }
});

// Create template
router.post("/templates", async (req: Request, res: Response) => {
    try {
        const { name, subject, body, category } = req.body;

        // Extract variables from body (format: {{variableName}})
        const variableRegex = /\{\{(\w+)\}\}/g;
        const variables: string[] = [];
        let match;
        while ((match = variableRegex.exec(body)) !== null) {
            if (!variables.includes(match[1])) {
                variables.push(match[1]);
            }
        }

        const template = new EmailTemplate({
            name,
            subject,
            body,
            category: category || "custom",
            variables
        });

        await template.save();
        res.status(201).json(template);
    } catch (error) {
        res.status(500).json({ error: "Failed to create template" });
    }
});

// Update template
router.put("/templates/:id", async (req: Request, res: Response) => {
    try {
        const template = await EmailTemplate.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(template);
    } catch (error) {
        res.status(500).json({ error: "Failed to update template" });
    }
});

// Delete template
router.delete("/templates/:id", async (req: Request, res: Response) => {
    try {
        await EmailTemplate.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ message: "Template deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete template" });
    }
});

// ==========================================
// CAMPAIGNS CRUD
// ==========================================

// List campaigns
router.get("/campaigns", async (req: Request, res: Response) => {
    try {
        const campaigns = await EmailCampaign.find()
            .sort({ createdAt: -1 })
            .populate("templateId", "name")
            .lean();
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch campaigns" });
    }
});

// Get campaign by ID
router.get("/campaigns/:id", async (req: Request, res: Response) => {
    try {
        const campaign = await EmailCampaign.findById(req.params.id)
            .populate("templateId");
        if (!campaign) return res.status(404).json({ error: "Campaign not found" });
        res.json(campaign);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch campaign" });
    }
});

// Create campaign
router.post("/campaigns", async (req: Request, res: Response) => {
    try {
        const { name, templateId, subject, body, recipientEmails, recipientFilters } = req.body;

        let recipients: any[] = [];

        // If specific emails provided
        if (recipientEmails && recipientEmails.length > 0) {
            recipients = recipientEmails.map((email: string) => ({
                email,
                name: email.split("@")[0],
                status: "pending"
            }));
        }
        // If filters provided, fetch from candidates
        else if (recipientFilters) {
            const candidateQuery: any = {};
            if (recipientFilters.status) candidateQuery.status = recipientFilters.status;
            if (recipientFilters.skills) candidateQuery.skills = { $in: recipientFilters.skills };

            const candidates = await Candidate.find(candidateQuery).limit(500).lean();
            recipients = candidates.map((c: any) => ({
                email: c.email,
                name: c.name,
                candidateId: c._id,
                status: "pending"
            }));
        }

        const campaign = new EmailCampaign({
            name,
            templateId,
            subject,
            body,
            recipients,
            stats: { total: recipients.length }
        });

        await campaign.save();
        res.status(201).json(campaign);
    } catch (error) {
        console.error("Create campaign error:", error);
        res.status(500).json({ error: "Failed to create campaign" });
    }
});

// ==========================================
// SEND CAMPAIGN
// ==========================================

// Helper: Replace variables in template
function replaceVariables(text: string, data: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
        return data[variable] || match;
    });
}

// Send campaign
router.post("/campaigns/:id/send", async (req: Request, res: Response) => {
    try {
        const campaign = await EmailCampaign.findById(req.params.id);
        if (!campaign) return res.status(404).json({ error: "Campaign not found" });

        if (campaign.status === "sending" || campaign.status === "completed") {
            return res.status(400).json({ error: "Campaign already sent or in progress" });
        }

        // Start sending
        campaign.status = "sending";
        campaign.startedAt = new Date();
        await campaign.save();

        // Send emails asynchronously
        (async () => {
            let sent = 0;
            let failed = 0;

            for (const recipient of campaign.recipients) {
                try {
                    const variables = {
                        candidateName: recipient.name || "Candidate",
                        email: recipient.email,
                        companyName: "Our Company"
                    };

                    const personalizedSubject = replaceVariables(campaign.subject || "", variables);
                    const personalizedBody = replaceVariables(campaign.body || "", variables);

                    await transporter.sendMail({
                        from: process.env.GMAIL_USER,
                        to: recipient.email,
                        subject: personalizedSubject,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                ${personalizedBody.replace(/\n/g, "<br/>")}
                            </div>
                        `
                    });

                    recipient.status = "sent";
                    recipient.sentAt = new Date();
                    sent++;
                } catch (emailError: any) {
                    recipient.status = "failed";
                    recipient.error = emailError.message;
                    failed++;
                }

                // Small delay between emails
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            // Update campaign stats
            campaign.status = "completed";
            campaign.completedAt = new Date();
            campaign.stats = {
                total: campaign.recipients.length,
                sent,
                failed,
                opened: 0
            };
            await campaign.save();
        })();

        res.json({ message: "Campaign sending started", campaign });
    } catch (error) {
        console.error("Send campaign error:", error);
        res.status(500).json({ error: "Failed to send campaign" });
    }
});

// ==========================================
// QUICK SEND (Single email)
// ==========================================

router.post("/send", async (req: Request, res: Response) => {
    try {
        const { to, subject, body, templateId } = req.body;

        let emailSubject = subject;
        let emailBody = body;

        // If using template
        if (templateId) {
            const template = await EmailTemplate.findById(templateId);
            if (template) {
                emailSubject = template.subject;
                emailBody = template.body;
                template.usageCount += 1;
                await template.save();
            }
        }

        await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to,
            subject: emailSubject,
            html: emailBody
        });

        res.json({ success: true, message: "Email sent successfully" });
    } catch (error) {
        console.error("Send email error:", error);
        res.status(500).json({ error: "Failed to send email" });
    }
});

// ==========================================
// STATS
// ==========================================

router.get("/stats", async (req: Request, res: Response) => {
    try {
        const totalTemplates = await EmailTemplate.countDocuments({ isActive: true });
        const totalCampaigns = await EmailCampaign.countDocuments();
        const completedCampaigns = await EmailCampaign.countDocuments({ status: "completed" });

        // Get total emails sent
        const campaigns = await EmailCampaign.find({ status: "completed" }).lean();
        const totalSent = campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0);

        res.json({
            templates: totalTemplates,
            campaigns: totalCampaigns,
            completedCampaigns,
            totalEmailsSent: totalSent
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

export default router;
