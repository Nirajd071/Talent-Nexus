/**
 * Calendar Integration API Routes
 * Google Calendar sync and availability management
 */

import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { Interview, User } from "../db";

const router = Router();

// ==========================================
// CALENDAR PREFERENCES SCHEMA
// ==========================================

const calendarPreferencesSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    email: String,
    provider: { type: String, enum: ["google", "outlook", "custom"], default: "google" },
    accessToken: String,
    refreshToken: String,
    calendarId: { type: String, default: "primary" },
    syncEnabled: { type: Boolean, default: true },

    // Availability settings
    workingHours: {
        monday: { start: String, end: String, enabled: { type: Boolean, default: true } },
        tuesday: { start: String, end: String, enabled: { type: Boolean, default: true } },
        wednesday: { start: String, end: String, enabled: { type: Boolean, default: true } },
        thursday: { start: String, end: String, enabled: { type: Boolean, default: true } },
        friday: { start: String, end: String, enabled: { type: Boolean, default: true } },
        saturday: { start: String, end: String, enabled: { type: Boolean, default: false } },
        sunday: { start: String, end: String, enabled: { type: Boolean, default: false } }
    },
    timezone: { type: String, default: "Asia/Kolkata" },
    bufferBefore: { type: Number, default: 15 }, // minutes
    bufferAfter: { type: Number, default: 15 },
    minNotice: { type: Number, default: 24 }, // hours
    maxBookingDays: { type: Number, default: 30 },

    // Blocked times
    blockedSlots: [{
        start: Date,
        end: Date,
        reason: String,
        recurring: Boolean
    }],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const CalendarPreferences = mongoose.models.CalendarPreferences ||
    mongoose.model("CalendarPreferences", calendarPreferencesSchema);

// ==========================================
// PREFERENCES CRUD
// ==========================================

// Get user calendar preferences
router.get("/preferences/:userId", async (req: Request, res: Response) => {
    try {
        let prefs = await CalendarPreferences.findOne({ userId: req.params.userId });

        if (!prefs) {
            // Create default preferences
            prefs = new CalendarPreferences({
                userId: req.params.userId,
                workingHours: {
                    monday: { start: "09:00", end: "18:00", enabled: true },
                    tuesday: { start: "09:00", end: "18:00", enabled: true },
                    wednesday: { start: "09:00", end: "18:00", enabled: true },
                    thursday: { start: "09:00", end: "18:00", enabled: true },
                    friday: { start: "09:00", end: "18:00", enabled: true },
                    saturday: { start: "09:00", end: "13:00", enabled: false },
                    sunday: { start: "09:00", end: "13:00", enabled: false }
                }
            });
            await prefs.save();
        }

        res.json(prefs);
    } catch (error) {
        res.status(500).json({ error: "Failed to get preferences" });
    }
});

// Update preferences
router.put("/preferences/:userId", async (req: Request, res: Response) => {
    try {
        const prefs = await CalendarPreferences.findOneAndUpdate(
            { userId: req.params.userId },
            { ...req.body, updatedAt: new Date() },
            { new: true, upsert: true }
        );
        res.json(prefs);
    } catch (error) {
        res.status(500).json({ error: "Failed to update preferences" });
    }
});

// ==========================================
// AVAILABILITY CHECKING
// ==========================================

