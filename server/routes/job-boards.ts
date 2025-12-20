/**
 * Job Board Integration API Routes
 * Post jobs to multiple job boards and track applications
 */

import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { Job } from "../db";

const router = Router();

// ==========================================
// JOB POSTING SCHEMA
// ==========================================

const jobPostingSchema = new mongoose.Schema({
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    jobTitle: String,

    // Posted platforms
    platforms: [{
        name: { type: String, enum: ["linkedin", "indeed", "glassdoor", "naukri", "internshala", "company_website", "other"] },
        externalId: String,
        postUrl: String,
        status: { type: String, enum: ["pending", "posted", "failed", "expired"], default: "pending" },
        postedAt: Date,
        expiresAt: Date,
        views: { type: Number, default: 0 },
        applications: { type: Number, default: 0 }
    }],

    // Posting settings
    autoRepost: { type: Boolean, default: false },
    repostAfterDays: Number,
    sponsoredBudget: Number,

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const JobPosting = mongoose.models.JobPosting || mongoose.model("JobPosting", jobPostingSchema);

// ==========================================
// JOB POSTING CRUD
// ==========================================

// Get all postings for a job
router.get("/job/:jobId", async (req: Request, res: Response) => {
    try {
        const posting = await JobPosting.findOne({ jobId: req.params.jobId });
        res.json(posting || { jobId: req.params.jobId, platforms: [] });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch job postings" });
    }
});

// Get all active postings
router.get("/active", async (req: Request, res: Response) => {
    try {
        const postings = await JobPosting.find({
            "platforms.status": "posted"
        }).populate("jobId").lean();
        res.json(postings);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch active postings" });
    }
});

// Post job to platforms
router.post("/post", async (req: Request, res: Response) => {
    try {
        const { jobId, platforms, autoRepost, repostAfterDays } = req.body;

        if (!jobId || !platforms || !Array.isArray(platforms)) {
            return res.status(400).json({ error: "jobId and platforms array required" });
        }

        const job = await Job.findById(jobId).lean();
        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }

        // Simulate posting to each platform
        const platformResults = platforms.map((platform: string) => {
            // In production, this would call actual APIs
            const externalId = `${platform}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const postUrl = generatePostUrl(platform, externalId);

            return {
                name: platform,
                externalId,
                postUrl,
                status: "posted",
                postedAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                views: 0,
                applications: 0
            };
        });

        const posting = await JobPosting.findOneAndUpdate(
            { jobId },
            {
                jobId,
                jobTitle: job.title,
                platforms: platformResults,
                autoRepost,
                repostAfterDays,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );

        // Update job status
        await Job.findByIdAndUpdate(jobId, { status: "open" });

        res.json({
            success: true,
            message: `Job posted to ${platforms.length} platforms`,
            posting
        });
    } catch (error) {
        console.error("Post job error:", error);
        res.status(500).json({ error: "Failed to post job" });
    }
});

// Helper to generate platform URLs
function generatePostUrl(platform: string, externalId: string): string {
    const urls: Record<string, string> = {
        linkedin: `https://www.linkedin.com/jobs/view/${externalId}`,
        indeed: `https://www.indeed.com/viewjob?jk=${externalId}`,
        glassdoor: `https://www.glassdoor.com/job-listing/${externalId}`,
        naukri: `https://www.naukri.com/job-listings-${externalId}`,
        internshala: `https://internshala.com/internship/detail/${externalId}`,
        company_website: `/careers/jobs/${externalId}`
    };
    return urls[platform] || `https://${platform}.com/jobs/${externalId}`;
}

// Update posting metrics (simulate external webhook)
router.post("/metrics/:postingId", async (req: Request, res: Response) => {
    try {
        const { platform, views, applications } = req.body;

        await JobPosting.findOneAndUpdate(
            { _id: req.params.postingId, "platforms.name": platform },
            {
                $set: {
                    "platforms.$.views": views,
                    "platforms.$.applications": applications
                },
                updatedAt: new Date()
            }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to update metrics" });
    }
});

// Remove from platform
router.delete("/platform/:postingId/:platform", async (req: Request, res: Response) => {
    try {
        const { postingId, platform } = req.params;

        await JobPosting.findByIdAndUpdate(postingId, {
            $pull: { platforms: { name: platform } },
            updatedAt: new Date()
        });

        res.json({ success: true, message: `Removed from ${platform}` });
    } catch (error) {
        res.status(500).json({ error: "Failed to remove from platform" });
    }
});

// ==========================================
// ANALYTICS
// ==========================================

// Get posting analytics
router.get("/analytics", async (req: Request, res: Response) => {
    try {
        const postings = await JobPosting.find().lean();

        // Aggregate by platform
        const platformStats: Record<string, { posted: number; views: number; applications: number }> = {};

        postings.forEach((posting: any) => {
            posting.platforms?.forEach((p: any) => {
                if (!platformStats[p.name]) {
                    platformStats[p.name] = { posted: 0, views: 0, applications: 0 };
                }
                platformStats[p.name].posted++;
                platformStats[p.name].views += p.views || 0;
                platformStats[p.name].applications += p.applications || 0;
            });
        });

        const totalViews = Object.values(platformStats).reduce((sum, p) => sum + p.views, 0);
        const totalApplications = Object.values(platformStats).reduce((sum, p) => sum + p.applications, 0);

        res.json({
            totalJobs: postings.length,
            totalViews,
            totalApplications,
            conversionRate: totalViews > 0 ? ((totalApplications / totalViews) * 100).toFixed(2) : 0,
            byPlatform: platformStats
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to get analytics" });
    }
});

// ==========================================
// AVAILABLE PLATFORMS
// ==========================================

router.get("/platforms", async (req: Request, res: Response) => {
    res.json([
        { id: "linkedin", name: "LinkedIn", icon: "linkedin", supported: true },
        { id: "indeed", name: "Indeed", icon: "briefcase", supported: true },
        { id: "glassdoor", name: "Glassdoor", icon: "star", supported: true },
        { id: "naukri", name: "Naukri", icon: "globe", supported: true },
        { id: "internshala", name: "Internshala", icon: "graduation-cap", supported: true },
        { id: "company_website", name: "Company Website", icon: "globe", supported: true }
    ]);
});

export default router;
