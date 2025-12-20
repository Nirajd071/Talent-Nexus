/**
 * Audit Logging Middleware - Track all data access
 * Hackathon Implementation for GCC Hiring Platform
 */

import { Request, Response, NextFunction } from "express";
import { db } from "../storage";
import { auditLogs } from "../../shared/schema";

export interface AuditContext {
    userId?: string;
    userEmail?: string;
    resourceType: string;
    resourceId?: string;
    resourceName?: string;
}

// Actions to audit
const AUDITED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

// Paths to audit (with resource type mapping)
const AUDIT_PATH_MAPPING: Record<string, string> = {
    "/api/candidates": "candidate",
    "/api/resumes": "resume",
    "/api/interviews": "interview",
    "/api/offers": "offer",
    "/api/assessments": "assessment",
    "/api/jobs": "job",
    "/api/evaluations": "evaluation",
};

// Sensitive actions that require explicit audit
const SENSITIVE_ACTIONS = [
    "unlock_pii",
    "download",
    "export",
    "delete",
    "update_offer",
    "submit_evaluation",
];

/**
 * Extract resource info from request
 */
function extractResourceInfo(req: Request): { resourceType: string; resourceId?: string; action: string } {
    const path = req.path;
    const method = req.method;

    // Find matching resource type
    let resourceType = "unknown";
    for (const [prefix, type] of Object.entries(AUDIT_PATH_MAPPING)) {
        if (path.startsWith(prefix)) {
            resourceType = type;
            break;
        }
    }

    // Extract resource ID from path (e.g., /api/candidates/:id)
    const pathParts = path.split("/").filter(Boolean);
    const resourceId = pathParts.length >= 3 ? pathParts[2] : undefined;

    // Determine action
    let action = "view";
    switch (method) {
        case "GET":
            action = path.includes("download") ? "download" : path.includes("export") ? "export" : "view";
            break;
        case "POST":
            action = "create";
            break;
        case "PUT":
        case "PATCH":
            action = "update";
            break;
        case "DELETE":
            action = "delete";
            break;
    }

    // Check for special actions in query or body
    if (req.query.action === "unlock_pii" || req.body?.action === "unlock_pii") {
        action = "unlock_pii";
    }

    return { resourceType, resourceId, action };
}

/**
 * Get user info from request (assumes auth middleware has run)
 */
function getUserInfo(req: Request): { userId?: string; userEmail?: string } {
    // @ts-ignore - user added by auth middleware
    const user = req.user as { id?: string; email?: string } | undefined;
    return {
        userId: user?.id,
        userEmail: user?.email,
    };
}

/**
 * Express middleware to audit data access
 */
export function auditMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Skip non-audited methods
        if (!AUDITED_METHODS.includes(req.method)) {
            return next();
        }

        // Skip health checks and static files
        if (req.path === "/api/health" || req.path.startsWith("/static")) {
            return next();
        }

        const startTime = Date.now();
        const { resourceType, resourceId, action } = extractResourceInfo(req);
        const { userId, userEmail } = getUserInfo(req);

        // Store original end method
        const originalEnd = res.end;

        // Override end to log after response
        // @ts-ignore
        res.end = function (chunk?: unknown, encoding?: string) {
            // Log the audit event
            const success = res.statusCode < 400;

            db.insert(auditLogs)
                .values({
                    userId,
                    userEmail,
                    action,
                    resourceType,
                    resourceId,
                    metadata: {
                        method: req.method,
                        path: req.path,
                        statusCode: res.statusCode,
                        duration: Date.now() - startTime,
                        query: req.query,
                    },
                    ipAddress: req.ip || req.socket.remoteAddress,
                    userAgent: req.headers["user-agent"],
                    success,
                    errorMessage: success ? undefined : `HTTP ${res.statusCode}`,
                })
                .catch((err: Error) => console.error("Audit log error:", err));

            // Call original end
            // @ts-ignore
            return originalEnd.call(this, chunk, encoding);
        };

        next();
    };
}

/**
 * Log a specific action manually (for non-HTTP actions)
 */
export async function logAuditEvent(
    userId: string | undefined,
    userEmail: string | undefined,
    action: string,
    resourceType: string,
    resourceId?: string,
    metadata?: Record<string, unknown>,
    ipAddress?: string
) {
    await db.insert(auditLogs).values({
        userId,
        userEmail,
        action,
        resourceType,
        resourceId,
        metadata,
        ipAddress,
        success: true,
    });
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditLogs(resourceType: string, resourceId: string) {
    const { and, eq } = await import("drizzle-orm");

    return db
        .select()
        .from(auditLogs)
        .where(
            and(
                eq(auditLogs.resourceType, resourceType),
                eq(auditLogs.resourceId, resourceId)
            )
        )
        .orderBy(auditLogs.timestamp);
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(userId: string, limit = 100) {
    const { eq, desc } = await import("drizzle-orm");

    return db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .orderBy(desc(auditLogs.timestamp))
        .limit(limit);
}