// Get available slots for a user
router.get("/availability/:userId", async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { date, days = 7 } = req.query;

        const prefs = await CalendarPreferences.findOne({ userId });
        if (!prefs) {
            return res.status(404).json({ error: "Calendar preferences not found" });
        }

        const startDate = date ? new Date(date as string) : new Date();
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + Number(days));

        // Get existing interviews for this user
        const existingInterviews = await Interview.find({
            "interviewers.userId": userId,
            scheduledAt: { $gte: startDate, $lte: endDate },
            status: { $nin: ["cancelled"] }
        }).lean();

        // Generate available slots
        const slots: any[] = [];
        const currentDate = new Date(startDate);

        while (currentDate < endDate) {
            const dayName = currentDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() as keyof typeof prefs.workingHours;
            const dayPrefs = (prefs.workingHours as any)?.[dayName];

            if (dayPrefs?.enabled && dayPrefs.start && dayPrefs.end) {
                const [startHour, startMin] = dayPrefs.start.split(":").map(Number);
                const [endHour, endMin] = dayPrefs.end.split(":").map(Number);

                // Generate 1-hour slots
                for (let hour = startHour; hour < endHour; hour++) {
                    const slotStart = new Date(currentDate);
                    slotStart.setHours(hour, 0, 0, 0);

                    const slotEnd = new Date(slotStart);
                    slotEnd.setHours(hour + 1);

                    // Check if slot conflicts with existing interviews
                    const hasConflict = existingInterviews.some((interview: any) => {
                        const interviewStart = new Date(interview.scheduledAt);
                        const interviewEnd = new Date(interviewStart.getTime() + interview.duration * 60000);
                        return slotStart < interviewEnd && slotEnd > interviewStart;
                    });

                    // Check if slot is in blocked times
                    const isBlocked = prefs.blockedSlots?.some((blocked: any) => {
                        return slotStart < new Date(blocked.end) && slotEnd > new Date(blocked.start);
                    });

                    // Check minimum notice
                    const minNoticeMs = (prefs.minNotice || 24) * 60 * 60 * 1000;
                    const hasEnoughNotice = slotStart.getTime() - Date.now() >= minNoticeMs;

                    if (!hasConflict && !isBlocked && hasEnoughNotice) {
                        slots.push({
                            start: slotStart.toISOString(),
                            end: slotEnd.toISOString(),
                            available: true
                        });
                    }
                }
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        res.json({ userId, slots, timezone: prefs.timezone });
    } catch (error) {
        console.error("Availability check error:", error);
        res.status(500).json({ error: "Failed to check availability" });
    }
});

// Get team availability (multiple users)
router.post("/team-availability", async (req: Request, res: Response) => {
    try {
        const { userIds, date, duration = 60 } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: "userIds array is required" });
        }

        const startDate = date ? new Date(date) : new Date();
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);

        // Get all preferences and interviews
        const allPrefs = await CalendarPreferences.find({ userId: { $in: userIds } }).lean();
        const allInterviews = await Interview.find({
            "interviewers.userId": { $in: userIds },
            scheduledAt: { $gte: startDate, $lte: endDate },
            status: { $nin: ["cancelled"] }
        }).lean();

        // Find common available slots
        const commonSlots: any[] = [];
        const currentDate = new Date(startDate);

        while (currentDate < endDate) {
            // Check 9 AM to 6 PM
            for (let hour = 9; hour < 18; hour++) {
                const slotStart = new Date(currentDate);
                slotStart.setHours(hour, 0, 0, 0);

                const slotEnd = new Date(slotStart);
                slotEnd.setMinutes(slotStart.getMinutes() + duration);

                // Check if all users are available
                let allAvailable = true;
                const availableUsers: string[] = [];

                for (const userId of userIds) {
                    const prefs = allPrefs.find((p: any) => p.userId?.toString() === userId);
                    const dayName = currentDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
                    const dayPrefs = (prefs?.workingHours as any)?.[dayName];

                    if (!dayPrefs?.enabled) {
                        allAvailable = false;
                        break;
                    }

                    // Check for conflicts
                    const hasConflict = allInterviews.some((interview: any) => {
                        if (!interview.interviewers?.some((i: any) => i.userId?.toString() === userId)) return false;
                        const interviewStart = new Date(interview.scheduledAt);
                        const interviewEnd = new Date(interviewStart.getTime() + interview.duration * 60000);
                        return slotStart < interviewEnd && slotEnd > interviewStart;
                    });

                    if (hasConflict) {
                        allAvailable = false;
                        break;
                    }

                    availableUsers.push(userId);
                }

                if (allAvailable && slotStart.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
                    commonSlots.push({
                        start: slotStart.toISOString(),
                        end: slotEnd.toISOString(),
                        availableUsers
                    });
                }
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        res.json({ slots: commonSlots.slice(0, 50) });
    } catch (error) {
        console.error("Team availability error:", error);
        res.status(500).json({ error: "Failed to check team availability" });
    }
});

