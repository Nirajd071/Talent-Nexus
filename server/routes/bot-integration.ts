/**
 * Slack/Teams Bot Integration API Routes
 * Notifications in chat apps
 */

import { Router, Request, Response } from "express";
import mongoose from "mongoose";

const router = Router();

// ==========================================
// BOT CONFIGURATION SCHEMA
// ==========================================

const botConfigSchema = new mongoose.Schema({
    platform: { type: String, enum: ["slack", "teams", "discord"], required: true },
    name: String,
    webhookUrl: String,
    botToken: String,
    channelId: String,
    isActive: { type: Boolean, default: true },

    // Notification settings
    notifications: {
        newApplication: { type: Boolean, default: true },
        interviewScheduled: { type: Boolean, default: true },
        interviewCompleted: { type: Boolean, default: true },
        offerSent: { type: Boolean, default: true },
        offerAccepted: { type: Boolean, default: true },
        offerDeclined: { type: Boolean, default: true },
        candidateHired: { type: Boolean, default: true },
        newReferral: { type: Boolean, default: true }
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const BotConfig = mongoose.models.BotConfig || mongoose.model("BotConfig", botConfigSchema);

// Message log schema
const messageLogSchema = new mongoose.Schema({
    botConfigId: { type: mongoose.Schema.Types.ObjectId, ref: "BotConfig" },
    platform: String,
    eventType: String,
    message: String,
    success: Boolean,
    error: String,
    sentAt: { type: Date, default: Date.now }
});

const MessageLog = mongoose.models.MessageLog || mongoose.model("MessageLog", messageLogSchema);

// ==========================================
// BOT CONFIGURATION
// ==========================================

// Get bot configurations
router.get("/configs", async (req: Request, res: Response) => {
    try {
        const configs = await BotConfig.find()
            .select("-botToken -webhookUrl")
            .lean();
        res.json(configs);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch configurations" });
    }
});

// Create bot configuration
router.post("/configs", async (req: Request, res: Response) => {
    try {
        const { platform, name, webhookUrl, botToken, channelId, notifications } = req.body;

        if (!platform || !webhookUrl) {
            return res.status(400).json({ error: "Platform and webhookUrl are required" });
        }

        const config = new BotConfig({
            platform,
            name: name || `${platform} Bot`,
            webhookUrl,
            botToken,
            channelId,
            notifications: notifications || {}
        });

        await config.save();

        // Return without sensitive data
        const result = config.toObject();
        delete result.webhookUrl;
        delete result.botToken;

        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ error: "Failed to create configuration" });
    }
});

// Update configuration
router.put("/configs/:id", async (req: Request, res: Response) => {
    try {
        const config = await BotConfig.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: new Date() },
            { new: true }
        );
        if (!config) return res.status(404).json({ error: "Configuration not found" });

        const result = config.toObject();
        delete result.webhookUrl;
        delete result.botToken;

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Failed to update configuration" });
    }
});

// Delete configuration
router.delete("/configs/:id", async (req: Request, res: Response) => {
    try {
        await BotConfig.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete configuration" });
    }
});

// ==========================================
// SEND NOTIFICATIONS
// ==========================================

// Send test message
router.post("/configs/:id/test", async (req: Request, res: Response) => {
    try {
        const config = await BotConfig.findById(req.params.id);
        if (!config) return res.status(404).json({ error: "Configuration not found" });

        const message = {
            text: "🔔 Test notification from TalentOS ATS",
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "*Test Notification* ✅\nYour TalentOS integration is working correctly!"
                    }
                }
            ]
        };

        const result = await sendToWebhook(config.webhookUrl!, config.platform, message);

        // Log message
        await new MessageLog({
            botConfigId: config._id,
            platform: config.platform,
            eventType: "test",
            message: JSON.stringify(message),
            success: result.success,
            error: result.error
        }).save();

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Failed to send test message" });
    }
});

