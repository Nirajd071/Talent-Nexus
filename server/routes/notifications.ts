/**
 * Real-Time Notifications Service
 * Using Server-Sent Events (SSE) for real-time updates
 */

import { Router, Request, Response } from "express";
import mongoose from "mongoose";

const router = Router();

// Store active SSE connections
const clients: Map<string, Response> = new Map();

// Notification schema
const notificationSchema = new mongoose.Schema({
    userId: String,
    type: { type: String, enum: ["info", "success", "warning", "error", "action"], default: "info" },
    title: { type: String, required: true },
    message: String,
    link: String,
    data: mongoose.Schema.Types.Mixed,
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

// ==========================================
// SSE ENDPOINT
// ==========================================

// Connect to SSE stream
router.get("/stream", (req: Request, res: Response) => {
    const userId = req.query.userId as string || "anonymous";

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders();

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: "connected", message: "Connected to notification stream" })}\n\n`);

    // Store client connection
    clients.set(userId, res);
    console.log(`[Notifications] Client connected: ${userId}, Total: ${clients.size}`);

    // Handle client disconnect
    req.on("close", () => {
        clients.delete(userId);
        console.log(`[Notifications] Client disconnected: ${userId}, Total: ${clients.size}`);
    });
});

// ==========================================
// BROADCAST FUNCTIONS
// ==========================================

// Broadcast to all clients
export function broadcastToAll(notification: { type: string; title: string; message?: string; data?: any }) {
    const message = `data: ${JSON.stringify(notification)}\n\n`;
    clients.forEach((client) => {
        client.write(message);
    });
}

// Broadcast to specific user
export function broadcastToUser(userId: string, notification: { type: string; title: string; message?: string; data?: any }) {
    const client = clients.get(userId);
    if (client) {
        client.write(`data: ${JSON.stringify(notification)}\n\n`);
    }
}

// ==========================================
// NOTIFICATION CRUD
// ==========================================

// Get notifications for user
router.get("/", async (req: Request, res: Response) => {
    try {
        const { userId, unreadOnly } = req.query;
        const query: any = {};

        if (userId) query.userId = userId;
        if (unreadOnly === "true") query.isRead = false;

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
});

// Get unread count
router.get("/unread-count", async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;
        const count = await Notification.countDocuments({ userId, isRead: false });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: "Failed to get count" });
    }
});

// Create notification (and broadcast)
router.post("/", async (req: Request, res: Response) => {
    try {
        const { userId, type, title, message, link, data, broadcast } = req.body;

        const notification = new Notification({
            userId,
            type: type || "info",
            title,
            message,
            link,
            data
        });

        await notification.save();

        // Broadcast if requested
        if (broadcast === "all") {
            broadcastToAll({ type: type || "info", title, message, data: notification });
        } else if (userId) {
            broadcastToUser(userId, { type: type || "info", title, message, data: notification });
        }

        res.status(201).json(notification);
    } catch (error) {
        res.status(500).json({ error: "Failed to create notification" });
    }
});

// Mark as read
router.put("/:id/read", async (req: Request, res: Response) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to mark as read" });
    }
});

// Mark all as read
router.put("/mark-all-read", async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        await Notification.updateMany({ userId, isRead: false }, { isRead: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to mark all as read" });
    }
});

// Delete notification
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        await Notification.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete notification" });
    }
});

// ==========================================
// HELPER: Create and broadcast notification
// ==========================================

export async function createNotification(opts: {
    userId?: string;
    type?: string;
    title: string;
    message?: string;
    link?: string;
    data?: any;
    broadcast?: "all" | "user";
}) {
    try {
        const notification = new Notification({
            userId: opts.userId,
            type: opts.type || "info",
            title: opts.title,
            message: opts.message,
            link: opts.link,
            data: opts.data
        });

        await notification.save();

        if (opts.broadcast === "all") {
            broadcastToAll({ type: opts.type || "info", title: opts.title, message: opts.message });
        } else if (opts.broadcast === "user" && opts.userId) {
            broadcastToUser(opts.userId, { type: opts.type || "info", title: opts.title, message: opts.message });
        }

        return notification;
    } catch (error) {
        console.error("Create notification error:", error);
        return null;
    }
}

export default router;
