/**
 * AI API Routes
 * Exposes AI services for frontend consumption
 */

import { Router } from "express";
import AI from "../services/ai";
import EmailService from "../services/email";

const router = Router();

// ==========================================
// RESUME PARSING
// ==========================================

router.post("/ai/parse-resume", async (req, res) => {
    try {
        const { resumeText } = req.body;
        // @ts-ignore
        const userId = req.user?.id;

        if (!resumeText) {
            return res.status(400).json({ error: "Resume text required" });
        }

        const parsed = await AI.parseResume(resumeText, userId);
        res.json(parsed);
    } catch (error: any) {
        console.error("Resume parse error:", error);
        res.status(500).json({ error: error.message || "Failed to parse resume" });
    }
});

// ==========================================
// SKILL EXTRACTION
// ==========================================

router.post("/ai/extract-skills", async (req, res) => {
    try {
        const { text } = req.body;
        // @ts-ignore
        const userId = req.user?.id;

        const skills = await AI.extractSkills(text, userId);
        res.json(skills);
    } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to extract skills" });
    }
});

// ==========================================
// CANDIDATE SCORING
// ==========================================

router.post("/ai/score-candidate", async (req, res) => {
    try {
        const { resumeData, jobRequirements } = req.body;
        // @ts-ignore
        const userId = req.user?.id;

        if (!resumeData || !jobRequirements) {
            return res.status(400).json({ error: "Resume data and job requirements required" });
        }

        const score = await AI.scoreCandidate(resumeData, jobRequirements, userId);
        res.json(score);
    } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to score candidate" });
    }
});

// ==========================================
// INTERVIEW SUMMARY
// ==========================================

router.post("/ai/interview-summary", async (req, res) => {
    try {
        const { transcript } = req.body;
        // @ts-ignore
        const userId = req.user?.id;

        if (!transcript) {
            return res.status(400).json({ error: "Transcript required" });
        }

        const summary = await AI.generateInterviewSummary(transcript, userId);
        res.json(summary);
    } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to generate summary" });
    }
});

// ==========================================
// JOB DESCRIPTION GENERATION
// ==========================================

router.post("/ai/generate-job", async (req, res) => {
    try {
        const { title, department, requirements, responsibilities } = req.body;
        // @ts-ignore
        const userId = req.user?.id;

        if (!title || !department) {
            return res.status(400).json({ error: "Title and department required" });
        }

        const description = await AI.generateJobDescription(
            { title, department, requirements: requirements || [], responsibilities },
            userId
        );
        res.json({ description });
    } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to generate job description" });
    }
});

// ==========================================
// CANDIDATE RANKING
// ==========================================

router.post("/ai/rank-candidates", async (req, res) => {
    try {
        const { candidates, jobRequirements } = req.body;
        // @ts-ignore
        const userId = req.user?.id;

        const rankings = await AI.rankCandidates(candidates, jobRequirements, userId);
        res.json(rankings);
    } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to rank candidates" });
    }
});

// ==========================================
// EMAIL ENDPOINTS
// ==========================================

router.post("/email/interview-invite", async (req, res) => {
    try {
        const { candidateEmail, candidateName, interviewDetails } = req.body;
        const result = await EmailService.sendInterviewInvite(candidateEmail, candidateName, interviewDetails);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/email/offer", async (req, res) => {
    try {
        const { candidateEmail, candidateName, offerDetails } = req.body;
        const result = await EmailService.sendOfferLetter(candidateEmail, candidateName, offerDetails);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/email/rejection", async (req, res) => {
    try {
        const { candidateEmail, candidateName, jobTitle, feedback } = req.body;
        const result = await EmailService.sendRejectionEmail(candidateEmail, candidateName, jobTitle, feedback);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/email/status-update", async (req, res) => {
    try {
        const { candidateEmail, candidateName, status, jobTitle, nextSteps } = req.body;
        const result = await EmailService.sendStatusUpdate(candidateEmail, candidateName, status, jobTitle, nextSteps);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
