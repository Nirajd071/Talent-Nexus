/**
 * TalentOS Event System - Central Integration Layer
 * Connects all features with AI automation and real-time updates
 */

import { EventEmitter } from "events";
import mongoose from "mongoose";
import AI from "./ai";

// ==========================================
// EVENT TYPES
// ==========================================

export type EventType =
    // Application Events
    | "application:created"
    | "application:status_changed"
    | "application:scored"
    // Candidate Events
    | "candidate:created"
    | "candidate:updated"
    | "candidate:stage_changed"
    // Interview Events
    | "interview:scheduled"
    | "interview:completed"
    | "interview:cancelled"
    | "interview:feedback_submitted"
    // Offer Events
    | "offer:created"
    | "offer:sent"
    | "offer:accepted"
    | "offer:declined"
    | "offer:negotiation"
    // Hiring Events
    | "candidate:hired"
    | "candidate:rejected"
    // Referral Events
    | "referral:submitted"
    | "referral:status_changed"
    // Job Events
    | "job:created"
    | "job:published"
    | "job:closed";

export interface TalentEvent {
    type: EventType;
    timestamp: Date;
    data: {
        candidateId?: string;
        candidateName?: string;
        candidateEmail?: string;
        jobId?: string;
        jobTitle?: string;
        applicationId?: string;
        interviewId?: string;
        offerId?: string;
        referralId?: string;
        userId?: string;
        userName?: string;
        status?: string;
        previousStatus?: string;
        metadata?: Record<string, any>;
    };
}

// ==========================================
// GLOBAL EVENT EMITTER
// ==========================================

class TalentEventEmitter extends EventEmitter {
    private static instance: TalentEventEmitter;

    private constructor() {
        super();
        this.setMaxListeners(50);
        this.setupHandlers();
    }

    static getInstance(): TalentEventEmitter {
        if (!TalentEventEmitter.instance) {
            TalentEventEmitter.instance = new TalentEventEmitter();
        }
        return TalentEventEmitter.instance;
    }

    // Emit a typed event
    emitEvent(event: TalentEvent) {
        console.log(`[Event] ${event.type}:`, event.data);
        this.emit(event.type, event);
        this.emit("*", event); // Wildcard for logging/debugging
    }

