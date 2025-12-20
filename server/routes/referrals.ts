/**
 * Employee Referral System API Routes
 * Track and manage employee referrals
 */

import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { Candidate, Job, User } from "../db";

const router = Router();

// ==========================================
// REFERRAL SCHEMA
// ==========================================

const referralSchema = new mongoose.Schema({
    // Referrer info
    referrerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    referrerName: { type: String, required: true },
    referrerEmail: { type: String, required: true },
    referrerDepartment: String,

    // Referred candidate info
    candidateName: { type: String, required: true },
    candidateEmail: { type: String, required: true },
    candidatePhone: String,
    candidateLinkedIn: String,
    candidateResume: String,

    // Job info
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    jobTitle: String,

    // Relationship
    relationship: { type: String, enum: ["colleague", "friend", "family", "former_colleague", "other"], default: "other" },
    howLongKnown: String,
    whyRecommend: String,

    // Status tracking
    status: {
        type: String,
        enum: ["submitted", "reviewing", "interviewing", "offered", "hired", "rejected", "withdrawn"],
        default: "submitted"
    },

    // Bonus tracking
    bonusEligible: { type: Boolean, default: true },
    bonusAmount: { type: Number, default: 0 },
    bonusPaidAt: Date,

    // Metadata
    notes: String,
    reviewedBy: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Referral = mongoose.models.Referral || mongoose.model("Referral", referralSchema);

// ==========================================
// REFERRAL CRUD
// ==========================================

// List referrals
router.get("/", async (req: Request, res: Response) => {
    try {
        const { referrerEmail, status, limit = 50 } = req.query;
        const query: any = {};

        if (referrerEmail) query.referrerEmail = referrerEmail;
        if (status) query.status = status;

        const referrals = await Referral.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .lean();

        res.json(referrals);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch referrals" });
    }
});

// Get referral by ID
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const referral = await Referral.findById(req.params.id).lean();
        if (!referral) return res.status(404).json({ error: "Referral not found" });
        res.json(referral);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch referral" });
    }
});

// Submit referral
router.post("/", async (req: Request, res: Response) => {
    try {
        const {
            referrerName,
            referrerEmail,
            referrerDepartment,
            candidateName,
            candidateEmail,
            candidatePhone,
            candidateLinkedIn,
            candidateResume,
            jobId,
            jobTitle,
            relationship,
            howLongKnown,
            whyRecommend
        } = req.body;

        if (!referrerEmail || !candidateName || !candidateEmail) {
            return res.status(400).json({ error: "Referrer email, candidate name and email are required" });
        }

        // Check for duplicate referral
        const existing = await Referral.findOne({
            candidateEmail,
            jobId,
            status: { $nin: ["rejected", "withdrawn"] }
        });

        if (existing) {
            return res.status(400).json({ error: "This candidate has already been referred for this position" });
        }

        const referral = new Referral({
            referrerName,
            referrerEmail,
            referrerDepartment,
            candidateName,
            candidateEmail,
            candidatePhone,
            candidateLinkedIn,
            candidateResume,
            jobId,
            jobTitle,
            relationship,
            howLongKnown,
            whyRecommend,
            status: "submitted"
        });

        await referral.save();

        // Optionally create candidate record
        const candidateExists = await Candidate.findOne({ email: candidateEmail });
        if (!candidateExists) {
            await Candidate.create({
                name: candidateName,
                email: candidateEmail,
                phone: candidatePhone,
                source: "referral",
                referredBy: referrerEmail,
                status: "new"
            });
        }

        res.status(201).json({
            message: "Referral submitted successfully!",
            referral
        });
    } catch (error) {
        console.error("Submit referral error:", error);
        res.status(500).json({ error: "Failed to submit referral" });
    }
});

// Update referral status
router.put("/:id/status", async (req: Request, res: Response) => {
    try {
        const { status, notes, reviewedBy } = req.body;

        const referral = await Referral.findByIdAndUpdate(
            req.params.id,
            { status, notes, reviewedBy, updatedAt: new Date() },
            { new: true }
        );

        if (!referral) return res.status(404).json({ error: "Referral not found" });
        res.json(referral);
    } catch (error) {
        res.status(500).json({ error: "Failed to update status" });
    }
});

// Update referral
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const referral = await Referral.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: new Date() },
            { new: true }
        );
        if (!referral) return res.status(404).json({ error: "Referral not found" });
        res.json(referral);
    } catch (error) {
        res.status(500).json({ error: "Failed to update referral" });
    }
});

// Delete referral
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        await Referral.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete referral" });
    }
});

// ==========================================
// MY REFERRALS (Employee View)
// ==========================================

router.get("/my/:email", async (req: Request, res: Response) => {
    try {
        const referrals = await Referral.find({ referrerEmail: req.params.email })
            .sort({ createdAt: -1 })
            .lean();

        const stats = {
            total: referrals.length,
            hired: referrals.filter(r => r.status === "hired").length,
            pending: referrals.filter(r => ["submitted", "reviewing", "interviewing"].includes(r.status)).length,
            bonusEarned: referrals.filter(r => r.bonusPaidAt).reduce((sum, r) => sum + (r.bonusAmount || 0), 0)
        };

        res.json({ referrals, stats });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch referrals" });
    }
});

// ==========================================
// ANALYTICS
// ==========================================

router.get("/analytics/summary", async (req: Request, res: Response) => {
    try {
        const total = await Referral.countDocuments();
        const byStatus = await Referral.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const hired = await Referral.countDocuments({ status: "hired" });
        const conversionRate = total > 0 ? Math.round((hired / total) * 100) : 0;

        const topReferrers = await Referral.aggregate([
            { $group: { _id: "$referrerEmail", name: { $first: "$referrerName" }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            total,
            hired,
            conversionRate,
            byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
            topReferrers
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch analytics" });
    }
});

// ==========================================
// AVAILABLE JOBS (For referral form)
// ==========================================

router.get("/jobs/available", async (req: Request, res: Response) => {
    try {
        const jobs = await Job.find({ status: "open" })
            .select("_id title department location")
            .lean();
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch jobs" });
    }
});

export default router;