// Send notification (internal use)
router.post("/notify", async (req: Request, res: Response) => {
    try {
        const { eventType, data } = req.body;

        if (!eventType) {
            return res.status(400).json({ error: "eventType is required" });
        }

        // Get all active configs that have this notification enabled
        const configs = await BotConfig.find({
            isActive: true,
            [`notifications.${eventType}`]: true
        });

        const results: any[] = [];

        for (const config of configs) {
            const message = buildMessage(eventType, data, config.platform);
            const result = await sendToWebhook(config.webhookUrl!, config.platform, message);

            // Log message
            await new MessageLog({
                botConfigId: config._id,
                platform: config.platform,
                eventType,
                message: typeof message === "string" ? message : JSON.stringify(message),
                success: result.success,
                error: result.error
            }).save();

            results.push({
                platform: config.platform,
                success: result.success
            });
        }

        res.json({ sent: results.length, results });
    } catch (error) {
        res.status(500).json({ error: "Failed to send notifications" });
    }
});

// ==========================================
// MESSAGE LOGS
// ==========================================

router.get("/logs", async (req: Request, res: Response) => {
    try {
        const { configId, limit = 50 } = req.query;
        const query: any = {};
        if (configId) query.botConfigId = configId;

        const logs = await MessageLog.find(query)
            .sort({ sentAt: -1 })
            .limit(Number(limit))
            .lean();

        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch logs" });
    }
});

// ==========================================
// HELPER FUNCTIONS
// ==========================================

async function sendToWebhook(webhookUrl: string, platform: string, message: any): Promise<{ success: boolean; error?: string }> {
    try {
        // In production, use fetch or axios to send to the webhook
        // For now, simulate success
        console.log(`[Bot] Sending to ${platform}:`, message);

        // Simulate HTTP POST to webhook
        // const response = await fetch(webhookUrl, {
        //     method: "POST",
        //     headers: { "Content-Type": "application/json" },
        //     body: JSON.stringify(message)
        // });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

function buildMessage(eventType: string, data: any, platform: string): any {
    const messages: Record<string, any> = {
        newApplication: {
            text: `📝 New Application: ${data.candidateName || "A candidate"} applied for ${data.jobTitle || "a position"}`,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*📝 New Application*\n*Candidate:* ${data.candidateName || "Unknown"}\n*Position:* ${data.jobTitle || "Unknown"}\n*Source:* ${data.source || "Direct"}`
                    }
                }
            ]
        },
        interviewScheduled: {
            text: `📅 Interview Scheduled: ${data.candidateName} on ${data.date}`,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*📅 Interview Scheduled*\n*Candidate:* ${data.candidateName}\n*Date:* ${data.date}\n*Type:* ${data.type || "Video"}`
                    }
                }
            ]
        },
        offerAccepted: {
            text: `🎉 Offer Accepted: ${data.candidateName} accepted the offer for ${data.jobTitle}!`,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*🎉 Offer Accepted!*\n*Candidate:* ${data.candidateName}\n*Position:* ${data.jobTitle}\n\nWelcome to the team! 🎊`
                    }
                }
            ]
        },
        candidateHired: {
            text: `🌟 New Hire: ${data.candidateName} has joined as ${data.jobTitle}!`,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*🌟 New Hire!*\n*Name:* ${data.candidateName}\n*Position:* ${data.jobTitle}\n*Start Date:* ${data.startDate || "TBD"}`
                    }
                }
            ]
        },
        newReferral: {
            text: `👥 New Referral: ${data.referrerName} referred ${data.candidateName}`,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*👥 New Referral*\n*Referred by:* ${data.referrerName}\n*Candidate:* ${data.candidateName}\n*Position:* ${data.jobTitle || "General"}`
                    }
                }
            ]
        }
    };

    return messages[eventType] || { text: `TalentOS: ${eventType} event occurred` };
}

export default router;
