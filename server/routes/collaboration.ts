/**
 * Team Collaboration API Routes
 * Comments, @mentions, and Activity Timeline
 */

import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { User } from "../db";

const router = Router();

// ==========================================
// COMMENT SCHEMA
// ==========================================

const commentSchema = new mongoose.Schema({
    // Target (what the comment is on)
    targetType: { type: String, enum: ["candidate", "job", "interview", "offer"], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },

    // Author
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String, required: true },
    authorEmail: String,
    authorAvatar: String,

    // Content
    content: { type: String, required: true },
    mentions: [{ userId: String, name: String, email: String }],

    // Parent for replies
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" },

    // Metadata
    isEdited: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Activity Log Schema
const activitySchema = new mongoose.Schema({
    // Target
    targetType: { type: String, enum: ["candidate", "job", "interview", "offer", "referral"], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    targetName: String,

    // Action
    action: { type: String, required: true },
    description: String,

    // Actor
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorName: String,
    actorEmail: String,

    // Changes (for update actions)
    changes: mongoose.Schema.Types.Mixed,

    createdAt: { type: Date, default: Date.now }
});

const Comment = mongoose.models.Comment || mongoose.model("Comment", commentSchema);
const Activity = mongoose.models.Activity || mongoose.model("Activity", activitySchema);

// ==========================================
// COMMENTS CRUD
// ==========================================

// Get comments for a target
router.get("/comments/:targetType/:targetId", async (req: Request, res: Response) => {
    try {
        const { targetType, targetId } = req.params;

        const comments = await Comment.find({ targetType, targetId, parentId: null })
            .sort({ isPinned: -1, createdAt: -1 })
            .lean();

        // Get replies for each comment
        const commentsWithReplies = await Promise.all(
            comments.map(async (comment: any) => {
                const replies = await Comment.find({ parentId: comment._id })
                    .sort({ createdAt: 1 })
                    .lean();
                return { ...comment, replies };
            })
        );

        res.json(commentsWithReplies);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch comments" });
    }
});

// Add comment
router.post("/comments", async (req: Request, res: Response) => {
    try {
        const { targetType, targetId, authorName, authorEmail, content, parentId } = req.body;

        if (!content || !targetType || !targetId) {
            return res.status(400).json({ error: "Content, targetType, and targetId are required" });
        }

        // Parse @mentions from content
        const mentionRegex = /@(\w+(?:\s+\w+)?)/g;
        const mentionMatches = content.match(mentionRegex) || [];
        const mentions = mentionMatches.map((m: string) => ({
            name: m.substring(1), // Remove @
        }));

        const comment = new Comment({
            targetType,
            targetId,
            authorName,
            authorEmail,
            content,
            mentions,
            parentId
        });

        await comment.save();

        // Log activity
        await Activity.create({
            targetType,
            targetId,
            action: "comment_added",
            description: `${authorName} commented`,
            actorName: authorName,
            actorEmail: authorEmail
        });

        res.status(201).json(comment);
    } catch (error) {
        console.error("Add comment error:", error);
        res.status(500).json({ error: "Failed to add comment" });
    }
});

// Edit comment
router.put("/comments/:id", async (req: Request, res: Response) => {
    try {
        const { content } = req.body;

        const comment = await Comment.findByIdAndUpdate(
            req.params.id,
            { content, isEdited: true, updatedAt: new Date() },
            { new: true }
        );

        if (!comment) return res.status(404).json({ error: "Comment not found" });
        res.json(comment);
    } catch (error) {
        res.status(500).json({ error: "Failed to edit comment" });
    }
});

// Delete comment
router.delete("/comments/:id", async (req: Request, res: Response) => {
    try {
        // Delete replies first
        await Comment.deleteMany({ parentId: req.params.id });
        await Comment.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete comment" });
    }
});

// Pin/unpin comment
router.post("/comments/:id/pin", async (req: Request, res: Response) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ error: "Comment not found" });

        comment.isPinned = !comment.isPinned;
        await comment.save();

        res.json(comment);
    } catch (error) {
        res.status(500).json({ error: "Failed to pin comment" });
    }
});

// ==========================================
// ACTIVITY TIMELINE
// ==========================================

// Get activity for a target
router.get("/activity/:targetType/:targetId", async (req: Request, res: Response) => {
    try {
        const { targetType, targetId } = req.params;
        const { limit = 50 } = req.query;

        const activities = await Activity.find({ targetType, targetId })
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .lean();

        res.json(activities);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch activity" });
    }
});

// Log activity (used by other routes)
router.post("/activity", async (req: Request, res: Response) => {
    try {
        const activity = new Activity(req.body);
        await activity.save();
        res.status(201).json(activity);
    } catch (error) {
        res.status(500).json({ error: "Failed to log activity" });
    }
});

// Get all recent activity (for feed)
router.get("/activity/recent", async (req: Request, res: Response) => {
    try {
        const { limit = 20 } = req.query;

        const activities = await Activity.find()
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .lean();

        res.json(activities);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch recent activity" });
    }
});

// ==========================================
// TEAM MEMBERS (for @mentions)
// ==========================================

router.get("/team-members", async (req: Request, res: Response) => {
    try {
        const { search } = req.query;
        const query: any = { role: { $in: ["recruiter", "admin", "hiring_manager"] } };

        if (search) {
            query.name = { $regex: search, $options: "i" };
        }

        const members = await User.find(query)
            .select("_id name email")
            .limit(10)
            .lean();

        res.json(members);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch team members" });
    }
});

// ==========================================
// HELPER: Log activity from other modules
// ==========================================

export async function logActivity(opts: {
    targetType: string;
    targetId: string;
    targetName?: string;
    action: string;
    description?: string;
    actorName?: string;
    actorEmail?: string;
    changes?: any;
}) {
    try {
        await Activity.create(opts);
    } catch (error) {
        console.error("Log activity error:", error);
    }
}

export default router;
