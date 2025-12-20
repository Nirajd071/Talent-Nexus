/**
 * Proctoring Service - Integrity Score Calculation & Event Processing
 * Hackathon Implementation for GCC Hiring Platform
 */

import { db } from "../storage";
import { proctoringEvents, testSubmissions, assessmentSessions } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

// Event severity weights for integrity score calculation
const EVENT_WEIGHTS: Record<string, { base: number; max: number }> = {
    tab_switch: { base: -5, max: -20 },
    focus_loss: { base: -3, max: -15 },
    paste: { base: -10, max: -30 },
    copy: { base: -8, max: -24 },
    right_click: { base: -2, max: -10 },
    disconnect: { base: -5, max: -15 },
    face_missing: { base: -15, max: -30 },
    multiple_faces: { base: -25, max: -25 }, // Critical - instant flag
    dev_tools: { base: -20, max: -40 },
    blur: { base: -2, max: -10 },
};

// Severity multipliers
const SEVERITY_MULTIPLIERS: Record<string, number> = {
    low: 1,
    medium: 1.5,
    high: 2,
    critical: 3,
};

export interface ProctoringEvent {
    eventType: string;
    severity: "low" | "medium" | "high" | "critical";
    metadata?: Record<string, unknown>;
    questionIndex?: number;
    timeIntoPractice?: number;
}

export interface IntegrityReport {
    score: number;
    flagged: boolean;
    events: Array<{
        type: string;
        count: number;
        totalPenalty: number;
    }>;
    summary: string;
    recommendations: string[];
}

/**
 * Log a proctoring event for a submission
 */
export async function logProctoringEvent(
    submissionId: string,
    sessionId: string | null,
    userId: string | null,
    event: ProctoringEvent
) {
    const { eventType, severity, metadata, questionIndex, timeIntoPractice } = event;

    // Insert the event
    await db.insert(proctoringEvents).values({
        submissionId,
        sessionId,
        userId,
        eventType,
        severity,
        metadata,
        questionIndex,
        timeIntoPractice,
    });

    // Recalculate and update integrity score
    const newScore = await calculateIntegrityScore(submissionId);

    // Update submission with new score
    await db
        .update(testSubmissions)
        .set({
            integrityScore: newScore,
            status: newScore < 60 ? "flagged" : undefined,
        })
        .where(eq(testSubmissions.id, submissionId));

    return newScore;
}

/**
 * Calculate integrity score based on all events for a submission
 */
export async function calculateIntegrityScore(submissionId: string): Promise<number> {
    const events = await db
        .select()
        .from(proctoringEvents)
        .where(eq(proctoringEvents.submissionId, submissionId));

    let score = 100;
    const eventCounts: Record<string, number> = {};
    const eventPenalties: Record<string, number> = {};

    for (const event of events) {
        const eventType = event.eventType;
        const weight = EVENT_WEIGHTS[eventType] || { base: -1, max: -5 };
        const severityMult = SEVERITY_MULTIPLIERS[event.severity] || 1;

        // Track count per event type
        eventCounts[eventType] = (eventCounts[eventType] || 0) + 1;

        // Calculate penalty (capped at max)
        const penalty = weight.base * severityMult;
        const currentPenalty = eventPenalties[eventType] || 0;
        const newPenalty = Math.max(weight.max, currentPenalty + penalty);
        eventPenalties[eventType] = newPenalty;
    }

    // Sum all penalties
    for (const penalty of Object.values(eventPenalties)) {
        score += penalty;
    }

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Generate a comprehensive proctoring report
 */
export async function generateProctoringReport(submissionId: string): Promise<IntegrityReport> {
    const events = await db
        .select()
        .from(proctoringEvents)
        .where(eq(proctoringEvents.submissionId, submissionId));

    const score = await calculateIntegrityScore(submissionId);
    const eventSummary: Record<string, { count: number; totalPenalty: number }> = {};

    // Aggregate events
    for (const event of events) {
        const type = event.eventType;
        if (!eventSummary[type]) {
            eventSummary[type] = { count: 0, totalPenalty: 0 };
        }
        eventSummary[type].count++;

        const weight = EVENT_WEIGHTS[type] || { base: -1 };
        const severityMult = SEVERITY_MULTIPLIERS[event.severity] || 1;
        eventSummary[type].totalPenalty += Math.abs(weight.base * severityMult);
    }

    // Generate summary and recommendations
    const flagged = score < 60;
    let summary = "";
    const recommendations: string[] = [];

    if (score >= 90) {
        summary = "Assessment completed with high integrity. No significant concerns detected.";
    } else if (score >= 70) {
        summary = "Assessment completed with minor integrity events. Review may be warranted.";
        recommendations.push("Consider reviewing the flagged events before making a decision.");
    } else if (score >= 60) {
        summary = "Multiple integrity events detected. Manual review recommended.";
        recommendations.push("Review video recording if available.");
        recommendations.push("Consider scheduling a follow-up verification interview.");
    } else {
        summary = "Significant integrity concerns detected. Assessment may be compromised.";
        recommendations.push("Strongly recommend re-assessment with stricter proctoring.");
        recommendations.push("Review all flagged events in detail.");
        recommendations.push("Consider discussing concerns with the candidate.");
    }

    // Add specific recommendations based on events
    if (eventSummary["multiple_faces"]?.count > 0) {
        recommendations.push("CRITICAL: Multiple faces detected - possible unauthorized assistance.");
    }
    if (eventSummary["paste"]?.count > 2) {
        recommendations.push("Multiple paste events detected - check for copied answers.");
    }
    if ((eventSummary["tab_switch"]?.count || 0) > 5) {
        recommendations.push("Excessive tab switching - may indicate reference usage.");
    }

    return {
        score,
        flagged,
        events: Object.entries(eventSummary).map(([type, data]) => ({
            type,
            count: data.count,
            totalPenalty: data.totalPenalty,
        })),
        summary,
        recommendations,
    };
}

/**
 * Get events timeline for a submission
 */
export async function getEventsTimeline(submissionId: string) {
    return db
        .select()
        .from(proctoringEvents)
        .where(eq(proctoringEvents.submissionId, submissionId))
        .orderBy(proctoringEvents.timestamp);
}

/**
 * Check if submission should be auto-flagged
 */
export function shouldAutoFlag(score: number, events: Array<{ eventType: string }>): boolean {
    // Auto-flag if score is below threshold
    if (score < 60) return true;

    // Auto-flag critical events
    const criticalEvents = ["multiple_faces", "dev_tools"];
    return events.some((e) => criticalEvents.includes(e.eventType));
}