// ==========================================
// BLOCKED TIME MANAGEMENT
// ==========================================

// Add blocked time
router.post("/preferences/:userId/block", async (req: Request, res: Response) => {
    try {
        const { start, end, reason, recurring } = req.body;

        const prefs = await CalendarPreferences.findOneAndUpdate(
            { userId: req.params.userId },
            {
                $push: {
                    blockedSlots: { start, end, reason, recurring }
                },
                updatedAt: new Date()
            },
            { new: true }
        );

        res.json(prefs);
    } catch (error) {
        res.status(500).json({ error: "Failed to add blocked time" });
    }
});

// Remove blocked time
router.delete("/preferences/:userId/block/:index", async (req: Request, res: Response) => {
    try {
        const prefs = await CalendarPreferences.findOne({ userId: req.params.userId });
        if (!prefs) return res.status(404).json({ error: "Preferences not found" });

        const index = parseInt(req.params.index);
        if (prefs.blockedSlots && prefs.blockedSlots[index]) {
            prefs.blockedSlots.splice(index, 1);
            await prefs.save();
        }

        res.json(prefs);
    } catch (error) {
        res.status(500).json({ error: "Failed to remove blocked time" });
    }
});

// ==========================================
// SUGGESTED TIMES
// ==========================================

// Get AI-suggested optimal interview times
router.post("/suggest-times", async (req: Request, res: Response) => {
    try {
        const { interviewerIds, candidateTimezone, duration = 60, preferredTimeOfDay } = req.body;

        if (!interviewerIds || interviewerIds.length === 0) {
            return res.status(400).json({ error: "interviewerIds required" });
        }

        // Get team availability first
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 14);

        const allPrefs = await CalendarPreferences.find({ userId: { $in: interviewerIds } }).lean();
        const allInterviews = await Interview.find({
            "interviewers.userId": { $in: interviewerIds },
            scheduledAt: { $gte: startDate, $lte: endDate },
            status: { $nin: ["cancelled"] }
        }).lean();

        const suggestions: any[] = [];
        const currentDate = new Date(startDate);

        // Prefer slots based on time of day preference
        let preferredHours = [10, 11, 14, 15]; // Default morning and afternoon
        if (preferredTimeOfDay === "morning") preferredHours = [9, 10, 11];
        else if (preferredTimeOfDay === "afternoon") preferredHours = [14, 15, 16];
        else if (preferredTimeOfDay === "evening") preferredHours = [16, 17, 18];

        while (currentDate < endDate && suggestions.length < 5) {
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
                for (const hour of preferredHours) {
                    const slotStart = new Date(currentDate);
                    slotStart.setHours(hour, 0, 0, 0);

                    const slotEnd = new Date(slotStart);
                    slotEnd.setMinutes(slotStart.getMinutes() + duration);

                    // Check all interviewers are free
                    let allFree = true;
                    for (const userId of interviewerIds) {
                        const hasConflict = allInterviews.some((interview: any) => {
                            if (!interview.interviewers?.some((i: any) => i.userId?.toString() === userId)) return false;
                            const interviewStart = new Date(interview.scheduledAt);
                            const interviewEnd = new Date(interviewStart.getTime() + interview.duration * 60000);
                            return slotStart < interviewEnd && slotEnd > interviewStart;
                        });
                        if (hasConflict) {
                            allFree = false;
                            break;
                        }
                    }

                    if (allFree && slotStart.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
                        suggestions.push({
                            start: slotStart.toISOString(),
                            end: slotEnd.toISOString(),
                            score: 100 - suggestions.length * 10, // Decreasing score for variety
                            reason: `Available for all ${interviewerIds.length} interviewers`
                        });

                        if (suggestions.length >= 5) break;
                    }
                }
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        res.json({ suggestions });
    } catch (error) {
        console.error("Suggest times error:", error);
        res.status(500).json({ error: "Failed to suggest times" });
    }
});

export default router;