    // Setup default handlers
    private setupHandlers() {
        // ==========================================
        // APPLICATION HANDLERS
        // ==========================================

        this.on("application:created", async (event: TalentEvent) => {
            try {
                // 1. Auto-score with AI
                if (event.data.candidateId && event.data.jobId) {
                    console.log(`[AI] Auto-scoring candidate ${event.data.candidateId} for job ${event.data.jobId}`);

                    // In production, call the actual scoring API
                    // await fetch('/api/ai/score-candidate', { method: 'POST', body: JSON.stringify({...}) });
                }

                // 2. Send notification
                await this.createNotification({
                    type: "application",
                    title: "New Application",
                    message: `${event.data.candidateName || "A candidate"} applied for ${event.data.jobTitle || "a position"}`,
                    link: `/candidates/${event.data.candidateId}`
                });

                // 3. Trigger workflows
                await this.triggerWorkflows("application_received", event.data);

                // 4. Send Slack notification if configured
                await this.sendBotNotification("newApplication", event.data);

            } catch (error) {
                console.error("[Event Handler] application:created error:", error);
            }
        });

        this.on("application:scored", async (event: TalentEvent) => {
            try {
                const score = event.data.metadata?.score || 0;

                // High score alert
                if (score >= 80) {
                    await this.createNotification({
                        type: "ai_insight",
                        title: "High-Potential Candidate!",
                        message: `${event.data.candidateName} scored ${score}% for ${event.data.jobTitle}. Consider fast-tracking!`,
                        link: `/candidates/${event.data.candidateId}`
                    });
                }

                // Low score - auto-reject suggestion
                if (score < 30) {
                    await this.triggerWorkflows("score_threshold", {
                        ...event.data,
                        condition: "low_score"
                    });
                }
            } catch (error) {
                console.error("[Event Handler] application:scored error:", error);
            }
        });

        // ==========================================
        // INTERVIEW HANDLERS
        // ==========================================

        this.on("interview:scheduled", async (event: TalentEvent) => {
            try {
                // Notify candidate (would send email)
                console.log(`[Email] Sending interview invite to ${event.data.candidateEmail}`);

                // Notify interviewers
                await this.createNotification({
                    type: "interview",
                    title: "Interview Scheduled",
                    message: `Interview with ${event.data.candidateName} for ${event.data.jobTitle}`,
                    link: `/interviews/${event.data.interviewId}`
                });

                await this.triggerWorkflows("interview_scheduled", event.data);
                await this.sendBotNotification("interviewScheduled", event.data);

            } catch (error) {
                console.error("[Event Handler] interview:scheduled error:", error);
            }
        });

        this.on("interview:completed", async (event: TalentEvent) => {
            try {
                // Generate AI summary if transcript available
                if (event.data.metadata?.transcript) {
                    const summary = await AI.generateInterviewSummary(event.data.metadata.transcript);
                    console.log("[AI] Generated interview summary:", summary);
                }

                await this.triggerWorkflows("interview_completed", event.data);

            } catch (error) {
                console.error("[Event Handler] interview:completed error:", error);
            }
        });

        this.on("interview:feedback_submitted", async (event: TalentEvent) => {
            try {
                // Check if all feedbacks collected
                const Interview = mongoose.models.Interview;
                const InterviewFeedback = mongoose.models.InterviewFeedback;

                if (Interview && InterviewFeedback) {
                    const interview = await Interview.findById(event.data.interviewId);
                    if (interview) {
                        const feedbackCount = await InterviewFeedback.countDocuments({
                            interviewId: event.data.interviewId
                        });
                        const interviewerCount = interview.interviewers?.length || 1;

                        if (feedbackCount >= interviewerCount) {
                            // All feedback collected - trigger AI analysis
                            console.log(`[AI] All feedback collected for interview ${event.data.interviewId}`);
                            await this.createNotification({
                                type: "ai_insight",
                                title: "Interview Analysis Ready",
                                message: `All feedback collected for ${event.data.candidateName}. AI analysis available.`,
                                link: `/interviews/${event.data.interviewId}`
                            });
                        }
                    }
                }
            } catch (error) {
                console.error("[Event Handler] interview:feedback_submitted error:", error);
            }
        });

        // ==========================================
        // OFFER HANDLERS
        // ==========================================

        this.on("offer:sent", async (event: TalentEvent) => {
            try {
                await this.createNotification({
                    type: "offer",
                    title: "Offer Sent",
                    message: `Offer sent to ${event.data.candidateName} for ${event.data.jobTitle}`,
                    link: `/offers/${event.data.offerId}`
                });

                await this.triggerWorkflows("offer_sent", event.data);

            } catch (error) {
                console.error("[Event Handler] offer:sent error:", error);
            }
        });

        this.on("offer:accepted", async (event: TalentEvent) => {
            try {
                // Big celebration notification
                await this.createNotification({
                    type: "success",
                    title: "🎉 Offer Accepted!",
                    message: `${event.data.candidateName} accepted the offer for ${event.data.jobTitle}!`,
                    link: `/offers/${event.data.offerId}`
                });

                await this.triggerWorkflows("offer_accepted", event.data);
                await this.sendBotNotification("offerAccepted", event.data);

                // Update candidate status
                const Candidate = mongoose.models.Candidate;
                if (Candidate && event.data.candidateId) {
                    await Candidate.findByIdAndUpdate(event.data.candidateId, { status: "hired" });
                }

            } catch (error) {
                console.error("[Event Handler] offer:accepted error:", error);
            }
        });

        this.on("offer:declined", async (event: TalentEvent) => {
            try {
                await this.createNotification({
                    type: "warning",
                    title: "Offer Declined",
                    message: `${event.data.candidateName} declined the offer for ${event.data.jobTitle}`,
                    link: `/offers/${event.data.offerId}`
                });

                await this.triggerWorkflows("offer_declined", event.data);

                // AI suggestion for next steps
                console.log("[AI] Generating next-best-candidate suggestions...");

            } catch (error) {
                console.error("[Event Handler] offer:declined error:", error);
            }
        });

        // ==========================================
        // CANDIDATE HANDLERS
        // ==========================================

        this.on("candidate:hired", async (event: TalentEvent) => {
            try {
                await this.sendBotNotification("candidateHired", event.data);

                // Auto-close job if positions filled
                // Auto-add to onboarding workflow
                console.log(`[Onboarding] Creating onboarding tasks for ${event.data.candidateName}`);

            } catch (error) {
                console.error("[Event Handler] candidate:hired error:", error);
            }
        });

        // ==========================================
        // JOB HANDLERS
        // ==========================================

        this.on("job:published", async (event: TalentEvent) => {
            try {
                // Auto-match talent pool
                console.log(`[AI] Matching talent pool for job ${event.data.jobTitle}`);

                // In production, call the talent pool matching API
                // await fetch(`/api/ai/talent-pool/match/${event.data.jobId}`, { method: 'POST' });

                await this.createNotification({
                    type: "job",
                    title: "Job Published",
                    message: `${event.data.jobTitle} is now live on job boards`,
                    link: `/jobs/${event.data.jobId}`
                });

            } catch (error) {
                console.error("[Event Handler] job:published error:", error);
            }
        });

        // ==========================================
        // REFERRAL HANDLERS
        // ==========================================

        this.on("referral:submitted", async (event: TalentEvent) => {
            try {
                await this.createNotification({
                    type: "referral",
                    title: "New Referral",
                    message: `${event.data.metadata?.referrerName} referred ${event.data.candidateName}`,
                    link: `/referrals`
                });

                await this.sendBotNotification("newReferral", {
                    ...event.data,
                    referrerName: event.data.metadata?.referrerName
                });

            } catch (error) {
                console.error("[Event Handler] referral:submitted error:", error);
            }
        });

        // ==========================================
        // DEBUG HANDLER
        // ==========================================

        this.on("*", (event: TalentEvent) => {
            // Log all events for debugging
            console.log(`[EventLog] ${event.type} at ${event.timestamp.toISOString()}`);
        });
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================

    private async createNotification(opts: {
        type: string;
        title: string;
        message: string;
        link?: string;
        userId?: string;
    }) {
        try {
            const Notification = mongoose.models.Notification;
            if (Notification) {
                const notification = new Notification({
                    type: opts.type,
                    title: opts.title,
                    message: opts.message,
                    link: opts.link,
                    userId: opts.userId,
                    read: false
                });
                await notification.save();

                // Broadcast via SSE (clients will pick this up)
                console.log(`[SSE] Broadcasting notification: ${opts.title}`);
            }
        } catch (error) {
            console.error("Create notification error:", error);
        }
    }

    private async triggerWorkflows(eventType: string, data: any) {
        try {
            const Workflow = mongoose.models.Workflow;
            if (!Workflow) return;

            // Find active workflows for this event
            const workflows = await Workflow.find({
                isActive: true,
                "trigger.event": eventType
            });

            for (const workflow of workflows) {
                console.log(`[Workflow] Triggering: ${workflow.name}`);

                // Execute actions
                for (const action of workflow.actions || []) {
                    await this.executeWorkflowAction(action, data);
                }

                // Update stats
                workflow.timesTriggered++;
                workflow.lastTriggeredAt = new Date();
                await workflow.save();
            }
        } catch (error) {
            console.error("Trigger workflows error:", error);
        }
    }

    private async executeWorkflowAction(action: any, data: any) {
        switch (action.type) {
            case "send_notification":
                await this.createNotification({
                    type: "workflow",
                    title: "Workflow Action",
                    message: action.config?.message || "Automated action executed"
                });
                break;

            case "update_status":
                if (data.candidateId && action.config?.status) {
                    const Candidate = mongoose.models.Candidate;
                    if (Candidate) {
                        await Candidate.findByIdAndUpdate(data.candidateId, {
                            status: action.config.status
                        });
                    }
                }
                break;

            case "add_tag":
                if (data.candidateId && action.config?.tag) {
                    const Candidate = mongoose.models.Candidate;
                    if (Candidate) {
                        await Candidate.findByIdAndUpdate(data.candidateId, {
                            $addToSet: { tags: action.config.tag }
                        });
                    }
                }
                break;

            case "send_slack":
                await this.sendBotNotification("custom", {
                    message: action.config?.message,
                    ...data
                });
                break;

            case "score_candidate":
                console.log(`[AI] Triggering AI scoring for ${data.candidateId}`);
                // In production, call scoring API
                break;

            default:
                console.log(`[Workflow] Unknown action type: ${action.type}`);
        }
    }

    private async sendBotNotification(eventType: string, data: any) {
        try {
            const BotConfig = mongoose.models.BotConfig;
            if (!BotConfig) return;

            const configs = await BotConfig.find({
                isActive: true,
                [`notifications.${eventType}`]: true
            });

            for (const config of configs) {
                console.log(`[Bot] Sending ${eventType} to ${config.platform}`);
                // In production, POST to webhook URL
            }
        } catch (error) {
            console.error("Send bot notification error:", error);
        }
    }
}

// ==========================================
// EXPORT SINGLETON
// ==========================================

export const EventBus = TalentEventEmitter.getInstance();

// Helper function to emit events from anywhere
export function emitTalentEvent(type: EventType, data: TalentEvent["data"]) {
    EventBus.emitEvent({
        type,
        timestamp: new Date(),
        data
    });
}

export default EventBus;
