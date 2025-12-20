/**
 * Hackathon Security API Routes
 * Implements endpoints for Proctoring, Consent, Evaluation, and Audit
 */

import { Router } from "express";
import { db } from "../storage";
import {
    logProctoringEvent,
    generateProctoringReport
} from "../services/proctoring";
import {
    recordConsent,
    getConsents,
    hasConsent
} from "../services/consent";
import {
    createEvaluation,
    getEvaluationHistory,
    generateDecisionPacket
} from "../services/evaluation";
import {
    auditMiddleware,
    logAuditEvent
} from "../middleware/audit";
import {
    piiMaskingMiddleware,
    stripPIIForAI
} from "../middleware/pii-mask";
import { testSubmissions, assessmentSessions } from "../../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// ==========================================
// MIDDLEWARE
// ==========================================

// Apply audit logging to all routes in this router
router.use(auditMiddleware());

// Apply PII masking to GET requests
router.use(piiMaskingMiddleware());

// ==========================================
// PROCTORING ROUTES
// ==========================================

// Log a proctoring event
router.post("/proctoring/event", async (req, res) => {
    try {
        const { submissionId, sessionId, eventType, severity, metadata } = req.body;
        // @ts-ignore
        const userId = req.user?.id;

        const newIntegrityScore = await logProctoringEvent(
            submissionId,
            sessionId,
            userId,
            {
                eventType,
                severity,
                metadata,
                questionIndex: metadata?.questionIndex,
                timeIntoPractice: metadata?.timeIntoPractice,
            }
        );

        res.json({ success: true, integrityScore: newIntegrityScore });
    } catch (error) {
        console.error("Proctoring event error:", error);
        res.status(500).json({ error: "Failed to log event" });
    }
});

// Get proctoring report
router.get("/submissions/:id/proctoring-report", async (req, res) => {
    try {
        const report = await generateProctoringReport(req.params.id);
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: "Failed to generate report" });
    }
});

// ==========================================
// CONSENT ROUTES
// ==========================================

// Record user consent
router.post("/consent", async (req, res) => {
    try {
        const { consentType, consentGiven, context } = req.body;
        // @ts-ignore
        const userId = req.user?.id;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const recordId = await recordConsent({
            userId,
            consentType,
            consentGiven,
            context,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
        });

        res.json({ success: true, recordId });
    } catch (error) {
        res.status(500).json({ error: "Failed to record consent" });
    }
});

// Get user consents
router.get("/users/:id/consents", async (req, res) => {
    try {
        // Basic authorization check
        // @ts-ignore
        if (req.user?.id !== req.params.id && req.user?.role !== "admin") {
            return res.status(403).json({ error: "Forbidden" });
        }

        const consents = await getConsents({ userId: req.params.id });
        res.json(consents);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch consents" });
    }
});

// ==========================================
// EVALUATION ROUTES
// ==========================================

// Create new evaluation (versioned)
router.post("/evaluations", async (req, res) => {
    try {
        const {
            resumeId,
            scores,
            recommendation,
            reasonCodes,
            notes,
            stage
        } = req.body;

        // @ts-ignore
        const evaluatorId = req.user?.id;
        // @ts-ignore
        const evaluatorName = req.user?.name || "Evaluator";

        const evaluation = await createEvaluation({
            resumeId,
            evaluatorId,
            evaluatorName,
            scores,
            recommendation,
            reasonCodes,
            notes,
            stage,
        });

        res.status(201).json(evaluation);
    } catch (error) {
        res.status(500).json({ error: "Failed to create evaluation" });
    }
});

// Get evaluation history
router.get("/candidates/:id/evaluations", async (req, res) => {
    try {
        // Basic authorization check - recruiters/admins only
        // @ts-ignore
        if (!["recruiter", "interviewer", "admin"].includes(req.user?.role)) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const history = await getEvaluationHistory(req.params.id);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch evaluations" });
    }
});

// Get decision packet (for export)
router.get("/candidates/:id/decision-packet", async (req, res) => {
    try {
        // @ts-ignore
        if (!["recruiter", "admin"].includes(req.user?.role)) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const packet = await generateDecisionPacket(req.params.id);

        // Log sensitive access
        // @ts-ignore
        await logAuditEvent(req.user?.id, req.user?.email, "export", "decision_packet", req.params.id);

        res.json(packet);
    } catch (error) {
        res.status(500).json({ error: "Failed to generate decision packet" });
    }
});

// ==========================================
// ASSESSMENT FEATURES (Time-boxing & Randomization)
// ==========================================

// Start assessment (initialize session and randomization)
router.post("/assessments/:id/start", async (req, res) => {
    try {
        // @ts-ignore
        const userId = req.user?.id;
        const testId = req.params.id;

        // TODO: Verify consent exists first
        const consented = await hasConsent("proctoring", { userId });
        if (!consented) {
            return res.status(403).json({
                error: "Consent required",
                code: "CONSENT_REQUIRED",
                missing: ["proctoring"]
            });
        }

        // 1. Create submission record
        // 2. Randomize questions
        // 3. Set start time and time limit
        // For now, placeholder implementation...

        res.json({
            success: true,
            sessionId: "session_" + Date.now(),
            startTime: new Date(),
            timeLimitSeconds: 3600, // 1 hour
            // Returning just IDs for now to simulate randomization
            questions: ["q1", "q2", "q3"].sort(() => Math.random() - 0.5)
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to start assessment" });
    }
});

// AI PII Stripping Utility Endpoint (Internal/Admin)
router.post("/ai/safe-prompt", async (req, res) => {
    try {
        const { prompt } = req.body;
        const { cleanText, mappings } = stripPIIForAI(prompt);

        res.json({
            cleanPrompt: cleanText,
            tokenLength: cleanText.length / 4, // Approx
            mappingsCount: mappings.length
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to process prompt" });
    }
});

export default router;
