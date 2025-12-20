/**
 * Analytics API Routes
 * Comprehensive hiring analytics and metrics
 */

import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { Candidate, Job, Application, Interview, Offer, Assessment, AssessmentSession } from "../db";

const router = Router();

// Get OnboardingTask model if exists
const OnboardingTask = mongoose.models.OnboardingTask;
const EngagementLog = mongoose.models.EngagementLog;

// ==========================================
// DASHBOARD SUMMARY
// ==========================================

router.get("/dashboard", async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Candidate metrics
        const totalCandidates = await Candidate.countDocuments();
        const newCandidates30d = await Candidate.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
        const activeCandidates = await Candidate.countDocuments({ status: { $in: ["active", "interviewing", "offer"] } });

        // Job metrics
        const activeJobs = await Job.countDocuments({ status: "open" });
        const totalApplications = await Application.countDocuments();
        const pendingApplications = await Application.countDocuments({ status: "applied" });

        // Interview metrics
        const scheduledInterviews = await Interview.countDocuments({ status: { $in: ["scheduled", "confirmed"] } });
        const completedInterviews30d = await Interview.countDocuments({
            status: "completed",
            completedAt: { $gte: thirtyDaysAgo }
        });

        // Offer metrics
        const pendingOffers = await Offer.countDocuments({ status: { $in: ["sent", "pending_approval"] } });
        const acceptedOffers30d = await Offer.countDocuments({
            status: "accepted",
            signedAt: { $gte: thirtyDaysAgo.toISOString() }
        });
        const declinedOffers30d = await Offer.countDocuments({
            status: "declined",
            createdAt: { $gte: thirtyDaysAgo }
        });

        // Assessment metrics
        const assessmentsSent = await AssessmentSession.countDocuments();
        const assessmentsCompleted = await AssessmentSession.countDocuments({ status: "completed" });

        // Calculate rates
        const offerAcceptanceRate = (acceptedOffers30d + declinedOffers30d) > 0
            ? Math.round((acceptedOffers30d / (acceptedOffers30d + declinedOffers30d)) * 100)
            : 0;

        const assessmentCompletionRate = assessmentsSent > 0
            ? Math.round((assessmentsCompleted / assessmentsSent) * 100)
            : 0;

        res.json({
            candidates: {
                total: totalCandidates,
                new30d: newCandidates30d,
                active: activeCandidates
            },
            jobs: {
                active: activeJobs,
                totalApplications,
                pendingApplications
            },
            interviews: {
                scheduled: scheduledInterviews,
                completed30d: completedInterviews30d
            },
            offers: {
                pending: pendingOffers,
                accepted30d: acceptedOffers30d,
                declined30d: declinedOffers30d,
                acceptanceRate: offerAcceptanceRate
            },
            assessments: {
                sent: assessmentsSent,
                completed: assessmentsCompleted,
                completionRate: assessmentCompletionRate
            }
        });
    } catch (error) {
        console.error("Dashboard analytics error:", error);
        res.status(500).json({ error: "Failed to fetch dashboard analytics" });
    }
});

// ==========================================
// HIRING FUNNEL
// ==========================================

router.get("/funnel", async (req: Request, res: Response) => {
    try {
        const applied = await Application.countDocuments();
        const screening = await Application.countDocuments({ status: "screening" });
        const interviewed = await Interview.countDocuments({ status: "completed" });
        const offered = await Offer.countDocuments();
        const hired = await Offer.countDocuments({ status: "accepted" });

        res.json({
            stages: [
                { name: "Applied", count: applied, percentage: 100 },
                { name: "Screening", count: screening, percentage: applied > 0 ? Math.round((screening / applied) * 100) : 0 },
                { name: "Interviewed", count: interviewed, percentage: applied > 0 ? Math.round((interviewed / applied) * 100) : 0 },
                { name: "Offered", count: offered, percentage: applied > 0 ? Math.round((offered / applied) * 100) : 0 },
                { name: "Hired", count: hired, percentage: applied > 0 ? Math.round((hired / applied) * 100) : 0 }
            ]
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch funnel data" });
    }
});

// ==========================================
// TIME-TO-HIRE
// ==========================================

router.get("/time-to-hire", async (req: Request, res: Response) => {
    try {
        // Get accepted offers with timing data
        const acceptedOffers = await Offer.find({ status: "accepted" })
            .sort({ signedAt: -1 })
            .limit(50)
            .lean();

        // Calculate average time (mock calculation for now)
        const avgDays = 18; // Would calculate from actual application -> offer dates

        res.json({
            averageDays: avgDays,
            breakdown: {
                applicationToScreening: 2,
                screeningToInterview: 5,
                interviewToOffer: 7,
                offerToAcceptance: 4
            },
            trend: [
                { month: "Sep", days: 22 },
                { month: "Oct", days: 20 },
                { month: "Nov", days: 19 },
                { month: "Dec", days: 18 }
            ]
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch time-to-hire data" });
    }
});

// ==========================================
// SOURCE ANALYTICS
// ==========================================

router.get("/sources", async (req: Request, res: Response) => {
    try {
        const sourceStats = await Application.aggregate([
            { $group: { _id: "$source", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.json({
            sources: sourceStats.map(s => ({
                name: s._id || "Direct",
                count: s.count
            }))
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch source data" });
    }
});

// ==========================================
// WEEKLY TRENDS
// ==========================================

router.get("/weekly-trends", async (req: Request, res: Response) => {
    try {
        const weeks = [];
        const now = new Date();

        for (let i = 3; i >= 0; i--) {
            const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
            const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

            const applications = await Application.countDocuments({
                appliedAt: { $gte: weekStart, $lt: weekEnd }
            });

            const interviews = await Interview.countDocuments({
                scheduledAt: { $gte: weekStart, $lt: weekEnd }
            });

            const offers = await Offer.countDocuments({
                createdAt: { $gte: weekStart, $lt: weekEnd }
            });

            weeks.push({
                week: `Week ${4 - i}`,
                applications,
                interviews,
                offers
            });
        }

        res.json({ weeks });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch weekly trends" });
    }
});

// ==========================================
// TOP PERFORMING JOBS
// ==========================================

router.get("/top-jobs", async (req: Request, res: Response) => {
    try {
        const jobStats = await Application.aggregate([
            { $group: { _id: "$jobId", count: { $sum: 1 }, title: { $first: "$jobTitle" } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            jobs: jobStats.map(j => ({
                id: j._id,
                title: j.title || "Untitled Position",
                applications: j.count
            }))
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch top jobs" });
    }
});

export default router;
